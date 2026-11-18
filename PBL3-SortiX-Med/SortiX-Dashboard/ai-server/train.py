"""
SortiX-Med - Script huan luyen mo hinh YOLO11 voi 3 lop:
  0: syringe (Bom kim tiem)
  1: scissor (Keo phau thuat)
  2: cotton  (Bong gon / Gac y te)
"""

from pathlib import Path
import shutil
import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
RUN_NAME = "sortix_med_3class"


def sync_data_yaml_path(data_file: Path, dataset_dir: Path) -> None:
    """Dam bao dong `path:` trong data.yaml tro dung toi thu muc dataset hien tai."""
    lines = data_file.read_text(encoding="utf-8").splitlines()
    posix_path = dataset_dir.as_posix()
    updated = False
    new_lines: list[str] = []
    for line in lines:
        if line.strip().startswith("path:"):
            new_lines.append(f"path: {posix_path}")
            updated = True
        else:
            new_lines.append(line)
    if not updated:
        new_lines.insert(0, f"path: {posix_path}")
    data_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def main():
    data_file = BASE_DIR / "data.yaml"
    base_model_file = BASE_DIR / "yolo11n.pt"

    if not data_file.exists():
        raise FileNotFoundError(f"Khong tim thay file data.yaml: {data_file}")

    if not DATASET_DIR.exists():
        raise FileNotFoundError(
            f"Khong tim thay thu muc dataset: {DATASET_DIR}. "
            "Hay chay prepare_dataset.py truoc."
        )

    if not base_model_file.exists():
        raise FileNotFoundError(f"Khong tim thay file base model yolo11n.pt: {base_model_file}")

    # Dong bo duong dan dataset theo vi tri thu muc hien tai va xoa cache cu neu co
    sync_data_yaml_path(data_file, DATASET_DIR)
    for cache_file in DATASET_DIR.rglob("*.cache"):
        cache_file.unlink(missing_ok=True)

    device = 0 if torch.cuda.is_available() else "cpu"
    if torch.cuda.is_available():
        print(f"[✓] Su dung GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("[!] Khong tim thay GPU CUDA, chuyen sang huan luyen bang CPU.")

    print(f"[*] File cau hinh dataset: {data_file}")
    print(f"[*] Thu muc dataset: {DATASET_DIR}")
    print(f"[*] Base model: {base_model_file}")

    # Khoi tao model tu pretrained yolo11n.pt
    model = YOLO(str(base_model_file))

    # Huan luyen model 3 lop SortiX-Med (syringe, scissor, cotton)
    model.train(
        data=str(data_file),
        epochs=80,
        imgsz=640,
        batch=8,
        device=device,
        workers=2,
        patience=20,
        project=str(BASE_DIR / "runs"),
        name=RUN_NAME,
        exist_ok=True,
    )

    best_weight = BASE_DIR / "runs" / RUN_NAME / "weights" / "best.pt"
    deploy_weight = BASE_DIR / "weights" / "best.pt"
    if best_weight.exists():
        deploy_weight.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best_weight, deploy_weight)

    print("\n" + "=" * 65)
    print(" [✓] HUAN LUYEN HOAN TAT!")
    print(f" [*] File trong so trong runs: {best_weight}")
    print(f" [*] Da cap nhat trong so deploy: {deploy_weight}")
    print("=" * 65)


if __name__ == "__main__":
    main()
