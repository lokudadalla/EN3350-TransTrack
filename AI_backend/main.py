from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from ai_logic.cv_logic import detect_anomalies
from pathlib import Path
import cv2

app = FastAPI(title="Transformer AI Backend")


class DetectionRequest(BaseModel):
    baseline_image_path: str
    maintenance_image_path: str
    threshold: float
    rule1: Optional[float] = None
    rule2: Optional[float] = None


def draw_and_save_boxes_cv2(
    image_path: str, boxes: list[list[int]], label: str = ""
) -> str:
    """
    Draw [x,y,w,h] boxes on the image at image_path and save next to it.
    Returns the saved file path.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Draw boxes (color is BGR; red = (0,0,255))
    for x, y, w, h in boxes:
        pt1 = (int(x), int(y))
        pt2 = (int(x + w - 1), int(y + h - 1))
        cv2.rectangle(img, pt1, pt2, (0, 0, 255), thickness=3)

    # Optional label
    if label:
        cv2.putText(
            img,
            label,
            (12, 30),  # position
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (0, 0, 255),  # red text in BGR
            2,
            cv2.LINE_AA,
        )

    p = Path(image_path)
    save_path = p.with_name(f"{p.stem}_annotated.png")
    ok = cv2.imwrite(str(save_path), img)
    if not ok:
        raise RuntimeError(f"Failed to write annotated image to: {save_path}")
    return str(save_path)


@app.post("/detect")
async def detect_anomaly(req: DetectionRequest):
    result = detect_anomalies(
        baseline_path=req.baseline_image_path,
        maintenance_path=req.maintenance_image_path,
        threshold=req.threshold,
        rule1=req.rule1,
        rule2=req.rule2,
    )

    boxes = result.get("boxes", [])
    faulty_type = result.get("faulty_type", "none")

    annotated_path = None
    if boxes:
        annotated_path = draw_and_save_boxes_cv2(
            image_path=req.maintenance_image_path, boxes=boxes, label=faulty_type
        )

    result["annotated_path"] = annotated_path

    return result
