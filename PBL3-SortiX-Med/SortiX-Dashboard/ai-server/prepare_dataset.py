"""
SortiX-Med - Script gop 3 bo dataset tu D:\\DATASET thanh 1 dataset YOLO multi-class.

Cac lop sau khi gop:
  0: syringe (tu detection tube 1.v1i.yolov11)
  1: scissor (tu proj1.v1i.yolov11)
  2: cotton  (tu syringe-cotton.v1i.yolov11)
"""

from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parent
TARGET_DATASET_DIR = BASE_DIR / "dataset"

SOURCE_DATASETS = [
    {
        "path": Path(r"D:\DATASET\detection tube 1.v1i.yolov11"),
        "class_id": 0,
        "prefix": "syringe",
    },
    {
        "path": Path(r"D:\DATASET\proj1.v1i.yolov11"),
        "class_id": 1,
        "prefix": "scissor",
    },
    {
        "path": Path(r"D:\DATASET\syringe-cotton.v1i.yolov11"),
        "class_id": 2,
        "prefix": "cotton",
    },
]

SPLITS = ("train", "valid", "test")


def _remap_label_lines(src_label: Path, target_class_id: int) -> str:
    """Doc file nhan YOLO va thay class_id bang target_class_id."""
    if not src_label.exists():
        return ""

    remapped_lines: list[str] = []
    for raw_line in src_label.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) == 2:
            remapped_lines.append(f"{target_class_id} {parts[1]}")
    return "\n".join(remapped_lines) + ("\n" if remapped_lines else "")


def merge_datasets() -> None:
    """Xoa dataset cu va gop 3 bo dataset moi vao ai-server/dataset."""
    for src in SOURCE_DATASETS:
        if not src["path"].exists():
            raise FileNotFoundError(f"Khong tim thay thu muc nguon: {src['path']}")

    if TARGET_DATASET_DIR.exists():
        shutil.rmtree(TARGET_DATASET_DIR)

    for split in SPLITS:
        (TARGET_DATASET_DIR / split / "images").mkdir(parents=True, exist_ok=True)
        (TARGET_DATASET_DIR / split / "labels").mkdir(parents=True, exist_ok=True)

    summary = {split: {"images": 0, "boxes": 0} for split in SPLITS}

    for src in SOURCE_DATASETS:
        src_root: Path = src["path"]
        class_id: int = src["class_id"]
        prefix: str = src["prefix"]

        for split in SPLITS:
            src_img_dir = src_root / split / "images"
            src_lbl_dir = src_root / split / "labels"
            dst_img_dir = TARGET_DATASET_DIR / split / "images"
            dst_lbl_dir = TARGET_DATASET_DIR / split / "labels"

            if not src_img_dir.exists():
                continue

            for img_path in src_img_dir.iterdir():
                if not img_path.is_file():
                    continue
                new_stem = f"{prefix}_{img_path.stem}"
                shutil.copy2(img_path, dst_img_dir / f"{new_stem}{img_path.suffix}")

                remapped = _remap_label_lines(src_lbl_dir / f"{img_path.stem}.txt", class_id)
                (dst_lbl_dir / f"{new_stem}.txt").write_text(remapped, encoding="utf-8")

                summary[split]["images"] += 1
                summary[split]["boxes"] += len([ln for ln in remapped.splitlines() if ln.strip()])

    print("[OK] Da gop 3 bo dataset vao:", TARGET_DATASET_DIR)
    for split in SPLITS:
        print(f"  - {split}: {summary[split]['images']} anh, {summary[split]['boxes']} boxes")


if __name__ == "__main__":
    merge_datasets()
