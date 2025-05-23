/*
Code for the fitbit companion app for the Assistive Doorbell.
Author: Pranove Basavarajappa
Simplified for single-client message queue system
*/

import { peerSocket } from "messaging";
import { me as companion } from "companion";

// Set up a WebSocket connection using the correct URL
let socket;
let reconnectTimer;

function connectWebSocket() {
  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  socket = new WebSocket("ws://10.0.0.41:3000/signal");

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
    
    // Handle correct input events with both passcode and visitor name from server
    if (data.currentEvent && data.currentEvent.indexOf("correct_input") === 0) {
      // Extract passcode from event type
      const passcode = data.currentEvent.split("_")[2];
      message.passcode = passcode;
      
      // Use visitor name from server (prioritize server-provided name)
      if (data.visitorName) {
        message.visitorName = data.visitorName;
        console.log(`Server provided visitor name: ${data.visitorName} for passcode: ${passcode}`);
      } else {
        // Fallback to "Unknown" if server doesn't provide name
        message.visitorName = "Unknown";
        console.log(`No visitor name from server for passcode: ${passcode}, using Unknown`);
      }
    } 
    // Handle other events that might have passcode/visitor info
    else if (data.passcode) {
      message.passcode = data.passcode;
      
      // Use visitor name from server if provided
      if (data.visitorName) {
        message.visitorName = data.visitorName;
        console.log(`Server provided visitor name: ${data.visitorName} for passcode: ${data.passcode}`);
      } else {
        message.visitorName = "Unknown";
      }
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
    console.log("WebSocket connection closed. Reconnecting in 3 seconds...");
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };
}

// Send message to Fitbit device
function sendToDevice(message) {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(message);
    console.log("Message sent to watch:", JSON.stringify(message));
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

// Handle Fitbit app lifecycle events
companion.addEventListener("unload", () => {
  // Clean up if the companion is unloaded
  if (socket) {
    socket.close();
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
});