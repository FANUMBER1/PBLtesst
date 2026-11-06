"""
Script Kiểm Thử & Huấn Luyện YOLO11 Cho Dự Án PBL3 (SortiX-Med)
Hỗ trợ:
  1. Train / Fine-tune mô hình YOLO11 với dataset (data.yaml: 2 nhãn HH, T)
  2. Đánh giá chất lượng mô hình trên tập test (mAP, Precision, Recall)
  3. Test dự đoán trên thư mục ảnh test/images (Lưu ảnh kết quả có bounding box)
  4. Test nhận diện thời gian thực từ Webcam (dành cho trạm camera AI)
"""

import os
import sys
import argparse
import torch
from ultralytics import YOLO

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_YAML = os.path.join(CURRENT_DIR, "data.yaml")
TEST_IMAGES_DIR = os.path.join(CURRENT_DIR, "test", "images")
DEFAULT_WEIGHTS = os.path.join(CURRENT_DIR, "yolo11n.pt")
TRAINED_WEIGHTS = os.path.join(CURRENT_DIR, "runs", "train_pbl", "weights", "best.pt")


def get_device():
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        return "0", f"GPU ({gpu_name})"
    return "cpu", "CPU"


def get_active_model_path():
    """Ưu tiên dùng model đã train (best.pt), nếu chưa có thì dùng yolo11n.pt gốc."""
    if os.path.exists(TRAINED_WEIGHTS):
        return TRAINED_WEIGHTS, "Mô hình đã train riêng (best.pt - 2 nhãn: HH, T)"
    return DEFAULT_WEIGHTS, "Mô hình gốc ban đầu (yolo11n.pt - COCO 80 nhãn)"


def train_model(epochs=30, batch=8, imgsz=512):
    """Huấn luyện fine-tune YOLO11 với dataset 2 nhãn HH & T."""
    device_id, device_name = get_device()
    print("=" * 60)
    print(f"🚀 BẮT ĐẦU HUẤN LUYỆN YOLO11 CHO PBL3")
    print(f"Thiết bị: {device_name}")
    print(f"Dataset config: {DATA_YAML}")
    print(f"Epochs: {epochs} | Batch size: {batch} | Image size: {imgsz}")
    print("=" * 60)

    model = YOLO(DEFAULT_WEIGHTS)
    results = model.train(
        data=DATA_YAML,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device=device_id,
        project=os.path.join(CURRENT_DIR, "runs"),
        name="train_pbl",
        exist_ok=True,
        save=True,
        plots=True,
    )
    print("\n✅ Huấn luyện hoàn tất!")
    print(f"Trọng số tối ưu đã được lưu tại: {TRAINED_WEIGHTS}")
    return results


def validate_model(weights=None):
    """Đánh giá mô hình trên tập kiểm thử (test split)."""
    if weights is None:
        weights, desc = get_active_model_path()
    else:
        desc = weights

    print("=" * 60)
    print(f"📊 ĐÁNH GIÁ MÔ HÌNH TRÊN TẬP TEST")
    print(f"Trọng số: {weights} ({desc})")
    print("=" * 60)

    model = YOLO(weights)
    metrics = model.val(
        data=DATA_YAML,
        split="test",
        project=os.path.join(CURRENT_DIR, "runs"),
        name="val_test",
        exist_ok=True,
    )
    print("\n✅ Kết quả đánh giá:")
    print(f"- mAP50: {metrics.box.map50:.4f}")
    print(f"- mAP50-95: {metrics.box.map:.4f}")
    return metrics


def predict_images(source=None, weights=None, conf=0.25):
    """Chạy suy luận dự đoán trên ảnh hoặc thư mục ảnh."""
    if source is None:
        source = TEST_IMAGES_DIR
    if weights is None:
        weights, desc = get_active_model_path()
    else:
        desc = weights

    print("=" * 60)
    print(f"🔍 DỰ ĐOÁN HÌNH ẢNH")
    print(f"Nguồn ảnh: {source}")
    print(f"Trọng số: {weights} ({desc})")
    print(f"Ngưỡng tin cậy (Confidence): {conf}")
    print("=" * 60)

    model = YOLO(weights)
    save_dir = os.path.join(CURRENT_DIR, "runs", "predict_test")
    results = model.predict(
        source=source,
        conf=conf,
        save=True,
        project=os.path.join(CURRENT_DIR, "runs"),
        name="predict_test",
        exist_ok=True,
    )

    print(f"\n✅ Đã xử lý {len(results)} ảnh.")
    print(f"Ảnh kết quả (kèm bounding box) được lưu tại: {save_dir}")
    for idx, r in enumerate(results):
        im_name = os.path.basename(r.path)
        boxes = r.boxes
        labels = [f"{model.names[int(c)]}: {float(conf_score):.2f}" for c, conf_score in zip(boxes.cls, boxes.conf)]
        print(f"  [{idx+1}] {im_name}: {', '.join(labels) if labels else 'Không phát hiện vật thể'}")


def predict_webcam(weights=None, cam_id=0, conf=0.3):
    """Dự đoán thời gian thực qua webcam."""
    if weights is None:
        weights, desc = get_active_model_path()
    else:
        desc = weights

    print("=" * 60)
    print(f"📹 CHẠY WEBCAM NHẬN DIỆN THỜI GIAN THỰC")
    print(f"Camera ID: {cam_id}")
    print(f"Trọng số: {weights} ({desc})")
    print("Nhấn phím 'q' trên cửa sổ hiển thị để thoát.")
    print("=" * 60)

    model = YOLO(weights)
    model.predict(source=cam_id, show=True, conf=conf)


def interactive_menu():
    _, dev_desc = get_device()
    model_path, model_desc = get_active_model_path()

    print("\n" + "=" * 65)
    print("   HỆ THỐNG KIỂM THỬ THỊ GIÁC MÁY TÍNH YOLO11 (PBL3 SORTIX-MED)")
    print("=" * 65)
    print(f"  Phần cứng: {dev_desc}")
    print(f"  Mô hình hiện tại: {model_desc}")
    print("-" * 65)
    print("  [1] Train mô hình mới (30 epochs, học 2 nhãn 'HH' và 'T')")
    print("  [2] Test dự đoán trên thư mục test/images (Lưu ảnh kết quả)")
    print("  [3] Đánh giá độ chính xác mô hình trên tập test (mAP / Val)")
    print("  [4] Chạy nhận diện trực tiếp qua Webcam (Real-time Vision)")
    print("  [0] Thoát")
    print("=" * 65)

    choice = input("Nhập lựa chọn của bạn [0-4]: ").strip()
    if choice == "1":
        ep = input("Nhập số epochs (mặc định 30): ").strip()
        epochs = int(ep) if ep.isdigit() else 30
        train_model(epochs=epochs)
    elif choice == "2":
        predict_images()
    elif choice == "3":
        validate_model()
    elif choice == "4":
        predict_webcam()
    elif choice == "0":
        print("Tạm biệt!")
        sys.exit(0)
    else:
        print("Lựa chọn không hợp lệ.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PBL3 YOLO11 Helper")
    parser.add_argument("--mode", choices=["train", "predict", "val", "webcam"], help="Chế độ chạy")
    parser.add_argument("--epochs", type=int, default=30, help="Số epochs khi train")
    parser.add_argument("--source", type=str, default=None, help="Đường dẫn ảnh/folder/webcam")
    parser.add_argument("--weights", type=str, default=None, help="Đường dẫn file .pt")
    parser.add_argument("--conf", type=float, default=0.25, help="Ngưỡng confidence")

    args = parser.parse_args()

    if args.mode == "train":
        train_model(epochs=args.epochs)
    elif args.mode == "predict":
        predict_images(source=args.source, weights=args.weights, conf=args.conf)
    elif args.mode == "val":
        validate_model(weights=args.weights)
    elif args.mode == "webcam":
        cam = int(args.source) if args.source and args.source.isdigit() else 0
        predict_webcam(weights=args.weights, cam_id=cam, conf=args.conf)
    else:
        interactive_menu()
