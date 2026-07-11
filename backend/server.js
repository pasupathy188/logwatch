const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'logwatch',
  password: process.env.DB_PASSWORD || 'logwatch123',
  database: process.env.DB_NAME || 'logwatch',
});

// Create table
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        message TEXT NOT NULL,
        is_anomaly BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Database ready');
  } catch (err) {
    console.error('DB setup error:', err.message);
  }
})();

app.use(express.static('/app/frontend'));
app.use(express.json());

// API: Get logs
app.get('/api/logs', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const type = req.query.type || 'all';
    let query = 'SELECT * FROM logs';
    if (type === 'anomaly') query += ' WHERE is_anomaly = TRUE';
    else if (type === 'normal') query += ' WHERE is_anomaly = FALSE';
    query += ' ORDER BY timestamp DESC LIMIT $1';
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) as anomalies,
        SUM(CASE WHEN NOT is_anomaly THEN 1 ELSE 0 END) as normal
      FROM logs
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', async (message) => {
    const logLine = message.toString();
    let anomaly = false;
    try {
      const res = await axios.post('http://localhost:6000/check', { log: logLine });
      anomaly = res.data.anomaly;
    } catch (err) {
      console.error('AI error:', err.message);
    }

    // Save to database
    try {
      await pool.query('INSERT INTO logs (message, is_anomaly) VALUES ($1, $2)', [logLine, anomaly]);
    } catch (err) {
      console.error('DB insert error:', err.message);
    }

    const payload = JSON.stringify({ text: logLine, anomaly });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  });
  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(5000, '0.0.0.0', () => console.log('Backend on :5000'));