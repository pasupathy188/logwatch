const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000');

const normalLogs = [
  "User logged in", "User logged out", "Payment processed successfully",
  "New order placed", "Password reset requested", "File upload completed"
];
const errorLogs = [
  "Database connection failed", "CPU usage above 90%",
  "API rate limit exceeded", "Unauthorized access attempt"
];

let anomalyMode = false;

ws.on('open', () => {
  console.log('Connected to backend');
  setInterval(() => {
    anomalyMode = Math.random() < 0.2;
    const pool = anomalyMode ? errorLogs : normalLogs;
    const log = pool[Math.floor(Math.random() * pool.length)];
    const message = `${new Date().toISOString()} - ${log}`;
    ws.send(message);
    console.log('Sent:', message);
  }, 1000);
});

ws.on('error', err => console.error(err));