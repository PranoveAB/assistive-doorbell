
/*
Watch-face code for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/


import clock from "clock";
import * as document from "document";
import { vibration } from "haptics";
import * as messaging from "messaging";

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


function vibration1() {
  for(let i=0;i<10;i++) {
    setTimeout(() => vibration.start("nudge-max"), 150*i)
 }
}

function vibration10() {
  const milliseconds = 1;
  const vibe_delay = 5 * milliseconds
  const seconds = 1000 * milliseconds;
  const minutes = seconds * 60;
  const hours = minutes * 60;
  const days = hours * 24;
  let vibe_repeat = 15;
  for(let i=0; i<vibe_repeat; i++) {
      setTimeout(() => vibration.start("ping"), 60*vibe_delay*i);
  }
}

// function vibrationPattern2() {
//   vibration.start("nudge-max");
//   setTimeout(() => vibration.stop(), 1000); // Vibrate for 1 second
//   setTimeout(() => {
//     vibration.start("nudge-max");
//     setTimeout(() => vibration.stop(), 1000); // Vibrate again after a pause
//   }, 1500); // Pause for 1.5 seconds before repeating
// }

// function vibrationPattern5() {

//   const milliseconds = 1;
//   const vibe_delay = 1 * milliseconds
//   const seconds = 1000 * milliseconds;
//   const minutes = seconds * 60;
//   const hours = minutes * 60;
//   const days = hours * 24;
  
//   let vibe_repeat = 6; let vibe_length=5.0*seconds; let vibe_pause=0.1*seconds;
//   for(let i=0; i<vibe_repeat; i++) {
//     setTimeout(() => vibration.start("nudge-max",7), vibe_length*i + vibe_pause*i);
//     setTimeout(() => vibration.stop(), vibe_length*(i + 1) + vibe_pause*i);
//   }
// }


function vibrationPattern1() {
  for (let i = 0; i < 20; i++) {
    setTimeout(() => vibration.start("bump"), 200 * i); // Vibrate every 200ms
  }
  setTimeout(() => vibration.stop(), 6000); // Stop after 600ms
}

function vibrationPattern2() {
  vibration.start("confirmation");
  setTimeout(() => {
    vibration.stop();
    setTimeout(() => {
      vibration.start("confirmation");
      setTimeout(() => vibration.stop(), 225);
    }, 300); // Pause for 300ms before repeating
  }, 225);
}

function vibrationPattern3() {
  vibration.start("nudge-max");
  setTimeout(() => vibration.stop(), 2000); // Vibrate for exactly 375ms
}

function vibrationPattern4() {
  vibration.start("ping");
  setTimeout(() => {
    vibration.stop();
    setTimeout(() => {
      vibration.start("nudge");
      setTimeout(() => vibration.stop(), 1000);
    }, 10); // Pause for 200ms before starting nudge
  }, 2000); // Ping lasts for 375ms
}

function vibrationPattern5() {
  vibration.start("alert"); // Continuous alert
  setTimeout(() => vibration.stop(), 15000); // Vibrate continuously for five seconds
}

function triggerVibration(eventType) {

  console.log(`Vibration triggered for event: ${eventType}`);

  if(eventType.indexOf("correct_input") === 0) {
    switch (eventType.split("_")[2]) {
      case "221":
        vibrationPattern1();
        break;

      case "222":
        vibrationPattern4();
        break;

      case "223":
        vibrationPattern3();
        break;
      default:
        console.log("Incorrect passcode entered.");
  }
}

  else {
    switch (eventType) {
      case "main_button_pressed":
        vibration1();
        break;

      case "SOS_event":
        // Continuous alert for SOS event
        vibrationPattern5();
        // setTimeout(() => vibration.stop(), 10); // Vibrate for three seconds
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