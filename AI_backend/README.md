# 🔍 Transformer Thermal Image Anomaly Detection — AI Backend

FastAPI-based **Python AI server** for detecting anomalies in transformer **thermal images** using **Ultralytics YOLO + rule-based thermal logic**.  
Designed to be called from a **Java (Spring Boot) backend**, which is triggered by the **frontend**.

---

## 🧠 Architecture

Frontend (uploads/selects images)
↓
Java Backend (Spring Boot)

Stores/serves images (e.g., GET /files/{id})

Calls AI Backend /infer
↓
Python AI Backend (this project)

FastAPI

YOLO + CV2 rules

Returns boxes/labels/scores

---

## 📁 Folder Structure

AI_backend/
├─ main.py # FastAPI app exposing /infer
├─ ai_logic/
│ ├─ infer_thermal.py # Core inference (YOLO + CV2 rules + fallback)
│ ├─ best.pt # Trained YOLO weights
│ └─ cfg/
│ └─ config_global.json # Thresholds & decision params
└─ train/ # Training assets (not required for serving)
├─ train_yolo.ipynb # (Optional) notebook used to train
└─ dataset.yaml / * # (Optional)



> **Note:** `main.py` expects weights and config at `ai_logic/best.pt` and `ai_logic/cfg/config_global.json`.

---

## ⚙️ Requirements

- Python 3.10+
- CUDA-capable GPU (optional; CPU works but is slower)
- Install dependencies:
  ```bash
  pip install fastapi uvicorn ultralytics opencv-python numpy requests



## 🚀 Run the Server

uvicorn main:app --host 0.0.0.0 --port 8000
# Swagger UI: http://localhost:8000/docs


🔐 Environment Variables
Variable	Description	Default
APP_PUBLIC_BASE	Base URL of the Java backend used when you pass plain IDs (not full URLs) for images	http://localhost:8080

If you pass "maintenance_image_path": "12345" the AI backend will fetch from:
{APP_PUBLIC_BASE}/files/12345

🧩 API
POST /infer

Runs anomaly detection and returns boxes suitable for web rendering.

Request Body (Pydantic model: InferenceRequest)


{
  "maintenance_image_path": "http://localhost:8080/files/123",
  "baseline_image_path": "http://localhost:8080/files/456",
  "save_annot": "outputs/annotated.jpg",
  "device": 0,
  "imgsz": 640,
  "half": true,
  "web_payload": true,
  "temperature_percent": 30,
  "cfg_overrides": {
    "color": { "dv_min": 0.1 }
  }
}



Response (when web_payload: true)
{
  "boxes": [
    {
      "x": 212,
      "y": 156,
      "width": 64,
      "height": 72,
      "label": "Loose Joint -Faulty",
      "score": 0.85,
      "size": 4608
    }
  ],
  "annotated": "outputs/annotated.jpg"
}


Labels returned

Loose Joint -Faulty

Point Overload Faulty

Loose Joint -potential

Full wire overload

How image paths are handled

Local file path → used as-is if exists.

Full URL (http/https) → downloaded to a temp file.

Plain ID (e.g., "123") → fetched from APP_PUBLIC_BASE/files/{id}.

🧠 How Detection Works (High Level)

YOLO inference with ai_logic/best.pt on the original image.

Thermal rule logic (OpenCV/HSV):

Palette normalization + optional baseline alignment (ECC).

Warm/hot pixel masks and contrast checks (local vs. baseline).

Per-box classification (wire/loose/point) and fallback rule-only proposals if YOLO misses.

Output:

Web-friendly box list (x,y,width,height,label,score).

Optional annotated preview image if save_annot is provided.


🧪 Minimal Training Notes

Trained with Ultralytics 8.3.204 using YOLO11s on transformer dataset.

Typical training command:

from ultralytics import YOLO
model = YOLO("yolo11s.pt")
model.train(data="path/to/data.yaml", imgsz=640, epochs=100, batch=16, device=0, mosaic=0, hsv_h=0, hsv_s=0.10, hsv_v=0.10)


The resulting weights (best.pt) should be copied to:
ai_logic/best.pt

The train/ folder includes a notebook (train_yolo.ipynb) used for this process.
