/*
Code for the fitbit companion app for the Assistive Doorbell.
Author: Pranove Basavarajappa
*/


import { peerSocket } from "messaging";
import { me as companion } from "companion";

// Set up a WebSocket connection using the correct URL
let socket;
let heartbeatInterval;

function connectWebSocket() {
  // Use your actual WebSocket URL here (ensure your backend supports WebSockets)
  socket = new WebSocket("wss://infinite-temple-27946-ed712ccc14aa.herokuapp.com/signal");

  // When the connection is open
  socket.onopen = () => {
    console.log("WebSocket connection opened");
    startHeartbeat();
  };

  // When receiving a message from the server
  socket.onmessage = (event) => {
    console.log("Message received from server:", event.data);

    let data;
    try {
      data = JSON.parse(event.data); // Parse the received data
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return;
    }

    // Prepare message object to send to device
    let message = {
      vibrate: data.triggerVibration, // Include vibration status
    };

    // Check if currentEvent exists before using it
    if (data.currentEvent) {
      message.eventType = data.currentEvent;   // Include the event type
      
      // If it's a correct input event, extract and include the passcode in the message
      if (data.currentEvent.startsWith("correct_input")) {
        const passcode = data.currentEvent.split("_")[2]; // Extract passcode from event type
        message.passcode = passcode;
      }
    } else if (data.passcode) {
      // If there's no currentEvent but there is a passcode, include it directly
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
    clearInterval(heartbeatInterval);
    setTimeout(connectWebSocket, 3000); // Attempt reconnection after 3 seconds
  };
}

// Start the heartbeat
function startHeartbeat() {
  clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "heartbeat" }));
      console.log("Heartbeat sent");
    }
  }, 30000); // Send heartbeat every 30 seconds
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