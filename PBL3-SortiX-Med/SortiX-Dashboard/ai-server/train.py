"""
SortiX-Med - Script huấn luyện mô hình YOLO với bộ dataset của dự án (HH và T)
"""

from pathlib import Path
import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent


def main():
    data_file = BASE_DIR / "data.yaml"
    base_model_file = BASE_DIR / "yolo11n.pt"

    if not data_file.exists():
        raise FileNotFoundError(f"Khong tim thay file data.yaml: {data_file}")

    if not base_model_file.exists():
        raise FileNotFoundError(f"Khong tim thay file base model yolo11n.pt: {base_model_file}")

    device = 0 if torch.cuda.is_available() else "cpu"
    if torch.cuda.is_available():
        print(f"[✓] Sử dụng GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("[!] Không tìm thấy GPU CUDA, chuyển sang huấn luyện bằng CPU.")

    print(f"[*] File cấu hình dataset: {data_file}")
    print(f"[*] Base model: {base_model_file}")

    # Khởi tạo model từ pretrained yolo11n.pt
    model = YOLO(str(base_model_file))

    # Huấn luyện model trên dataset SortiX-Med
    results = model.train(
        data=str(data_file),
        epochs=50,          # 50 epochs là tối ưu cho tập dữ liệu vừa phải
        imgsz=640,
        batch=8,            # Batch 8 chạy mượt trên RTX 3050 4GB/6GB
        device=device,
        workers=2,          # workers=2 ổn định nhất trên môi trường Windows
        patience=15,        # Dừng sớm nếu không cải thiện sau 15 epochs
        project=str(BASE_DIR / "runs"),
        name="sortix_HH_T",
        exist_ok=True,      # Ghi đè hoặc tiếp tục vào thư mục sortix_HH_T
    )

    best_weight = BASE_DIR / "runs" / "sortix_HH_T" / "weights" / "best.pt"
    print("\n" + "=" * 65)
    print(" [✓] HUẤN LUYỆN HOÀN TẤT!")
    print(f" [*] File trọng số tốt nhất được lưu tại: {best_weight}")
    print("=" * 65)


if __name__ == "__main__":
    main()
