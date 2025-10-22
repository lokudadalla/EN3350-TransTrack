# ai_logic/finetune.py
from __future__ import annotations
import argparse, json, random, shutil, time
from pathlib import Path
from typing import Dict, Any, List
import cv2
from ultralytics import YOLO

# ---- Paths / defaults (adjust if you need) ----
ROOT = Path(__file__).resolve().parent
# Fine-tune FROM this model (use your deployed one); or set to "yolo11s.pt"
BASE_WEIGHTS = ROOT / "best.pt"

# Where we put the final weight the frontend can choose later
BEST2_OUT = ROOT.parent / "tf_model" / "weights" / "updated_defect" / "best2.pt"

# Where we stage the ephemeral YOLO dataset
DATASET_ROOT_BASE = ROOT.parent / "DatasetUpdated"
RUNS_DIR = ROOT.parent / "runs"

# YOLO classes in the exact order used by your project
CLASSES = [
    "Loose Joint -Faulty",
    "Point Overload Faulty",
    "Loose Joint -potential",
    "Full wire overload",
]

VAL_FRACTION = 0.15  # 15% validation from the 50-sample batch

def _cls_id(label: str) -> int:
    try:
        return CLASSES.index(label)
    except ValueError:
        # Fallback to a sensible default class
        return CLASSES.index("Point Overload Faulty")

def _read_batch(batch_path: Path) -> List[Dict[str, Any]]:
    txt = batch_path.read_text(encoding="utf-8").strip()
    if not txt:
        return []
    # Try JSON array first
    try:
        data = json.loads(txt)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    # Fallback: JSONL (one JSON object per line)
    items = []
    for line in txt.splitlines():
        line = line.strip()
        if not line:
            continue
        items.append(json.loads(line))
    return items

def _materialize_dataset(items: List[Dict[str, Any]], dataset_root: Path) -> Path:
    # Clear and rebuild dataset
    if dataset_root.exists():
        shutil.rmtree(dataset_root)
    (dataset_root / "images" / "train").mkdir(parents=True, exist_ok=True)
    (dataset_root / "images" / "val").mkdir(parents=True, exist_ok=True)
    (dataset_root / "labels" / "train").mkdir(parents=True, exist_ok=True)
    (dataset_root / "labels" / "val").mkdir(parents=True, exist_ok=True)

    # Shuffle + split
    random.shuffle(items)
    n_total = len(items)
    n_val = max(1, int(VAL_FRACTION * n_total))
    val_items = items[:n_val]
    train_items = items[n_val:]

    def _write_one(item: Dict[str, Any], split: str):
        img_src = Path(item["image_path"])
        img = cv2.imread(str(img_src), cv2.IMREAD_COLOR)
        if img is None:
            return
        H, W = img.shape[:2]
        stem = img_src.stem

        # Save a local copy to keep dataset self-contained
        dst_img = dataset_root / "images" / split / f"{stem}.jpg"
        cv2.imwrite(str(dst_img), img)

        # YOLO label file
        txt = dataset_root / "labels" / split / f"{stem}.txt"
        lines = []
        for b in item.get("boxes", []):
            x, y, w, h = float(b["x"]), float(b["y"]), float(b["w"]), float(b["h"])
            cx = (x + w / 2.0) / W
            cy = (y + h / 2.0) / H
            nw = w / W
            nh = h / H
            c  = _cls_id(b["label"])
            cx = min(max(cx, 0.0), 1.0)
            cy = min(max(cy, 0.0), 1.0)
            nw = min(max(nw, 0.0), 1.0)
            nh = min(max(nh, 0.0), 1.0)
            lines.append(f"{c} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
        txt.write_text("\n".join(lines), encoding="utf-8")

    for it in train_items: _write_one(it, "train")
    for it in val_items:   _write_one(it, "val")

    # data.yaml
    data_yaml = dataset_root / "data.yaml"
    data_yaml.write_text(
        "\n".join([
            f"path: {dataset_root.as_posix()}",
            "train: images/train",
            "val: images/val",
            "names:",
            *[f"  {i}: {name}" for i, name in enumerate(CLASSES)],
        ]),
        encoding="utf-8"
    )
    return data_yaml

def main():
    ap = argparse.ArgumentParser(description="Fine-tune YOLO from a 50-sample batch")
    ap.add_argument("--batch", required=True, help="Path to JSON/JSONL file with samples")
    ap.add_argument("--from-weights", default=str(BASE_WEIGHTS), help="Init weights (default: ai_logic/best.pt)")
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--device", default=0)  # GPU by default
    ap.add_argument("--runs", default=str(RUNS_DIR))
    ap.add_argument("--out", default=str(BEST2_OUT))
    ap.add_argument("--lock", default="", help="Optional lock file path to remove on exit")
    args = ap.parse_args()

    batch_file = Path(args.batch)
    samples = _read_batch(batch_file)
    if not samples:
        raise SystemExit("No samples found in the batch file.")

    # Make a unique dataset folder for this run
    dataset_root = DATASET_ROOT_BASE / f"yolo_incremental_{int(time.time())}"
    data_yaml = _materialize_dataset(samples, dataset_root)

    # Train
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    run_name = f"batch_ft_{int(time.time())}"
    model = YOLO(args.from_weights)

    model.train(
        data=str(data_yaml),
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=-1,
        device=args.device,
        workers=4,
        project=args.runs,
        name=run_name,

        # Thermal-friendly augs
        hsv_h=0.0, hsv_s=0.10, hsv_v=0.10,
        flipud=0.0, fliplr=0.5,
        mosaic=0.0, mixup=0.0, copy_paste=0.0,
        perspective=0.000, scale=0.10, shear=0.0, translate=0.05,

        # Optim/schedule
        lr0=0.005, lrf=0.01, warmup_epochs=2,
        patience=10,
        seed=42
    )

    # Copy best.pt -> best2.pt and also keep a timestamped backup
    run_dir = Path(args.runs) / "detect" / run_name
    best_pt = run_dir / "weights" / "best.pt"
    if not best_pt.exists():
        raise SystemExit("Training finished, but best.pt not found.")

    shutil.copy2(best_pt, out_path)
    backup = out_path.with_name(f"updated_{int(time.time())}.pt")
    shutil.copy2(best_pt, backup)
    print(f"[OK] Saved: {out_path} and {backup}")

    # Optional: clear lock so the trigger can run again
    if args.lock:
        Path(args.lock).unlink(missing_ok=True)

if __name__ == "__main__":
    main()
