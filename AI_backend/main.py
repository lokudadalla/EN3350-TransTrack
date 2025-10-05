# AI_backend/ai_logic/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path

from ai_logic.infer_thermal import infer_thermal
from typing import Dict, Any, Optional
import os, tempfile, requests
from urllib.parse import urlparse

APP_PUBLIC_BASE = os.getenv("APP_PUBLIC_BASE", "http://localhost:8080")

app = FastAPI(title="Transformer AI Backend")

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_PATH = BASE_DIR / "ai_logic" / "best.pt"
CFG_PATH = BASE_DIR / "ai_logic" / "cfg" / "config_global.json"


class InferenceRequest(BaseModel):
    maintenance_image_path: str
    baseline_image_path: Optional[str] = None  # optional
    save_annot: Optional[str] = None  # optional file path to save preview
    device: int = -1  # 0=GPU, -1=CPU
    imgsz: int = 640
    half: bool = False
    web_payload: bool = True
    temperature_percent: Optional[int] = None  # e.g., 10, 20, 30, 40
    cfg_overrides: Optional[Dict[str, Any]] = None


def _is_url(s: str) -> bool:
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https")
    except:
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
        # Treat as an ID and construct the public URL your Java app exposes.
        # Adjust endpoint to match your Spring controller:
        # e.g., /api/files/{id} or /files/{id}
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


def build_overrides_linear(pct: Optional[int]) -> Dict[str, Any]:
    if pct is None:
        return {}

    # Clamp to [0, 100]
    p = max(0, min(100, int(pct)))
    t = p / 100.0

    # ---- TUNING RANGES (edit these as you like) ----
    low = {"color": {"dv_min": 0.08, "dl_min": 0.05}, "color_hot": {"dv_min_hot": 0.15}}
    high = {
        "color": {"dv_min": 0.22, "dl_min": 0.14},
        "color_hot": {"dv_min_hot": 0.30},
    }
    # -----------------------------------------------

    def lerp(a, b):
        return a + t * (b - a)

    return {
        "color": {
            "dv_min": round(lerp(low["color"]["dv_min"], high["color"]["dv_min"]), 4),
            "dl_min": round(lerp(low["color"]["dl_min"], high["color"]["dl_min"]), 4),
        },
        "color_hot": {
            "dv_min_hot": round(
                lerp(low["color_hot"]["dv_min_hot"], high["color_hot"]["dv_min_hot"]), 4
            ),
        },
    }


@app.post("/infer")
async def infer(req: InferenceRequest):
    try:
        # Only check model/config files on disk
        if not WEIGHTS_PATH.exists():
            raise HTTPException(
                status_code=500, detail="YOLO weights not found on server"
            )
        if not CFG_PATH.exists():
            raise HTTPException(
                status_code=500, detail="Config file not found on server"
            )

        # Turn whatever we got (local path, URL, or DB id) into local temp files
        maintenance_local = _fetch_to_local(req.maintenance_image_path)
        baseline_local = None
        if req.baseline_image_path:
            baseline_local = _fetch_to_local(req.baseline_image_path)

        # Build linear overrides from the single UI % control
        percent_overrides = build_overrides_linear(req.temperature_percent)

        # Optional raw overrides from caller (let them win if provided)
        final_overrides = dict(percent_overrides)
        if req.cfg_overrides:

            def deep_merge(dst, src):
                for k, v in src.items():
                    if isinstance(v, dict) and isinstance(dst.get(k), dict):
                        deep_merge(dst[k], v)
                    else:
                        dst[k] = v
                return dst

            deep_merge(final_overrides, req.cfg_overrides)

        result = infer_thermal(
            candidate_img=maintenance_local,
            baseline_img=baseline_local,
            weights=str(WEIGHTS_PATH),
            cfg_path=str(CFG_PATH),
            save_annot=req.save_annot,
            device=req.device,
            imgsz=req.imgsz,
            half=req.half,
            web_payload=True,  # returns {"boxes":[...]} only
            cfg_overrides=final_overrides,
            temperature_percent=req.temperature_percent,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")