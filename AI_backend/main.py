# AI_backend/ai_logic/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, Dict, Any
import os, tempfile, requests
from urllib.parse import urlparse
# from ai_logic.finetune import main_train

from ai_logic.infer_thermal import infer_thermal

APP_PUBLIC_BASE = os.getenv("APP_PUBLIC_BASE", "http://localhost:8080")

app = FastAPI(title="Transformer AI Backend")

BASE_DIR     = Path(__file__).resolve().parent
WEIGHTS_PATH = BASE_DIR / "ai_logic" / "best2.pt"
CFG_PATH     = BASE_DIR / "ai_logic" / "cfg" / "config_global.json"


class InferenceRequest(BaseModel):
    maintenance_image_path: str
    baseline_image_path: Optional[str] = None  # optional
    save_annot: Optional[str] = None  # optional file path to save preview
    device: int = "cpu"  # 0=GPU, -1=CPU
    imgsz: int = 640
    half: bool = False
    web_payload: bool = True

    # UI slider 0..100 — forwarded as-is to infer_thermal (do NOT use to change rule thresholds)
    temperature_percent: Optional[int] = None

    # Optional manual overrides from caller (rare). These *do* override CFG if sent.
    cfg_overrides: Optional[Dict[str, Any]] = None


def _is_url(s: str) -> bool:
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https")
    except Exception:
        return False


def _fetch_to_local(path_or_id: str) -> str:
    """
    Accepts:
      - local path: returns it unchanged if exists
      - full URL: downloads it
      - bare ID (e.g., DB id): builds URL using APP_PUBLIC_BASE and downloads
    Returns a local temp file path suitable for OpenCV.
    """
    # Local file?
    if Path(path_or_id).exists():
        return path_or_id

    # Full URL?
    if _is_url(path_or_id):
        url = path_or_id
    else:
        # Adjust to your Spring endpoint if different (e.g., /api/files/{id})
        url = f"{APP_PUBLIC_BASE}/files/{path_or_id}"

    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    # Guess an extension if you can; fallback to .jpg
    suffix = ".jpg"
    ct = resp.headers.get("Content-Type", "")
    if "png" in ct:
        suffix = ".png"
    elif "jpeg" in ct or "jpg" in ct:
        suffix = ".jpg"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(resp.content)
    tmp.close()
    return tmp.name



# @app.post("/train")
# async def train_model():
#     try:
#         main_train()
#         return {"status": "Training completed successfully."}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Training failed: {e}")


@app.post("/infer")
async def infer(req: InferenceRequest):
    try:
        # Model/config presence checks
        if not WEIGHTS_PATH.exists():
            raise HTTPException(status_code=500, detail="YOLO weights not found on server")
        if not CFG_PATH.exists():
            raise HTTPException(status_code=500, detail="Config file not found on server")

        # Resolve images (local path, URL, or DB id) -> local temp files
        maintenance_local = _fetch_to_local(req.maintenance_image_path)
        baseline_local = _fetch_to_local(req.baseline_image_path) if req.baseline_image_path else None

        # IMPORTANT:
        # Do NOT tighten rule thresholds from the slider.
        # Let the slider only change the temperature gate & blended per-box score inside infer_thermal.
        final_overrides: Dict[str, Any] = dict(req.cfg_overrides or {})

        result = infer_thermal(
            candidate_img=maintenance_local,
            baseline_img=baseline_local,
            weights=str(WEIGHTS_PATH),
            cfg_path=str(CFG_PATH),
            save_annot=req.save_annot,
            device=req.device,
            imgsz=req.imgsz,
            half=req.half,
            web_payload=True,                    # returns {"boxes":[...]} only
            cfg_overrides=final_overrides,       # optional external overrides
            temperature_percent=req.temperature_percent,  # <-- slider (0..100)
        )
        print(result)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
