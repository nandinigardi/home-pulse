from flask import Flask, render_template, jsonify, Response, session, request, redirect, url_for
import random
import time
import math
import io
import csv
import json
import os
import requests # Added for SMS and Ntfy
from datetime import datetime

app = Flask(__name__)
app.secret_key = "homeplus-secret-key-999"

# User Database File
USER_FILE = 'users.json'

def load_users():
    if not os.path.exists(USER_FILE):
        default_users = {"admin": {"password": "password", "role": "Admin"}}
        save_users(default_users)
        return default_users
    with open(USER_FILE, 'r') as f:
        return json.load(f)

def save_users(users):
    with open(USER_FILE, 'w') as f:
        json.dump(users, f, indent=4)

# State Management
app_state = {
    "sim_mode": "auto",
    "manual_overrides": {
        "temperature": 24.0,
        "motion": 0,
        "light": 400.0,
        "gas": 30.0
    },
    "history": [] # Store last 50 readings
}

# Notification System
alert_cooldowns = {}

def send_notification(title, message):
    """Sends a push notification to mobile via ntfy.sh (Free API)"""
    try:
        # User opted for Ntfy App
        topic = "home-pulse-alerts-nandini" 
        
        # Cooldown check
        last_time = alert_cooldowns.get(title, 0)
        current_time = time.time()
        
        if current_time - last_time < 60:
            return

        # Send to Ntfy (Web/App)
        requests.post(f"https://ntfy.sh/{topic}", 
            data=message.encode('utf-8'),
            headers={"Title": title, "Priority": "high", "Tags": "warning,sensor"},
            timeout=2
        )
        
        # Update cooldown
        alert_cooldowns[title] = current_time
        print(f"Notification Sent: {title}")
        
    except Exception as e:
        print(f"Notification Error: {e}")

sensor_data = {
    "temperature": 24.0,
    "motion": 0,
    "light": 400.0,
    "gas": 30.0,
    "devices": {"fan": "OFF", "lights": "OFF", "alarm": "OFF"}
}

def simulate_sensors(event_desc="AUTO DRIFT"):
    """Sophisticated autonomous simulation with manual override support."""
    t = time.time()
    
    if app_state["sim_mode"] == "auto":
        sensor_data["temperature"] = round(22 + 4 * math.sin(t / 800) + random.uniform(-0.1, 0.1), 1)
        sensor_data["light"] = round(max(0, min(1000, 500 + 450 * math.sin(t / 1500) + random.uniform(-5, 5))), 0)
        sensor_data["gas"] = round(30 + (180 * random.random() if random.random() > 0.98 else random.uniform(-1, 1)), 1)
        sensor_data["motion"] = 1 if random.random() > 0.97 else 0
    else:
        sensor_data.update(app_state["manual_overrides"])

    # Interaction Logic
    sensor_data["devices"]["fan"] = "ON" if sensor_data["temperature"] > 30 else "OFF"
    sensor_data["devices"]["alarm"] = "ON" if sensor_data["gas"] > 150 else "OFF"
    sensor_data["devices"]["lights"] = "ON" if (sensor_data["motion"] == 1 or sensor_data["light"] < 150) else "OFF"

    # Save primary telemetry state
    now_str = datetime.now().strftime("%H:%M:%S")
    history_entry = {
        "timestamp": now_str,
        "event": event_desc,
        "data": sensor_data.copy(),
        "warnings": []
    }
    app_state["history"].append(history_entry)

    # Granular Alert Generation (Individual History Entries for each violation)
    current_alerts = []
    
    if sensor_data["temperature"] > 35: 
        msg = f"Thermal Hazard: Heat Spike At {sensor_data['temperature']}°C"
        current_alerts.append(msg)
        send_notification("Thermal Hazard", msg)
        app_state["history"].append({
            "timestamp": now_str,
            "event": "SAFETY ALERT",
            "data": sensor_data.copy(),
            "warnings": [msg]
        })
    
    if sensor_data["gas"] > 200: 
        msg = f"Atmosphere Danger: Gas At {sensor_data['gas']} PPM"
        current_alerts.append(msg)
        send_notification("Gas Leak", msg)
        app_state["history"].append({
            "timestamp": now_str,
            "event": "SAFETY ALERT",
            "data": sensor_data.copy(),
            "warnings": [msg]
        })
        
    if sensor_data["motion"] == 1: 
        msg = "Sentinel Breach: Unauthorized Motion"
        current_alerts.append(msg)
        send_notification("Security Alert", msg)
        app_state["history"].append({
            "timestamp": now_str,
            "event": "SAFETY ALERT",
            "data": sensor_data.copy(),
            "warnings": [msg]
        })

    if sensor_data["light"] < 100:
        msg = f"Luminosity Low: Ambient {sensor_data['light']} lx"
        current_alerts.append(msg)
        send_notification("Sensor Warning", msg)
        app_state["history"].append({
            "timestamp": now_str,
            "event": "SAFETY ALERT",
            "data": sensor_data.copy(),
            "warnings": [msg]
        })

    # Rolling Window maintenance
    if len(app_state["history"]) > 60:
        app_state["history"] = app_state["history"][-60:]

    # Attach current warnings for real-time dashboard toasts
    sensor_data["current_warnings"] = current_alerts

@app.route('/')
def index():
    if 'user' not in session:
        return render_template('login.html')
    return render_template('index.html', user=session['user'])

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    users = load_users()
    if username in users:
        return jsonify({"success": False, "message": "Neural ID already registered"}), 400
    
    users[username] = {"password": password, "role": "User"}
    save_users(users)
    return jsonify({"success": True})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    users = load_users()
    if username in users and users[username]['password'] == password:
        session['user'] = username
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/api/data', methods=['GET', 'POST'])
def get_set_data():
    event_type = "AUTO DRIFT"
    if request.method == 'POST':
        data = request.json
        if "mode" in data:
            app_state["sim_mode"] = data["mode"]
            event_type = f"MODE: {data['mode'].upper()}"
        if "overrides" in data:
            app_state["manual_overrides"].update(data["overrides"])
            # Format event desc based on what changed
            keys = list(data["overrides"].keys())
            event_type = f"MANUAL: {', '.join(keys).upper()} ADJ"
    
    simulate_sensors(event_type)
    return jsonify({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "sensor_data": sensor_data,
        "mode": app_state["sim_mode"],
        "history": app_state["history"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)