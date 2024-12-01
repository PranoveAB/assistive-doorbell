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

// Add WebSocket connection handling with ping/pong
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Send ping every 30 seconds
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 60000);

    ws.on('pong', () => {
        console.log('Received pong from client');
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(interval);
    });
});

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
        const batteryRegex = /^low_battery_(\d+)$/;
        const batteryMatch = eventType.match(batteryRegex);

        if (batteryMatch) {
            shouldVibrate = true;
            currentEvent = eventType;  // This will set currentEvent to "low_battery_XX"
            
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
                broadcast({ triggerVibration: false, currentEvent: 'no_event' });
            }, 10000);

            broadcast({ triggerVibration: true, currentEvent });
            return res.status(200).json({ success: true });
        }

        const correctInputRegex = /^correct_input_(\d+)$/;
        const match = eventType.match(correctInputRegex);

        if (eventType === 'main_button_pressed') {
            shouldVibrate = true;
            currentEvent = 'main_button_pressed';
            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
                broadcast({ triggerVibration: false, currentEvent: 'no_event' });
            }, 5000);
            broadcast({ triggerVibration: shouldVibrate, currentEvent });
            return res.status(200).json({ triggerVibration: shouldVibrate });
        } else if (match) {
            const passcodeNumber = match[1];
            console.log(`Correct input received with passcode: ${passcodeNumber}`);

            shouldVibrate = true;
            currentEvent = `correct_input_${passcodeNumber}`;

            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
                broadcast({ triggerVibration: false, currentEvent: 'no_event' });
            }, 5000);

            broadcast({ triggerVibration: shouldVibrate, currentEvent, passcode: passcodeNumber });
            return res.status(200).json({ triggerVibration: shouldVibrate, passcode: passcodeNumber });
        } else if (eventType === 'incorrect_input') {
            shouldVibrate = false;
            currentEvent = 'incorrect_input';

            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                currentEvent = 'no_event';
                broadcast({ triggerVibration: false, currentEvent: 'no_event' });
            }, 5000);

            return res.status(200).json({ triggerVibration: shouldVibrate });
        } else if (eventType === 'SOS_event') {
            shouldVibrate = true;
            currentEvent = 'SOS_event';

            if (vibrationTimeout) clearTimeout(vibrationTimeout);
            vibrationTimeout = setTimeout(() => {
                shouldVibrate = false;
                currentEvent = 'no_event';
                broadcast({ triggerVibration: false, currentEvent: 'no_event' });
                console.log("Vibration reset to false after timeout.");
            }, 15000);

            broadcast({ triggerVibration: shouldVibrate, currentEvent, status: "SOS" });
            return res.status(200).json({ triggerVibration: shouldVibrate, currentEvent, status: "SOS" });
        }

        shouldVibrate = false;
        currentEvent = 'no_event';
        return res.status(200).json({ triggerVibration: shouldVibrate });
    } catch (error) {
        console.error("Error handling POST request:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// GET endpoint with error handling
app.get('/signal', (req, res) => {
    try {
        return res.status(200).json({ 
            triggerVibration: shouldVibrate, 
            currentEvent
        });
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