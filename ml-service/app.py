"""Optional VoltFlow demand forecasting service trained on clearly synthetic data."""
from flask import Flask, jsonify, request
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

app = Flask(__name__)
rng = np.random.default_rng(42)
hours = np.tile(np.arange(24), 90)
days = np.repeat(np.arange(90), 24)
synthetic = pd.DataFrame({
    "hour": hours,
    "weekday": days % 7,
    "temperature": 17 + 7 * np.sin(days / 14) + rng.normal(0, 2, len(hours)),
})
synthetic["demand"] = (
    18 + 32 * np.exp(-((hours - 8) / 3) ** 2)
    + 48 * np.exp(-((hours - 18) / 4) ** 2)
    + (synthetic["weekday"] < 5) * 9 + rng.normal(0, 3, len(hours))
)
model = RandomForestRegressor(n_estimators=120, random_state=42, max_depth=10)
model.fit(synthetic[["hour", "weekday", "temperature"]], synthetic["demand"])

@app.get("/health")
def health():
    return {"status": "healthy", "model": "random-forest", "data": "synthetic"}

@app.post("/predict/demand")
def predict_demand():
    body = request.get_json(force=True)
    row = pd.DataFrame([{
        "hour": int(body["hour"]), "weekday": int(body["weekday"]),
        "temperature": float(body.get("temperature", 20))
    }])
    prediction = max(0, float(model.predict(row)[0]))
    return jsonify({"predicted_sessions": round(prediction, 1), "model": "random-forest", "data_source": "synthetic"})

@app.get("/predict/peak-hours")
def peak_hours():
    weekday = int(request.args.get("weekday", 1))
    rows = pd.DataFrame({"hour": range(24), "weekday": weekday, "temperature": 20})
    predictions = model.predict(rows)
    top = np.argsort(predictions)[-3:][::-1]
    return jsonify({"peak_hours": [int(x) for x in top], "predicted_sessions": [round(float(predictions[x]), 1) for x in top]})

if __name__ == "__main__":
    app.run(port=5001, debug=False)
