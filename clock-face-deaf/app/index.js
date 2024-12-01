/*
Watch-face code for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/

import clock from "clock";
import * as document from "document";
import { vibration } from "haptics";
import * as messaging from "messaging";
import { display } from "display";

// Get UI elements
const timeLabel = document.getElementById("timeLabel");
const background = document.getElementById("background");
const notificationText = document.getElementById("notificationText");
const batteryText = document.getElementById("batteryText");

let flashInterval;

// Keep display at maximum brightness
display.brightnessOverride = "max";

// Set clock to update every second
clock.granularity = "seconds";

// Keep display active
display.addEventListener("change", () => {
    // Ensure display is on and at full brightness when active
    display.on = true;
    display.brightnessOverride = "max";
  });
  
// Update time and keep display on
clock.addEventListener("tick", (evt) => {
let today = evt.date;
let hours = today.getHours();
let mins = today.getMinutes();

hours = hours % 12 || 12;
mins = mins < 10 ? `0${mins}` : mins;

timeLabel.text = `${hours}:${mins}`;

// Keep display on by poking more frequently
display.poke();
});


/* -------------------------------------- Notification Handling -------------------------------------- */

// Function to handle background flashing
function startFlashing(color) {
    let isVisible = true;
    clearInterval(flashInterval);
    
    flashInterval = setInterval(() => {
      // Wake display on each flash
      display.poke();
      background.style.fill = color;
      background.style.opacity = isVisible ? 1 : 0.3;
      isVisible = !isVisible;
    }, 500);
  }

function stopFlashing() {
  clearInterval(flashInterval);
  background.style.opacity = 1;
}

// Function to reset display after notification
function resetDisplay() {
  background.style.fill = "black";
  notificationText.style.display = "none";
  batteryText.style.display = "none";
  stopFlashing();
}

// Function to show notification
function showNotification(text, backgroundColor, duration, flash = false) {
    // Wake up the display
    display.poke();
    display.on = true;
    
    notificationText.text = text;
    notificationText.style.display = "inline";
    // notificationText.style.fontWeight = "bold";
    background.style.fill = backgroundColor;
    
    if (flash) {
      startFlashing(backgroundColor);
    }
    
    setTimeout(() => {
      resetDisplay();
      // Don't let display go to AOD immediately after notification
      display.poke();
    }, duration);
  }

// Function to show battery status
function showBatteryStatus(level) {
  batteryText.text = `Battery: ${level}%`;
  batteryText.style.display = "inline";
  batteryText.style.fontWeight = "bold";
  
  // Color coding based on battery level
  let backgroundColor = "#FF8C00"; // Orange for all battery alerts
  
  if (level <= 10) {
    backgroundColor = "#FF0000"; // Red for critical
  }
  
  background.style.fill = backgroundColor;
  startFlashing(backgroundColor);
  
  // Add timeout to reset the display after 10 seconds
  setTimeout(() => {
    resetDisplay();  // This will call stopFlashing()
  }, 10000);  // 10 seconds as per your requirement
}

/* -------------------------------------- Vibration Patterns -------------------------------------- */

// Doorbell - traditional ding dong pattern, runs for 6 seconds
function doorbellPattern() {
    let timer = 0;
    const maxDuration = 10000;
    
    const pattern = () => {
        // "Ding" - quick high intensity
        vibration.start("nudge-max");
        setTimeout(() => {
            vibration.stop();
            // Short pause
            setTimeout(() => {
                // "Dong" - longer, lower intensity
                vibration.start("confirmation");
                setTimeout(() => vibration.stop(), 400);
            }, 200);
        }, 200);
    };

    pattern();

    const intervalId = setInterval(() => {
        timer += 1500;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 1500);
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

function passcode221Pattern() {
    let timer = 0;
    const maxDuration = 15000;
    
    const pattern = () => {
        // Initial 3-second continuous vibration
        vibration.start("ring");
        setTimeout(() => {
            vibration.stop();
            
            // Start the actual pattern after a brief pause
            setTimeout(() => {
                // First "2": two quick pulses close together
                vibration.start("confirmation");
                setTimeout(() => {
                    vibration.stop();
                    setTimeout(() => {
                        vibration.start("confirmation");
                        setTimeout(() => vibration.stop(), 200);
                    }, 300);
                }, 200);

                // Second "2" after clear pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => {
                        vibration.stop();
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => vibration.stop(), 200);
                        }, 300);
                    }, 200);
                }, 1500);

                // Final "1" after another clear pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => vibration.stop(), 500);
                }, 3000);
            }, 500); // Small gap after initial alert
        }, 2000); // Duration of initial alert
    };

    pattern();

    const intervalId = setInterval(() => {
        timer += 7500;  // Increased to account for initial alert
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern(); // Will start with alert again
    }, 7500);
}

function passcode222Pattern() {
    let timer = 0;
    const maxDuration = 15000;
    
    const pattern = () => {
        // Initial 3-second continuous vibration
        vibration.start("ring");
        setTimeout(() => {
            vibration.stop();
            
            setTimeout(() => {
                // First "2": two quick pulses
                vibration.start("confirmation");
                setTimeout(() => {
                    vibration.stop();
                    setTimeout(() => {
                        vibration.start("confirmation");
                        setTimeout(() => vibration.stop(), 200);
                    }, 300);
                }, 200);

                // Second "2" after pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => {
                        vibration.stop();
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => vibration.stop(), 200);
                        }, 300);
                    }, 200);
                }, 1500);

                // Third "2" after pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => {
                        vibration.stop();
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => vibration.stop(), 200);
                        }, 300);
                    }, 200);
                }, 3000);
            }, 500);
        }, 2000);
    };

    pattern();

    const intervalId = setInterval(() => {
        timer += 7500;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 7500);
}

function passcode223Pattern() {
    let timer = 0;
    const maxDuration = 15000;
    
    const pattern = () => {
        // Initial 3-second continuous vibration
        vibration.start("ring");
        setTimeout(() => {
            vibration.stop();
            
            setTimeout(() => {
                // First "2": two quick pulses
                vibration.start("confirmation");
                setTimeout(() => {
                    vibration.stop();
                    setTimeout(() => {
                        vibration.start("confirmation");
                        setTimeout(() => vibration.stop(), 200);
                    }, 300);
                }, 200);

                // Second "2" after pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => {
                        vibration.stop();
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => vibration.stop(), 200);
                        }, 300);
                    }, 200);
                }, 1500);

                // "3": three quick pulses after pause
                setTimeout(() => {
                    vibration.start("confirmation");
                    setTimeout(() => {
                        vibration.stop();
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => {
                                vibration.stop();
                                setTimeout(() => {
                                    vibration.start("confirmation");
                                    setTimeout(() => vibration.stop(), 200);
                                }, 300);
                            }, 300);
                        }, 300);
                    }, 200);
                }, 3000);
            }, 500);
        }, 2000);
    };

    pattern();

    const intervalId = setInterval(() => {
        timer += 7500;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, 7500);
}

// Battery alert vibration patterns, all run for 10 seconds
// For battery alerts, example with 20%:
function batteryAlert20() {
    let timer = 0;
    const maxDuration = 10000;

    const pattern = () => {
        // Two gentle reminders spaced apart
        vibration.start("ping");
        setTimeout(() => {
            vibration.stop();
            setTimeout(() => {
                vibration.start("ping");
                setTimeout(() => vibration.stop(), 300);
            }, 800); // Longer pause between pulses = less urgent
        }, 300);
    };

    pattern();

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

// Battery 15%: Middle urgency pattern
function batteryAlert15() {
    let timer = 0;
    const maxDuration = 10000;

    const pattern = () => {
        // First pulse: medium intensity
        vibration.start("confirmation");
        setTimeout(() => {
            vibration.stop();
            // Short pause
            setTimeout(() => {
                // Second pulse: stronger
                vibration.start("nudge");
                setTimeout(() => {
                    vibration.stop();
                    // Another short pause
                    setTimeout(() => {
                        // Final pulse: strongest
                        vibration.start("nudge-max");
                        setTimeout(() => vibration.stop(), 300);
                    }, 300);
                }, 300);
            }, 300);
        }, 300);
    };

    pattern();

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
  
// Battery 10%: Urgent pattern
function batteryAlert10() {
let timer = 0;
const maxDuration = 10000;

const pattern = () => {
    // Urgent pattern: quick pulses getting stronger
    for(let i = 0; i < 3; i++) {
        setTimeout(() => {
            vibration.start(i === 2 ? "nudge-max" : i === 1 ? "confirmation" : "ping");
            setTimeout(() => vibration.stop(), 200);
        }, i * 250); // Shorter gaps = more urgent
    }
};

// Start immediately
pattern();

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

/* -------------------------------------- Messaging -------------------------------------- */

function triggerNotification(eventType) {
  console.log(`Notification triggered for event: ${eventType}`);

  if(eventType.indexOf("low_battery_") === 0) {
      const batteryLevel = parseInt(eventType.split("_")[2]);
      showBatteryStatus(batteryLevel);
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
      }
  }
  else if(eventType.indexOf("correct_input") === 0) {
      const passcode = eventType.split("_")[2];
      showNotification(`Access for: ${passcode}`, "#00FF00", 15000, true); // Green background
      switch (passcode) {
          case "221":
              passcode221Pattern();
              break;
          case "222":
              passcode222Pattern();
              break;
          case "223":
              passcode223Pattern();
              break;
      }
  }
  else {
      switch (eventType) {
          case "main_button_pressed":
              showNotification("Doorbell!", "#4169E1", 6000); // Royal Blue
              doorbellPattern();
              break;
          case "SOS_event":
              notificationText.style.fontSize = 60;  // Bigger font for SOS
              showNotification("SOS!", "#FF0000", 15000, true); // Red with flashing
              sosPattern();
              break;
          case "incorrect_input":
              showNotification("Invalid Code", "#FF4500", 3000); // OrangeRed
              break;
      }
  }
}

// Listen for messages from companion app
messaging.peerSocket.onmessage = (evt) => {
if (evt.data && evt.data.eventType) {
  triggerNotification(evt.data.eventType);
}
};

// Handle connection errors
messaging.peerSocket.onerror = (err) => {
console.error("Connection error: " + err.code + " - " + err.message);
};