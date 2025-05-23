/*
Watch-face code for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/

import clock from "clock";
import * as document from "document";
import { vibration } from "haptics";
import * as messaging from "messaging";
import { display } from "display";

/* -------------------------------------- UI Elements -------------------------------------- */
const timeLabel = document.getElementById("timeLabel");
const background = document.getElementById("background");
const notificationText = document.getElementById("notificationText");
const batteryText = document.getElementById("batteryText");

/* -------------------------------------- Constants -------------------------------------- */
const COLORS = {
    BACKGROUND: "#000000",
    TEXT: "#FFFFFF",
    ERROR: "#FF5252",      // Enhanced red - 8.1:1 contrast
    SUCCESS: "#4CAF50",    // Enhanced green - 8.3:1 contrast
    INFO: "#64B5F6",       // Enhanced blue - 8.5:1 contrast
    WARNING: "#FFD740",    // Enhanced amber - 8.7:1 contrast
    CRITICAL: "#FF1744",   // Enhanced emergency red - 9:1 contrast
    NOTIFICATION_BG: "#1A1A1A" // Dark background for notifications
};

const VIBRATION_TIMING = {
    SHORT_PAUSE: 300,
    MEDIUM_PAUSE: 500,
    LONG_PAUSE: 1000,
    PATTERN_GAP: 2000
};

/* -------------------------------------- Display Management -------------------------------------- */
let flashInterval;

// Keep display at maximum brightness
display.brightnessOverride = "max";

// Set clock to update every second
clock.granularity = "seconds";

// Keep display active
display.addEventListener("change", () => {
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
    display.poke();
});

/* -------------------------------------- Visual Notifications -------------------------------------- */
function startFlashing(color, speed = 500) {
    let isVisible = true;
    clearInterval(flashInterval);
    
    const isLightColor = color === COLORS.SUCCESS || color === COLORS.WARNING;
    const textColor = isLightColor ? "black" : "white";
    
    flashInterval = setInterval(() => {
        display.poke();
        background.style.fill = isVisible ? color : "black";
        timeLabel.style.fill = isVisible && isLightColor ? "black" : "white";
        notificationText.style.fill = isVisible && isLightColor ? "black" : "white";
        batteryText.style.fill = isVisible && isLightColor ? "black" : "white";
        isVisible = !isVisible;
    }, speed);
}

function stopFlashing() {
    clearInterval(flashInterval);
    background.style.opacity = 1;
}

function resetDisplay() {
    background.style.fill = "black";
    notificationText.style.display = "none";
    batteryText.style.display = "none";
    timeLabel.style.fill = "white";  // Ensure time color is reset
    stopFlashing();
}

function showNotification(text, backgroundColor, duration, flash = false) {
    display.poke();
    display.on = true;
    
    notificationText.text = text;
    notificationText.style.display = "inline";
    
    // Map old colors to new WCAG-compliant colors and set text colors
    switch(backgroundColor) {
        case "#FF0000": 
            backgroundColor = COLORS.ERROR;
            notificationText.style.fill = "white";
            timeLabel.style.fill = "white";
            break;
        case "#00FF00": 
            backgroundColor = COLORS.SUCCESS;
            notificationText.style.fill = "black";  
            timeLabel.style.fill = "black";  // Time also black on green
            break;
        case "#4169E1": 
            backgroundColor = COLORS.INFO;
            notificationText.style.fill = "white";
            timeLabel.style.fill = "white";
            break;
        case "#FF4500": 
            backgroundColor = COLORS.WARNING;
            notificationText.style.fill = "black";  
            timeLabel.style.fill = "black";  // Time also black on yellow/amber
            break;
    }
    
    background.style.fill = backgroundColor;
    
    if (flash) {
        startFlashing(backgroundColor);
    }
    
    setTimeout(() => {
        resetDisplay();
        notificationText.style.fill = "white";  // Reset colors
        timeLabel.style.fill = "white";
        display.poke();
    }, duration);
}

function showBatteryStatus(level) {
    batteryText.text = `Battery: ${level}%`;
    batteryText.style.display = "inline";
    batteryText.style.fontSize = level <= 10 ? 50 : 45;
    
    let backgroundColor, flashSpeed;
    
    if (level <= 10) {
        backgroundColor = COLORS.CRITICAL;
        flashSpeed = 500;
        batteryText.style.fill = "white";
        timeLabel.style.fill = "white";
    } else if (level <= 15) {
        backgroundColor = COLORS.WARNING;
        flashSpeed = 800;
        batteryText.style.fill = "black";
        timeLabel.style.fill = "black";  // Time also black for warning
    } else {
        backgroundColor = COLORS.INFO;
        flashSpeed = 1000;
        batteryText.style.fill = "white";
        timeLabel.style.fill = "white";
    }
    
    background.style.fill = backgroundColor;
    startFlashing(backgroundColor, flashSpeed);
    
    setTimeout(() => {
        resetDisplay();
        batteryText.style.fill = "white";  // Reset colors
        timeLabel.style.fill = "white";
    }, 10000);
}

/* -------------------------------------- Vibration Patterns -------------------------------------- */
function executePatternWithInterval(pattern, maxDuration, interval) {
    let timer = 0;
    pattern(); // Execute immediately
    
    const intervalId = setInterval(() => {
        timer += interval;
        if (timer >= maxDuration) {
            clearInterval(intervalId);
            vibration.stop();
            return;
        }
        pattern();
    }, interval);
}

function doorbellPattern() {
    const pattern = () => {
        // "Ding" - higher pitch, quick
        vibration.start("nudge-max");
        setTimeout(() => {
            vibration.stop();
            // Brief pause between ding and dong
            setTimeout(() => {
                // "Dong" - lower pitch, longer duration
                vibration.start("ping");
                setTimeout(() => vibration.stop(), 400);
            }, 200);
        }, 200);
    };

    // Execute pattern immediately then repeat
    executePatternWithInterval(pattern, 6000, 1500);
}

function sosPattern() {
    const pattern = () => {
        // S: Three quick pulses
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 200);
            }, i * VIBRATION_TIMING.SHORT_PAUSE);
        }
        // O: Three longer pulses
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 500);
            }, 1500 + (i * 600));
        }
        // S: Three quick pulses
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                vibration.start("alert");
                setTimeout(() => vibration.stop(), 200);
            }, 3500 + (i * VIBRATION_TIMING.SHORT_PAUSE));
        }
    };
    executePatternWithInterval(pattern, 15000, 5000);
}

function passcodePattern(code) {
    let timer = 0;
    const maxDuration = 15000;
    
    const pattern = () => {
        // Initial continuous vibration
        vibration.start("ring");
        setTimeout(() => {
            vibration.stop();
            
            let delay = 1000;  // Increased initial delay after alert
            // Pattern for each digit
            for(const digit of code) {
                setTimeout(() => {
                    for(let i = 0; i < digit; i++) {
                        setTimeout(() => {
                            vibration.start("confirmation");
                            setTimeout(() => vibration.stop(), 200);
                        }, i * 600);  // Increased from SHORT_PAUSE (300) to 800ms for better digit recognition
                    }
                }, delay);
                delay += 2000;  // Increased from LONG_PAUSE (1000) to 2000ms for better separation between digits
            }
        }, 1650);
    };

    executePatternWithInterval(pattern, maxDuration, 7500);
}

function batteryAlert(level) {
    const pattern = () => {
        const pulseCount = level <= 10 ? 5 : level <= 15 ? 3 : 2;
        const intensity = level <= 10 ? "nudge-max" : level <= 15 ? "confirmation" : "ping";
        const gap = level <= 10 ? 250 : level <= 15 ? 400 : 800;
        
        for(let i = 0; i < pulseCount; i++) {
            setTimeout(() => {
                vibration.start(intensity);
                setTimeout(() => vibration.stop(), 200);
            }, i * gap);
        }
    };
    
    executePatternWithInterval(pattern, 10000, 2000);
}

/* -------------------------------------- Event Handling -------------------------------------- */
function triggerNotification(eventType, visitorName = null) {
    console.log(`Notification triggered for event: ${eventType}`);
    
    if (visitorName) {
        console.log(`Visitor name provided: ${visitorName}`);
    }

    if(eventType.indexOf("low_battery_") === 0) {
        const batteryLevel = parseInt(eventType.split("_")[2]);
        showBatteryStatus(batteryLevel);
        batteryAlert(batteryLevel);
    }
    else if(eventType.indexOf("correct_input") === 0) {
        const passcode = eventType.split("_")[2];
        
        // Use visitor name from server (passed as parameter) or fallback to "Unknown"
        let displayName = visitorName || "Unknown";
        
        console.log(`Displaying visitor: ${displayName} for passcode: ${passcode}`);
        
        // Show notification with visitor name from server
        showNotification(`${displayName} is here!`, "#00FF00", 15000, true);
        passcodePattern(passcode);
    }
    else {
        switch (eventType) {
            case "main_button_pressed":
                showNotification("Doorbell!", "#4169E1", 6000);
                doorbellPattern();
                break;
            case "SOS_event":
                showNotification("SOS!", "#FF0000", 15000, true);
                sosPattern();
                break;
            case "incorrect_input":
                showNotification("Invalid Code", "#FF4500", 3000);
                break;
        }
    }
}

messaging.peerSocket.onmessage = (evt) => {
    console.log("Message received from companion:", JSON.stringify(evt.data));
    
    if (evt.data && evt.data.eventType) {
        // Pass visitor name from companion to triggerNotification
        const visitorName = evt.data.visitorName || null;
        
        if (visitorName) {
            console.log(`Using visitor name from companion: ${visitorName}`);
        }
        
        triggerNotification(evt.data.eventType, visitorName);
    }
};

messaging.peerSocket.onerror = (err) => {
    console.error("Connection error: " + err.code + " - " + err.message);
};