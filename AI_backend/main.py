# AI_backend/ai_logic/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path

from ai_logic.infer_thermal import infer_thermal

app = FastAPI(title="Transformer AI Backend")

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_PATH = BASE_DIR / "best.pt"
CFG_PATH     = BASE_DIR / "cfg" / "config_global.json"

class InferenceRequest(BaseModel):
    maintenance_image_path: str
    baseline_image_path: Optional[str] = None      # optional
    save_annot: Optional[str] = None               # optional file path to save preview
    device: int = 0                                # 0=GPU, -1=CPU
    imgsz: int = 640
    half: bool = True
    web_payload: bool = True                       # return web-friendly bbox format

@app.post("/infer")
async def infer(req: InferenceRequest):
    try:
        # sanity checks
        if not Path(req.maintenance_image_path).exists():
            raise HTTPException(status_code=400, detail="maintenance_image_path not found")
        if req.baseline_image_path and not Path(req.baseline_image_path).exists():
            raise HTTPException(status_code=400, detail="baseline_image_path not found")
        if not WEIGHTS_PATH.exists():
            raise HTTPException(status_code=500, detail="YOLO weights not found on server")
        if not CFG_PATH.exists():
            raise HTTPException(status_code=500, detail="Config file not found on server")

        result = infer_thermal(
            candidate_img=req.maintenance_image_path,
            baseline_img=req.baseline_image_path,
            weights=str(WEIGHTS_PATH),
            cfg_path=str(CFG_PATH),
            save_annot=req.save_annot,
            device=req.device,
            imgsz=req.imgsz,
            half=req.half,
            web_payload=req.web_payload,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
