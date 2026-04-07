import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

# Create dummy dataset
# Features: [packet_rate, protocol_type, flow_duration, packet_size]

X = np.array([
    [1000, 1, 10, 500],
    [2000, 1, 12, 450],
    [150, 0, 2, 60],
    [120, 0, 3, 70],
    [3000, 1, 15, 550],
    [80, 0, 1, 40],
    [2500, 1, 14, 600],
    [90, 0, 2, 55]
])

# Labels: 0 = Normal, 1 = Attack
y = np.array([1, 1, 0, 0, 1, 0, 1, 0])

# Train model
model = RandomForestClassifier()
model.fit(X, y)

# Save model
joblib.dump(model, "model.pkl")

print("Dummy Model trained and saved successfully!")