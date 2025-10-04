from ultralytics import YOLO
from pathlib import Path
import numpy as np, cv2, json
from math import exp

def infer_thermal(
    candidate_img: str,
    weights: str,
    cfg_path: str,
    baseline_img: str | None = None,
    save_annot: str | None = None,
    device: int = 0,
    imgsz: int = 640,
    web_payload: bool = False,
    half: bool = True,
):
    CFG = json.load(open(cfg_path, "r"))

    def cfgv(path, default):
        d = CFG
        for k in path.split("."):
            if not isinstance(d, dict) or k not in d:
                return default
            d = d[k]
        return d

    # --- utils ---
    def load_rgb(path):
        bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if bgr is None: raise FileNotFoundError(path)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    def normalize_palette(rgb):
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        h,s,v = cv2.split(hsv)
        v = cv2.equalizeHist(v)  # contrast-normalize V only
        return cv2.cvtColor(cv2.merge([h,s,v]), cv2.COLOR_HSV2RGB)

    def resize_to_match(a, b):
        H, W = a.shape[:2]
        return cv2.resize(b, (W, H), interpolation=cv2.INTER_AREA)

    def register_affine(base_rgb, cand_rgb):
        b_gray = cv2.cvtColor(base_rgb, cv2.COLOR_RGB2GRAY)
        c_gray = cv2.cvtColor(cand_rgb, cv2.COLOR_RGB2GRAY)
        warp = np.eye(2,3, dtype=np.float32)
        try:
            _, warp = cv2.findTransformECC(
                b_gray, c_gray, warp, cv2.MOTION_AFFINE,
                (cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT, 100, 1e-6)
            )
            H,W = b_gray.shape
            return cv2.warpAffine(cand_rgb, warp, (W,H), flags=cv2.INTER_LINEAR+cv2.WARP_INVERSE_MAP)
        except cv2.error:
            return cand_rgb

    def rgb_to_hsv01(img_rgb):
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[...,0] /= 179.0
        hsv[...,1] /= 255.0
        hsv[...,2] /= 255.0
        return hsv

    # --- per-box classification with warm & hot masks ---
    def classify_box(hsvC, vB, xywh):
        x,y,w,h = map(int, xywh)
        H, W = hsvC.shape[:2]
        x = max(0, min(x, W-1)); y = max(0, min(y, H-1))
        w = max(1, min(w, W-x)); h = max(1, min(h, H-y))

        roi = hsvC[y:y+h, x:x+w]
        hC, sC, vC_roi = roi[...,0], roi[...,1], roi[...,2]

        warm_h = (hC <= 0.17) | (hC >= 0.95)
        warm_s = sC >= cfgv("color.sat_min", 0.35)
        warm_v = vC_roi >= cfgv("color.val_min", 0.50)

        if vB is None:
            vB_roi = np.zeros_like(vC_roi)
        else:
            vB_roi = vB[y:y+h, x:x+w]
        med_base = cv2.medianBlur((vB_roi*255).astype(np.uint8), 31)/255.0
        med_cand = cv2.medianBlur((vC_roi*255).astype(np.uint8), 31)/255.0
        dv = (vC_roi - med_base)
        dl = (vC_roi - med_cand)

        contrast_warm = (dv >= cfgv("color.dv_min", 0.12)) | (dl >= cfgv("color.dl_min", 0.08))
        warm = (warm_h & warm_s & warm_v & contrast_warm)

        # HOT (stricter)
        hot_s = sC >= cfgv("color_hot.sat_min_hot", 0.45)
        hot_v = vC_roi >= cfgv("color_hot.val_min_hot", 0.65)
        hot_contrast = (dv >= cfgv("color_hot.dv_min_hot", 0.18)) | (dl >= cfgv("color.dl_min", 0.08))
        hot = (warm_h & hot_s & hot_v & hot_contrast)

        warm_pix = int(warm.sum())
        hot_pix  = int(hot.sum())

        min_pix = max(4, int(cfgv("shape.min_area_frac", 0.001) * H * W))
        ok_warm = warm_pix >= min_pix
        ok_hot  = hot_pix  >= min_pix

        area_frac_warm = warm_pix / float(H*W)
        short = max(1, min(w,h)); long = max(w,h)
        aspect = long/short

        if area_frac_warm >= cfgv("shape.loose_area_frac", 0.10):
            rule_core = "loose_joint"
        elif aspect >= cfgv("shape.wire_aspect_min", 2.2) and area_frac_warm < cfgv("shape.wire_area_max", 0.25):
            rule_core = "wire_overload"
        else:
            rule_core = "point_overload"

        return ok_warm, ok_hot, rule_core, float(area_frac_warm), float(aspect)

    def final_name_from_rule(rule_core, is_hot):
        if rule_core == "wire_overload":
            return "Full wire overload"
        if rule_core == "loose_joint":
            return "Loose Joint -Faulty" if is_hot else "Loose Joint -potential"
        if rule_core == "point_overload":
            return "Point Overload Faulty" if is_hot else "Loose Joint -potential"
        return "normal"

    # --- global rule probe + box proposal (for fallback) ---
    def global_rule_probe(hsvC, vB):
        hC, sC, vC = hsvC[...,0], hsvC[...,1], hsvC[...,2]
        warm_h = (hC <= 0.17) | (hC >= 0.95)
        warm_s = sC >= cfgv("color.sat_min", 0.35)
        warm_v = vC >= cfgv("color.val_min", 0.50)

        med_cand = cv2.medianBlur((vC*255).astype(np.uint8), 31)/255.0
        if vB is None:
            dl = (vC - med_cand)
            contrast = (dl >= cfgv("color.dl_min", 0.08))
            dv_like = dl
        else:
            med_base = cv2.medianBlur((vB*255).astype(np.uint8), 31)/255.0
            dv = (vC - med_base)
            dl = (vC - med_cand)
            contrast = (dv >= cfgv("color.dv_min", 0.12)) | (dl >= cfgv("color.dl_min", 0.08))
            dv_like = np.maximum(0.0, dv)

        warm = (warm_h & warm_s & warm_v & contrast).astype(np.uint8)
        warm_frac = float(warm.mean())
        dv95 = float(np.quantile(dv_like.ravel(), 0.95))
        score = dv95 + 2.0*warm_frac
        prob = 1.0/(1.0 + exp(-score))
        return float(prob), warm

    def propose_boxes_from_warm(warm_mask):
        H, W = warm_mask.shape
        min_area = max(32, int(cfgv("shape.min_area_frac", 0.001) * H * W))
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
        wm = cv2.morphologyEx(warm_mask, cv2.MORPH_OPEN, k)
        num, labels, stats, _ = cv2.connectedComponentsWithStats(wm, 8)
        boxes = []
        for i in range(1, num):
            x,y,w,h,area = map(int, stats[i])
            if area >= min_area:
                boxes.append((x,y,w,h))
        return boxes

    CLASS_COLORS = {
        "Loose Joint -Faulty": (0, 0, 255),
        "Point Overload Faulty": (0, 128, 255),
        "Loose Joint -potential": (0, 255, 255),
        "Full wire overload": (255, 0, 0),
    }

    # --- Model + preprocessing ---
    model = YOLO(weights)
    cand_raw  = load_rgb(candidate_img)      # YOLO sees original colors
    cand_norm = normalize_palette(cand_raw)  # rules see normalized copy

    vB = None
    if baseline_img:
        base = normalize_palette(load_rgb(baseline_img))
        cand_norm = resize_to_match(base, cand_norm)
        cand_norm = register_affine(base, cand_norm)
        vB = rgb_to_hsv01(base)[...,2]

    hsvC = rgb_to_hsv01(cand_norm)

    # --- YOLO inference ---
    pred = model.predict(cand_raw, device=device, half=half, imgsz=imgsz, verbose=False)[0]

    refined = []
    if len(pred.boxes):
        xyxy = pred.boxes.xyxy.cpu().numpy()
        conf = pred.boxes.conf.cpu().numpy()
        for (x1,y1,x2,y2), cf in zip(xyxy, conf):
            if float(cf) < cfgv("yolo_min_conf", 0.20):
                continue
            x, y, w, h = int(x1), int(y1), int(x2-x1), int(y2-y1)
            ok_warm, ok_hot, rule_core, areaFrac, aspect = classify_box(hsvC, vB, (x,y,w,h))
            if not ok_warm:
                continue
            final_name = final_name_from_rule(rule_core, ok_hot)
            if final_name == "normal":
                continue
            refined.append({
                "x": x, "y": y, "w": w, "h": h,
                "detConfidence": float(cf),
                "ruleCore": rule_core,
                "isHot": bool(ok_hot),
                "finalClass": final_name,
                "areaFrac": float(areaFrac),
                "aspect": float(aspect),
            })

    # --- HYBRID FALLBACK (inside the function!) ---
    rule_prob_thr = cfgv("decision.rule_prob_thr", 0.40)
    use_rule_fallback = cfgv("decision.use_rule_only_fallback", True)
    rule_prob, warm_mask = global_rule_probe(hsvC, vB)

    if (len(refined) == 0) and use_rule_fallback and (rule_prob >= rule_prob_thr):
        for (x, y, w, h) in propose_boxes_from_warm(warm_mask):
            ok_warm, ok_hot, rule_core, areaFrac, aspect = classify_box(hsvC, vB, (x,y,w,h))
            if not ok_warm:
                continue
            if rule_core == "wire_overload":
                final_name = "Full wire overload"
            elif rule_core == "loose_joint":
                final_name = "Loose Joint -Faulty" if ok_hot else "Loose Joint -potential"
            else:
                final_name = "Point Overload Faulty" if ok_hot else "Loose Joint -potential"
            refined.append({
                "x": x, "y": y, "w": w, "h": h,
                "detConfidence": float(rule_prob),
                "ruleCore": rule_core,
                "isHot": bool(ok_hot),
                "finalClass": final_name,
                "areaFrac": float(areaFrac),
                "aspect": float(aspect),
            })

    # --- Image-level decision & score ---
    FAULTY = {"Loose Joint -Faulty", "Point Overload Faulty"}
    POT    = {"Loose Joint -potential", "Full wire overload"}

    has_faulty = any(b["finalClass"] in FAULTY for b in refined)
    has_pot    = any(b["finalClass"] in POT for b in refined)
    grade = "faulty" if has_faulty else ("potentially faulty" if has_pot else "normal")

    weights_for_score = {**{k:1.0 for k in FAULTY}, **{k:0.7 for k in POT}}
    score = max((weights_for_score[b["finalClass"]]*b["detConfidence"] for b in refined), default=0.0)

    full_result = {
        "image": str(candidate_img),
        "grade": grade,
        "anomaly_score": float(score),
        "boxes": refined,
        "rule_prob": float(rule_prob),
    }

    # --- build YOLO-normalized boxes for web ---
    H, W = cand_raw.shape[:2]

    def to_yolo_norm(b):
        x, y, w, h = b["x"], b["y"], b["w"], b["h"]
        cx = (x + w/2.0) / W
        cy = (y + h/2.0) / H
        ww = w / W
        hh = h / H
        # (optional) round for cleaner payloads
        return [round(cx, 6), round(cy, 6), round(ww, 6), round(hh, 6)]

    web_boxes = [
        {
            "class": b["finalClass"],
            "bbox_yolo": to_yolo_norm(b),     # [cx, cy, w, h] normalized
            "bbox_px":   [b["x"], b["y"], b["w"], b["h"]]  # keep pixels too if you want
        }
        for b in refined
    ]


    if web_payload:
        result = {
            "grade": grade,
            "anomaly_score": float(score),
            "boxes": web_boxes
        }
    else:
        result = full_result

    if save_annot:
        out = cv2.cvtColor(cand_raw, cv2.COLOR_RGB2BGR).copy()
        for b in refined:
            x,y,w,h = b["x"], b["y"], b["w"], b["h"]
            color = CLASS_COLORS.get(b["finalClass"], (200,200,200))
            cv2.rectangle(out, (x,y), (x+w, y+h), color, 2)
            label = f"{b['finalClass']} {b['detConfidence']:.2f}"
            (tw,th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(out, (x, y-18), (x+tw+6, y), color, -1)
            cv2.putText(out, label, (x+3, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1, cv2.LINE_AA)
        Path(save_annot).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(save_annot), out)
        result["annotated"] = str(save_annot)

    return result
