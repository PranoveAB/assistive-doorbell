/*
Watch-face code for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/

import clock from "clock";
import * as document from "document";
import { vibration } from "haptics";
import * as messaging from "messaging";
import { display } from "display";

// Get reference to the time label in your SVG
const timeLabel = document.getElementById("timeLabel");

// Set clock granularity (update every second or minute)
clock.granularity = "seconds"; // Can be "minutes" for less frequent updates

// Update the time on screen every tick
clock.addEventListener("tick", (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  let mins = today.getMinutes();
  
  // Format time as HH:MM
  hours = hours % 12 || 12; // Convert to 12-hour format
  mins = mins < 10 ? `0${mins}` : mins; // Add leading zero to minutes if needed
  
  timeLabel.text = `${hours}:${mins}`;
});

// Keep display at maximum brightness
display.brightnessOverride = "max";

// Doorbell - Three strong, clear nudges, stops after 6 seconds
function doorbellPattern() {
    let timer = 0;
    const maxDuration = 6000; // 6 seconds
    
    const pattern = () => {
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("nudge-max");
                setTimeout(() => vibration.stop(), 300);
            }, i * 500);
        }
    };

    const intervalId = setInterval(() => {
        timer += 2000; // Pattern duration ~2 seconds
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 2000);
}

// SOS - Distinct pattern based on actual SOS (... --- ...), stops after 15 seconds
function sosPattern() {
    let timer = 0;
    const maxDuration = 15000; // 15 seconds
    const patternDuration = 5000; // Each complete pattern takes ~5 seconds

    const pattern = () => {
        // Three quick pulses (S)
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 200);
            }, i * 300);
        }
        // Three longer pulses (O)
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 500);
            }, 1500 + (i * 600));
        }
        // Three quick pulses (S)
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 200);
            }, 3500 + (i * 300));
        }
    };

    // Execute pattern immediately
    pattern();

    // Then set up the interval for repeating
    const intervalId = setInterval(() => {
        timer += patternDuration;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, patternDuration);
}

// Passcode 223 - Short-Long-Short pattern, runs for 6 seconds
function passcode223Pattern() {
    let timer = 0;
    const maxDuration = 6000;

    const pattern = () => {
        vibration.start("nudge");
        setTimeout(() => {
            vibration.stop();
            setTimeout(() => {
                vibration.start("nudge-max");
                setTimeout(() => {
                    vibration.stop();
                    setTimeout(() => {
                        vibration.start("nudge");
                        setTimeout(() => vibration.stop(), 200);
                    }, 300);
                }, 800);
            }, 300);
        }, 200);
    };

    const intervalId = setInterval(() => {
        timer += 2000;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 2000);
}

// Battery alert vibration patterns, all run for 10 seconds
function batteryAlert20() {
    let timer = 0;
    const maxDuration = 10000;

    const pattern = () => {
        vibration.start("ping");
        setTimeout(() => {
            vibration.stop();
            setTimeout(() => {
                vibration.start("ping");
                setTimeout(() => vibration.stop(), 500);
            }, 500);
        }, 500);
    };

    const intervalId = setInterval(() => {
        timer += 2000;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 2000);
}

function batteryAlert15() {
    let timer = 0;
    const maxDuration = 10000;

    const pattern = () => {
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("confirmation");
                setTimeout(() => vibration.stop(), 300);
            }, i * 400);
        }
    };

    const intervalId = setInterval(() => {
        timer += 2000;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 2000);
}

function batteryAlert10() {
    let timer = 0;
    const maxDuration = 10000;

    const pattern = () => {
        for(let i = 0; i < 5; i++) {
            setTimeout(() => {
                vibration.start("nudge-max");
                setTimeout(() => vibration.stop(), 200);
            }, i * 300);
        }
    };

    const intervalId = setInterval(() => {
        timer += 2000;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 2000);
}

function triggerVibration(eventType) {
    console.log(`Vibration triggered for event: ${eventType}`);

    if(eventType.indexOf("low_battery_") === 0) {
        const batteryLevel = parseInt(eventType.split("_")[2]);
        switch(batteryLevel) {
            case 20:
                batteryAlert20();
                break;
            case 15:
                batteryAlert15();
                break;
            case 10:
                batteryAlert10();
                break;
            default:
                console.log("Unknown battery level");
        }
    }
    else if(eventType.indexOf("correct_input") === 0) {
        switch (eventType.split("_")[2]) {
            case "221":
                passcode221Pattern();
                break;
            case "222":
                passcode222Pattern();
                break;
            case "223":
                passcode223Pattern();
                break;
            default:
                console.log("Incorrect passcode entered.");
        }
    }
    else {
        switch (eventType) {
            case "main_button_pressed":
                doorbellPattern();
                break;
            case "SOS_event":
                sosPattern();
                break;
            default:
                console.log("Unknown event type or no vibration required.");
                break;
        }
    }
}

// Listen for messages from companion app
messaging.peerSocket.onmessage = (evt) => {
  if (evt.data && evt.data.eventType) {
    const { eventType } = evt.data;

    // Do not vibrate for incorrect input, only handle other events
    if (eventType !== "incorrect_input") {
      triggerVibration(eventType);
    } else {
      console.log("No vibration triggered for incorrect input.");
    }
  }
};

// Handle connection errors
messaging.peerSocket.onerror = (err) => {
  console.error("Connection error: " + err.code + " - " + err.message);
};