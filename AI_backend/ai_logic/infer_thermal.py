from __future__ import annotations

from ultralytics import YOLO
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np
import cv2
import json
import math

def infer_thermal(
    candidate_img: str,
    weights: str,
    cfg_path: str,
    baseline_img: Optional[str] = None,
    save_annot: Optional[str] = None,
    device: int = 0,
    imgsz: int = 640,
    web_payload: bool = False,
    cfg_overrides: Optional[Dict[str, Any]] = None,
    temperature_percent: Optional[int] = None,
    half: bool = False,
) -> Dict[str, Any]:
    # --------------------- helpers ---------------------
    def _load_cfg(path: str) -> Dict[str, Any]:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _deep_merge(dst: Dict[str, Any], src: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in (src or {}).items():
            if isinstance(v, dict) and isinstance(dst.get(k), dict):
                _deep_merge(dst[k], v)
            else:
                dst[k] = v
        return dst

    def _lerp(a: float, b: float, u: float) -> float:
        return a + (b - a) * u

    def _load_rgb(p: str) -> np.ndarray:
        bgr = cv2.imread(str(p), cv2.IMREAD_COLOR)
        if bgr is None:
            raise FileNotFoundError(p)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    def _normalize_palette(rgb: np.ndarray) -> np.ndarray:
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        h, s, v = cv2.split(hsv)
        v = cv2.equalizeHist(v)
        return cv2.cvtColor(cv2.merge([h, s, v]), cv2.COLOR_HSV2RGB)

    def _resize_to_match(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        H, W = a.shape[:2]
        return cv2.resize(b, (W, H), interpolation=cv2.INTER_AREA)

    def _register_affine(base_rgb: np.ndarray, cand_rgb: np.ndarray) -> np.ndarray:
        b = cv2.cvtColor(base_rgb, cv2.COLOR_RGB2GRAY)
        c = cv2.cvtColor(cand_rgb, cv2.COLOR_RGB2GRAY)
        warp = np.eye(2, 3, dtype=np.float32)
        try:
            _, warp = cv2.findTransformECC(
                b, c, warp, cv2.MOTION_AFFINE,
                (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
            )
            H, W = b.shape
            return cv2.warpAffine(
                cand_rgb, warp, (W, H),
                flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP
            )
        except cv2.error:
            return cand_rgb

    def _rgb_to_hsv01(img_rgb: np.ndarray) -> np.ndarray:
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[..., 0] /= 179.0
        hsv[..., 1] /= 255.0
        hsv[..., 2] /= 255.0
        return hsv

    def _in_exclusion(cx: int, cy: int, H: int, W: int, EX: List[Dict[str, float]]) -> bool:
        for r in EX:
            x0, y0 = int(r["x0"] * W), int(r["y0"] * H)
            x1, y1 = int(r["x1"] * W), int(r["y1"] * H)
            if x0 <= cx <= x1 and y0 <= cy <= y1:
                return True
        return False

    def _classify_box(hsvC: np.ndarray, vB: Optional[np.ndarray], xywh, P: Dict[str, float]):
        x, y, w, h = map(int, xywh)
        H, W = hsvC.shape[:2]
        x = max(0, min(x, W - 1)); y = max(0, min(y, H - 1))
        w = max(1, min(w, W - x)); h = max(1, min(h, H - y))
        roi = hsvC[y:y + h, x:x + w]
        hC, sC, vC = roi[..., 0], roi[..., 1], roi[..., 2]

        warm_h = (hC <= 0.17) | (hC >= 0.95)
        warm_s = sC >= P["sat_min"]
        warm_v = vC >= P["val_min"]

        vB_roi = np.zeros_like(vC) if vB is None else vB[y:y + h, x:x + w]
        med_base = cv2.medianBlur((vB_roi * 255).astype(np.uint8), 31) / 255.0
        med_cand = cv2.medianBlur((vC * 255).astype(np.uint8), 31) / 255.0
        dv = (vC - med_base)  # vs baseline
        dl = (vC - med_cand)  # local

        contrast_warm = (dv >= P["dv_min"]) | (dl >= P["dl_min"])
        warm = (warm_h & warm_s & warm_v & contrast_warm)

        hot_s = sC >= P["sat_min_hot"]
        hot_v = vC >= P["val_min_hot"]
        hot_contrast = (dv >= P["dv_min_hot"]) | (dl >= P["dl_min"])
        hot = (warm_h & hot_s & hot_v & hot_contrast)

        warm_pix = int(warm.sum())
        hot_pix = int(hot.sum())
        min_pix = max(4, int(P["min_area_frac"] * H * W))
        ok_warm = warm_pix >= min_pix
        ok_hot = hot_pix >= min_pix

        area_frac_warm = warm_pix / float(H * W)
        short = max(1, min(w, h)); long_ = max(w, h)
        aspect = long_ / short

        if area_frac_warm >= P["loose_area_frac"]:
            rule_core = "loose_joint"
        elif aspect >= P["wire_aspect_min"] and area_frac_warm < P["wire_area_max"]:
            rule_core = "wire_overload"
        else:
            rule_core = "point_overload"

        dv95 = float(np.quantile(np.maximum(0.0, dv).ravel(), 0.95))
        dl95 = float(np.quantile(np.maximum(0.0, dl).ravel(), 0.95))
        therm_metric = dv95 if vB is not None else dl95
        return ok_warm, ok_hot, rule_core, float(area_frac_warm), float(aspect), float(therm_metric)

    def _label_from(rule_core: str, is_hot: bool) -> str:
        if rule_core == "wire_overload":
            return "Full wire overload"
        if rule_core == "loose_joint":
            return "Loose Joint -Faulty" if is_hot else "Loose Joint -potential"
        return "Point Overload Faulty" if is_hot else "Loose Joint -potential"

    def _iou(a: Dict[str, Any], b: Dict[str, Any]) -> float:
        ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["w"], a["y"] + a["h"]
        bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]
        ix1, iy1, ix2, iy2 = max(ax1, bx1), max(ay1, by1), min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
        inter = iw * ih
        if inter == 0:
            return 0.0
        return inter / float((ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter + 1e-6)

    def _label_nms(boxes: List[Dict[str, Any]], merge_iou: float, suppress_contained: float) -> List[Dict[str, Any]]:
        boxes = sorted(boxes, key=lambda d: d["score"], reverse=True)
        keep = []
        def _area(b): return float(b["w"] * b["h"])
        for b in boxes:
            drop = False
            for k in keep:
                if b["label"] != k["label"]:
                    continue
                if _iou(b, k) >= merge_iou:
                    drop = True; break
                if _area(b) < _area(k):
                    ax1, ay1, ax2, ay2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]
                    bx1, by1, bx2, by2 = k["x"], k["y"], k["x"] + k["w"], k["y"] + k["h"]
                    inter = max(0, min(ax2, bx2) - max(ax1, bx1)) * max(0, min(ay2, by2) - max(ay1, by1))
                    if inter / (_area(b) + 1e-6) >= suppress_contained:
                        drop = True; break
            if not drop:
                keep.append(b)
        return keep

    # --------------------- load config (defaults → file → overrides) ---------------------
    # Base defaults aligned to your notebook CFG + reasonable fallbacks
    CFG = {
        "ui_exclusions": [
            {"x0": 0.00, "y0": 0.00, "x1": 0.12, "y1": 1.00},
            {"x0": 0.80, "y0": 0.00, "x1": 1.00, "y1": 0.22},
            {"x0": 0.00, "y0": 0.83, "x1": 0.22, "y1": 1.00},
        ],
        "thermal_gate_loose": 0.10,
        "thermal_gate_strict": 0.25,
        "merge_iou": 0.50,
        "suppress_contained": 0.70,
        "use_rule_only_fallback": True,
        # Allow external cfg to define static min/constant params if needed
    }

    file_cfg = _load_cfg(cfg_path) if cfg_path else {}
    _deep_merge(CFG, file_cfg)
    _deep_merge(CFG, cfg_overrides or {})

    # --------------------- inputs & model ---------------------
    model = YOLO(weights)
    cand_raw = _load_rgb(candidate_img)
    cand_norm = _normalize_palette(cand_raw)

    vB = None
    if baseline_img:
        base = _normalize_palette(_load_rgb(baseline_img))
        cand_norm = _resize_to_match(base, cand_norm)
        cand_norm = _register_affine(base, cand_norm)
        vB = _rgb_to_hsv01(base)[..., 2]  # baseline V channel

    hsvC = _rgb_to_hsv01(cand_norm)
    H, W = hsvC.shape[:2]

    # --------------------- adaptive thresholds from slider ---------------------
    t = max(0, min(100, int(temperature_percent if temperature_percent is not None else 50))) / 100.0

    P = {
        "sat_min":         _lerp(0.25, 0.55, t),
        "val_min":         _lerp(0.45, 0.70, t),
        "dv_min":          _lerp(0.06, 0.22, t),
        "dl_min":          _lerp(0.04, 0.12, t),
        "sat_min_hot":     _lerp(0.40, 0.65, t),
        "val_min_hot":     _lerp(0.60, 0.80, t),
        "dv_min_hot":      _lerp(0.12, 0.30, t),
        "min_area_frac":   _lerp(0.0015, 0.0040, t),
        "loose_area_frac": _lerp(0.08,   0.18,  t),
        "wire_aspect_min": _lerp(2.2,    3.2,   t),
        "wire_area_max":   _lerp(0.25,   0.15,  t),
    }

    vC = hsvC[..., 2]
    med_cand = cv2.medianBlur((vC * 255).astype(np.uint8), 31) / 255.0
    if vB is None:
        dv_like = np.maximum(0.0, vC - med_cand)
    else:
        med_base = cv2.medianBlur((vB * 255).astype(np.uint8), 31) / 255.0
        dv_like = np.maximum(0.0, (vC - med_base))
    p85 = float(np.quantile(dv_like, 0.85))
    p98 = float(np.quantile(dv_like, 0.98))
    span = max(1e-6, p98 - p85)
    lo_anchor = max(CFG["thermal_gate_loose"], 0.5 * p85)
    hi_anchor = max(CFG["thermal_gate_strict"], 0.5 * p98)
    thermal_gate = (1.0 - t) ** 2 * lo_anchor + (t ** 2) * hi_anchor
    thermal_gate += 0.20 * t * span

    # YOLO acceptance and overall scoring settings
    yolo_conf_req = _lerp(0.10, 0.55, t)
    min_keep_score = _lerp(0.15, 0.60, t)
    require_hot = (t >= 0.70)

    # --------------------- YOLO pass ---------------------
    # note: imgsz from API, half from API, device from API
    pred = model.predict(cand_raw, device=device, half=half, imgsz=imgsz, verbose=False)[0]

    refined: List[Dict[str, Any]] = []
    drops = {"lowconf": 0, "ui": 0, "thermal": 0, "warm": 0, "score": 0}

    if len(pred.boxes):
        xyxy = pred.boxes.xyxy.cpu().numpy()
        conf = pred.boxes.conf.cpu().numpy()

        for (x1, y1, x2, y2), cf in zip(xyxy, conf):
            cf = float(cf)
            if cf < yolo_conf_req:
                drops["lowconf"] += 1
                continue

            x, y, w, h = int(x1), int(y1), int(x2 - x1), int(y2 - y1)
            cx, cy = x + w // 2, y + h // 2
            if _in_exclusion(cx, cy, H, W, CFG["ui_exclusions"]):
                drops["ui"] += 1
                continue

            ok_warm, ok_hot, rule_core, areaFrac, aspect, therm_metric = _classify_box(hsvC, vB, (x, y, w, h), P)

            if therm_metric < thermal_gate:
                drops["thermal"] += 1
                continue
            if not ok_warm:
                drops["warm"] += 1
                continue
            if require_hot and not ok_hot:
                drops["warm"] += 1
                continue

            rule_strength = 1.0 if ok_hot else max(0.25, float(areaFrac))
            score = (1.0 - t) * cf + (t ** 1.5) * rule_strength
            score = float(max(0.0, min(1.0, score)))
            if score < min_keep_score:
                drops["score"] += 1
                continue

            refined.append({
                "label": _label_from(rule_core, ok_hot),
                "x": x, "y": y, "w": w, "h": h,
                "score": round(score, 4),
                "detConfidence": cf,              # keep for backward-compat (if full payload used)
                "isHot": bool(ok_hot),
                "areaFrac": float(areaFrac),
            })

    # --------------------- rules-only fallback ---------------------
    if not refined and CFG.get("use_rule_only_fallback", True):
        hC, sC, vC = hsvC[..., 0], hsvC[..., 1], hsvC[..., 2]
        warm_h = (hC <= 0.17) | (hC >= 0.95)
        warm_s = sC >= P["sat_min"]
        warm_v = vC >= P["val_min"]

        if vB is None:
            med = cv2.medianBlur((vC * 255).astype(np.uint8), 31) / 255.0
            contrast = (vC - med) >= P["dl_min"]
        else:
            medB = cv2.medianBlur((vB * 255).astype(np.uint8), 31) / 255.0
            medC = cv2.medianBlur((vC * 255).astype(np.uint8), 31) / 255.0
            contrast = ((vC - medB) >= P["dv_min"]) | ((vC - medC) >= P["dl_min"])

        warm = (warm_h & warm_s & warm_v & contrast).astype(np.uint8)
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        wm = cv2.morphologyEx(warm, cv2.MORPH_OPEN, k)
        num, labels, stats, _ = cv2.connectedComponentsWithStats(wm, 8)

        for i in range(1, num):
            x, y, w, h, area = map(int, stats[i])
            if area < max(32, int(P["min_area_frac"] * H * W)):
                continue

            ok_warm, ok_hot, rule_core, areaFrac, aspect, therm_metric = _classify_box(hsvC, vB, (x, y, w, h), P)

            if therm_metric < thermal_gate:
                continue
            if not ok_warm:
                continue
            if require_hot and not ok_hot:
                continue

            rule_strength = 1.0 if ok_hot else max(0.25, float(areaFrac))
            proxy = 0.9 if ok_hot else max(0.3, float(areaFrac))
            score = (1.0 - t) * proxy + (t ** 1.5) * rule_strength
            score = float(max(0.0, min(1.0, score)))
            if score < min_keep_score:
                continue

            refined.append({
                "label": _label_from(rule_core, ok_hot),
                "x": x, "y": y, "w": w, "h": h,
                "score": round(score, 4),
                "detConfidence": float(proxy),    # proxy since no YOLO box
                "isHot": bool(ok_hot),
                "areaFrac": float(areaFrac),
            })

    # --------------------- label-wise NMS & sort ---------------------
    refined = _label_nms(refined, CFG["merge_iou"], CFG["suppress_contained"])
    refined = sorted(refined, key=lambda d: d["score"], reverse=True)

    # --------------------- build payloads ---------------------
    # (1) WEB payload: slider-aware per-box score already computed -> map to expected schema
    if web_payload:
        web_boxes = []
        for b in refined:
            web_boxes.append({
                "x": int(b["x"]),
                "y": int(b["y"]),
                "width": int(b["w"]),
                "height": int(b["h"]),
                "label": str(b["label"]),
                "score": float(b["score"]),
                "size": float(b["w"] * b["h"]),
            })
        return {"boxes": web_boxes}

    # (2) FULL payload (backward-compatible keys)
    # Anomaly score heuristic: take top score or 0 if none
    anomaly_score = float(refined[0]["score"]) if refined else 0.0
    # Rule probability heuristic: proportion of "hot" boxes
    hot_cnt = sum(1 for b in refined if b.get("isHot"))
    rule_prob = float(hot_cnt / max(1, len(refined))) if refined else 0.0
    grade = "ALERT" if anomaly_score >= 0.6 else "OK"

    full_boxes = []
    for b in refined:
        full_boxes.append({
            "x": int(b["x"]),
            "y": int(b["y"]),
            "w": int(b["w"]),
            "h": int(b["h"]),
            "finalClass": str(b["label"]),
            "detConfidence": float(b.get("detConfidence", b["score"])),
            "isHot": bool(b.get("isHot", False)),
            "areaFrac": float(b.get("areaFrac", 0.0)),
        })

    result: Dict[str, Any] = {
        "image": str(candidate_img),
        "grade": grade,
        "anomaly_score": float(anomaly_score),
        "boxes": full_boxes,
        "rule_prob": float(rule_prob),
    }

    # --------------------- optional annotation ---------------------
    if save_annot:
        out = cv2.cvtColor(cand_raw, cv2.COLOR_RGB2BGR).copy()
        COLORS = {
            "Loose Joint -Faulty": (0, 0, 255),
            "Point Overload Faulty": (0, 128, 255),
            "Loose Joint -potential": (0, 255, 255),
            "Full wire overload": (255, 0, 0),
        }
        for b in refined:
            x, y, w, h = int(b["x"]), int(b["y"]), int(b["w"]), int(b["h"])
            color = COLORS.get(b["label"], (200, 200, 200))
            cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
            label = f"{b['label']} {float(b['score']):.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            y0 = max(0, y - 18)
            cv2.rectangle(out, (x, y0), (x + tw + 6, y0 + 18), color, -1)
            cv2.putText(out, label, (x + 3, y0 + 13), cv2.FONT_HERSHEY_SIMPLEX,
                        0.5, (255, 255, 255), 1, cv2.LINE_AA)
        Path(save_annot).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(save_annot), out)
        result["annotated"] = str(save_annot)

    return result
