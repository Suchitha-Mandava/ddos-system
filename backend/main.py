from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import time
from datetime import datetime
from collections import defaultdict
import threading

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
request_counts = defaultdict(int)
last_logged_status = {}
REQUEST_THRESHOLD = 30
TIME_WINDOW = 5

# -----------------------------
# Middleware (NO DATABASE HERE)
# -----------------------------
@app.middleware("http")
async def monitor_requests(request: Request, call_next):

    client_ip = request.client.host
    request_counts[client_ip] += 1

    response = await call_next(request)
    return response

# -----------------------------
# Background Logger Thread
# -----------------------------
def background_logger():
    while True:
        time.sleep(TIME_WINDOW)

        db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="password",
            database="ddos_monitor"
        )
        cursor = db.cursor()

        for ip, count in request_counts.items():

            if count > REQUEST_THRESHOLD:
                status = "Attack"
            else:
                status = "Normal"

            # Only log if changed
            if ip not in last_logged_status or last_logged_status[ip] != status:
                cursor.execute(
                    "INSERT INTO traffic_logs (ip_address, packet_rate, prediction, timestamp) VALUES (%s, %s, %s, %s)",
                    (ip, count, status, datetime.now())
                )
                last_logged_status[ip] = status

        db.commit()
        db.close()

        # Reset counters
        request_counts.clear()

# Start background thread
threading.Thread(target=background_logger, daemon=True).start()

# -----------------------------
@app.get("/")
def home():
    return {"message": "Server Running"}

@app.get("/stats")
def get_stats():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Mandava@1234",
        database="ddos_monitor"
    )
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_attacks FROM traffic_logs WHERE prediction='Attack'")
    attacks = cursor.fetchone()["total_attacks"]

    cursor.execute("SELECT COUNT(*) AS total_normal FROM traffic_logs WHERE prediction='Normal'")
    normal = cursor.fetchone()["total_normal"]

    db.close()

    return {
        "total_attacks": attacks,
        "total_normal": normal
    }

@app.get("/logs")
def get_logs():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Mandava@1234",
        database="ddos_monitor"
    )
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM traffic_logs ORDER BY id DESC LIMIT 100")
    logs = cursor.fetchall()

    db.close()
    return logs
