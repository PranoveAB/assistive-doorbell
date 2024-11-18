/*
Web API code on heroku. 

Author: Pranove Basavarajappa

This code is responsible for receiving signals from the ESP32 doorbell and 
broadcasting the current vibration status and event type 
to all connected clients via WebSocket.
*/

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const WebSocket = require('ws');

// Middleware to parse incoming JSON data
app.use(express.json());

// Variables to track vibration status and current event
let shouldVibrate = false;
let currentEvent = 'no_event'; // Variable to store the current event type
let vibrationTimeout; // Variable to store timeout reference

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Function to broadcast messages to all connected clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// POST endpoint that handles signals from the ESP32 doorbell with error handling
app.post('/signal', (req, res) => {
    try {
        console.log("Received data:", req.body);

        const eventType = req.body.event;
        const correctInputRegex = /^correct_input_(\d+)$/;
        const match = eventType.match(correctInputRegex);

        if (eventType === 'main_button_pressed') {
            shouldVibrate = true;
            currentEvent = 'main_button_pressed';

            // Reset any existing timeout and set a new one for 5 seconds
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
            }, 5000);

            // Broadcast the update via WebSocket
            broadcast({ triggerVibration: shouldVibrate, currentEvent });

            return res.status(200).json({ triggerVibration: shouldVibrate });
        } else if (match) {
            const passcodeNumber = match[1];
            console.log(`Correct input received with passcode: ${passcodeNumber}`);

            shouldVibrate = true;
            currentEvent = `correct_input_${passcodeNumber}`;

            // Reset any existing timeout and set a new one for 5 seconds
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
            }, 5000);

            // Broadcast the update via WebSocket
            broadcast({ triggerVibration: shouldVibrate, currentEvent, passcode: passcodeNumber });

            return res.status(200).json({ triggerVibration: shouldVibrate, passcode: passcodeNumber });
        } else if (eventType === 'incorrect_input') {
            shouldVibrate = false;
            currentEvent = 'incorrect_input';

            // Reset any existing timeout and set a new one for 5 seconds
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                currentEvent = 'no_event';
            }, 5000);

            return res.status(200).json({ triggerVibration: shouldVibrate });
        } else if (eventType === 'SOS_event') {
            shouldVibrate = true;
            currentEvent = 'SOS_event';

            // Reset any existing timeout and set a new one for 15 seconds
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
                console.log("Vibration reset to false after timeout.");
            }, 15000);

            // Broadcast the update via WebSocket
            broadcast({ triggerVibration: shouldVibrate, currentEvent, status: "SOS" });

            return res.status(200).json({ triggerVibration: shouldVibrate, currentEvent, status: "SOS" });
        } else {
            shouldVibrate = false;
            currentEvent = 'no_event';

            return res.status(200).json({ triggerVibration: shouldVibrate });
        }
    } catch (error) {
        console.error("Error handling POST request:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// GET endpoint with error handling
app.get('/signal', (req, res) => {
    try {
        return res.status(200).json({ triggerVibration: shouldVibrate, currentEvent });
    } catch (error) {
        console.error("Error handling GET request:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(PORT, () => {
    console.log(`API is running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});