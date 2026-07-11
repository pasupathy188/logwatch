from collections import deque
import re
from flask import Flask, request, jsonify
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY

app = Flask(__name__)

# Store recent log features for anomaly detection
window = deque(maxlen=50)
# Track counts
error_counts = deque(maxlen=10)  # errors per 10-log window

REQUEST_COUNT = Counter('ai_requests_total', 'Total /check requests')
ANOMALY_COUNT = Counter('ai_anomalies_total', 'Total anomalies detected')

def extract_features(log_line):
    """Extract features from a log line without needing a model file."""
    length = len(log_line)
    special = len(re.findall(r'[^a-zA-Z0-9\s]', log_line))
    error_kw = ['fail', 'error', 'critical', 'unauthorized', 'exceeded', 'refused', 'denied']
    error_flag = 1 if any(kw in log_line.lower() for kw in error_kw) else 0
    return error_flag, length, special

@app.route('/check', methods=['POST'])
def check():
    data = request.json
    log = data.get('log', '')
    feat = extract_features(log)
    
    # Track error bursts
    error_counts.append(feat[0])
    
    # Anomaly detection logic (no model file needed):
    # 1. If more than 3 errors in the last 10 logs → anomaly
    # 2. If log is unusually long (>200 chars) → anomaly
    # 3. If log has many special characters (>20) → anomaly
    
    is_anomaly = False
    
    if len(error_counts) >= 5:
        recent_errors = sum(list(error_counts)[-5:])
        if recent_errors >= 3:  # Burst of errors
            is_anomaly = True
    
    if feat[1] > 200:  # Unusually long
        is_anomaly = True
    
    if feat[2] > 20:  # Unusual special characters
        is_anomaly = True
    
    REQUEST_COUNT.inc()
    if is_anomaly:
        ANOMALY_COUNT.inc()
    
    return jsonify({'anomaly': is_anomaly})

@app.route('/metrics')
def metrics():
    return generate_latest(REGISTRY)

@app.route('/health')
def health():
    return 'OK'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000)