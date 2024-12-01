/*
Code for the fitbit companion app for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/

import { peerSocket } from "messaging";
import { me as companion } from "companion";

// Set up a WebSocket connection using the correct URL
let socket;

function connectWebSocket() {
  socket = new WebSocket("wss://infinite-temple-27946-ed712ccc14aa.herokuapp.com/signal");

  // When the connection is open
  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  // Handle ping from server
  socket.onping = () => {
    console.log('Received ping from server');
    socket.pong();
    console.log('Sent pong to server');
  };

  // When receiving a message from the server
  socket.onmessage = (event) => {
    console.log("Message received from server:", event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return;
    }

    // Prepare message object to send to device
    let message = {
      vibrate: data.triggerVibration,
      eventType: data.currentEvent
    };

    // Add batteryLevel for battery events
    if (data.currentEvent && data.currentEvent.indexOf("low_battery_") === 0) {
      const batteryLevel = data.currentEvent.split("_")[2];
      message.batteryLevel = parseInt(batteryLevel);
    }
    
    // If it's a correct input event, extract and include the passcode
    if (data.currentEvent && data.currentEvent.indexOf("correct_input") === 0) {
      const passcode = data.currentEvent.split("_")[2];
      message.passcode = passcode;
    } else if (data.passcode) {
      message.passcode = data.passcode;
    }

    // Send the message to the device
    sendToDevice(message);
  };

  // Handle errors
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  // Handle connection closure and attempt reconnection
  socket.onclose = () => {
    console.log("WebSocket connection closed. Reconnecting...");
    setTimeout(connectWebSocket, 3000);
  };
}

// Send message to Fitbit device
function sendToDevice(message) {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(message);
    console.log("Message sent:", JSON.stringify(message));
  } else {
    console.error("Peer socket is not open");
  }
}

// Start WebSocket connection when companion starts
connectWebSocket();

// Handle connection opening with Fitbit device
peerSocket.onopen = () => {
  console.log("Companion socket open");
};

// Handle connection errors with Fitbit device
peerSocket.onerror = (err) => {
  console.error("Connection error: " + err.code + " - " + err.message);
};