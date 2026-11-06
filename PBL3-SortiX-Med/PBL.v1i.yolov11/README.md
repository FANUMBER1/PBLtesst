# Trạm Thị Giác Máy Tính AI YOLO11 (Edge AI Computer Vision Station)
### Phân Hệ Nhận Diện Dụng Cụ Y Tế Tự Động (PBL3 SortiX-Med)

> [!IMPORTANT]
> **THÔNG BÁO VỀ TẬP DỮ LIỆU HIỆN TẠI (PILOT / TRIAL DATASET):**  
> Dữ liệu và hình ảnh chứa trong thư mục `PBL.v1i.yolov11` hiện tại là **bộ dữ liệu thử nghiệm nội bộ (Pilot / Sandbox Trial Dataset)** phục vụ mục đích tập dượt quy trình huấn luyện mô hình, kiểm thử script (`test_yolo.py`), đánh giá tốc độ suy luận (FPS) và kiểm chứng luồng truyền thông MQTT hai chiều với vi điều khiển ESP32-C5 và Dashboard.  
> **ĐÂY CHƯA PHẢI LÀ BỘ MẪU VẬT CHÍNH THỨC CỦA ĐỀ TÀI.** Bộ dữ liệu mẫu vật dụng cụ y tế thực tế chính thức (với đầy đủ 4 nhóm: Bơm tiêm / Dao mổ, Kẹp Pean, Kéo mổ, Ống nghiệm) sẽ được thu thập, chụp mẫu buồng sáng và gán nhãn chuẩn hóa ở giai đoạn nghiệm thu tiếp theo.

---

## 1. Giới Thiệu Phân Hệ

Thư mục `PBL.v1i.yolov11` chứa môi trường thực nghiệm thị giác máy tính của dự án **SortiX-Med**:
- Thu nhận luồng hình ảnh thời gian thực từ Webcam USB 2K đặt phía trên băng chuyền tại khu vực buồng quét chiếu sáng (Cảm biến IR S1 và LDR).
- Ứng dụng mô hình mạng nơ-ron thế hệ mới **Ultralytics YOLO11** (với các khối kiến trúc tối ưu C3k2, SPPF và C2PSA) cho tốc độ suy luận cực nhanh và độ chính xác cao trên thiết bị biên hoặc CPU/GPU máy tính trạm.
- Đóng gói kết quả nhận diện và gửi theo thời gian thực tới vi điều khiển **ESP32-C5** và **SortiX-Dashboard** thông qua giao thức MQTT topic `sorter/sorter_01/vision`.

---

## 2. Cấu Trúc Thư Mục Phân Hệ

```text
PBL.v1i.yolov11/
├── data.yaml                           # File cấu hình đường dẫn train/val/test và danh sách nhãn thử nghiệm
├── README.md                           # Sổ tay hướng dẫn chi tiết trạm thị giác máy tính
├── README.roboflow.txt                 # Thông tin xuất xứ và metadata xuất từ Roboflow (Sandbox)
├── test_yolo.py                        # Script Python đa năng (Train, Val, Predict, Real-time Webcam)
├── yolo11n.pt                          # Trọng số mô hình cơ sở YOLO11 Nano (Pre-trained)
├── train/                              # Tập dữ liệu huấn luyện thử nghiệm (Images & Labels)
│   ├── images/
│   └── labels/
├── valid/                              # Tập dữ liệu kiểm định tham số thử nghiệm (Validation split)
│   ├── images/
│   └── labels/
├── test/                               # Tập dữ liệu kiểm thử độc lập (Test split)
│   ├── images/
│   └── labels/
└── runs/                               # Kết quả sau khi huấn luyện và kiểm thử
    ├── train_pbl/                      # Trọng số tối ưu best.pt, last.pt, đồ thị loss & PR curve
    └── predict_test/                   # Hình ảnh kết quả dự đoán có gắn Bounding Box và nhãn
```

---

## 3. Quy Chuẩn Nhãn Thử Nghiệm vs. Nhãn Đề Tài Chính Thức

### 3.1. Nhãn Thử Nghiệm Hiện Tại (Pilot Trial Labels trong `data.yaml`)
Để phục vụ tập dượt train mô hình, dữ liệu hiện tại chia thành **2 lớp mẫu vật thử nghiệm**:

| Nhãn mô hình (`class`) | Ý nghĩa thử nghiệm | Khay đích mô phỏng | Cơ cấu chấp hành |
|:---:|---|:---:|---|
| **`HH`** | Mẫu vật phân loại 1 (Hư Hỏng / Bơm kim tiêm / Sắc nhọn) | **Khay 1** (Sharps Waste) | Kích hoạt **Servo 1** (GPIO6) gạt vào khay |
| **`T`** | Mẫu vật phân loại 2 (Tiêu chuẩn / Kẹp Pean, Kéo mổ) | **Khay 2** (Autoclave) | Kích hoạt **Servo 2** (GPIO7) gạt vào khay |
| *Không nhận diện* / *Confidence < 60%* | Phôi không xác định / Lỗi nhận diện | **Khay 3** (General Supplies) | Chạy thẳng cuối băng tải (Không kích servo) |

### 3.2. Lộ Trình Cập Nhật Bộ Dữ Liệu Chính Thức Của Đề Tài
Khi thu thập đầy đủ mẫu vật y tế thực tế tại phòng thực hành/bệnh viện, `data.yaml` sẽ được nâng cấp lên 4 nhóm nhãn chuẩn y sinh:
1. `med_syringe`: Bơm kim tiêm y tế, dao mổ, lưỡi trích (Vàng y tế `#EAB308` -> Khay 1).
2. `med_forceps`: Kẹp phẫu thuật Pean (Xanh dương y tế `#0284C7` -> Khay 2).
3. `med_scissors`: Kéo phẫu thuật tiệt trùng (Xanh tím tiệt trùng `#6366F1` -> Khay 2).
4. `med_vial`: Lọ thuốc, ống nghiệm, chai truyền (Xanh ngọc Emerald `#10B981` -> Khay 3).

---

## 4. Hướng Dẫn Cài Đặt & Môi Trường Chạy

### 4.1 Yêu Cầu Hệ Thống
- Python 3.10 trở lên.
- Card đồ họa NVIDIA GPU (tùy chọn, tự động nhận diện CUDA nếu có; nếu không có sẽ tự động chạy trên CPU).
- Webcam USB chuẩn UVC (cắm vào cổng USB máy tính).

### 4.2 Cài Đặt Thư Viện Phụ Thuộc
```bash
pip install ultralytics torch torchvision opencv-python paho-mqtt
```

---

## 5. Hướng Dẫn Sử Dụng Script `test_yolo.py`

Script `test_yolo.py` được thiết kế linh hoạt hỗ trợ cả menu tương tác trực quan hoặc dòng lệnh CLI:

### Cách 1: Chạy Menu Tương Tác (Interactive Menu)
```bash
python test_yolo.py
```
Giao diện sẽ hiển thị:
```text
=================================================================
   HỆ THỐNG KIỂM THỬ THỊ GIÁC MÁY TÍNH YOLO11 (PBL3 SORTIX-MED)
=================================================================
  Phần cứng: GPU (NVIDIA GeForce RTX ...) hoặc CPU
  Mô hình hiện tại: Mô hình đã train riêng (best.pt - 2 nhãn: HH, T)
-----------------------------------------------------------------
  [1] Train mô hình mới (30 epochs, học 2 nhãn 'HH' và 'T')
  [2] Test dự đoán trên thư mục test/images (Lưu ảnh kết quả)
  [3] Đánh giá độ chính xác mô hình trên tập test (mAP / Val)
  [4] Chạy nhận diện trực tiếp qua Webcam (Real-time Vision)
  [0] Thoát
=================================================================
```

### Cách 2: Chạy Dòng Lệnh Trực Tiếp (CLI Mode)

#### 1. Huấn luyện mô hình thử nghiệm (Training):
```bash
python test_yolo.py --mode train --epochs 30
```
- Trọng số tối ưu sau khi train sẽ tự động được lưu tại: `runs/train_pbl/weights/best.pt`.

#### 2. Đánh giá chất lượng mô hình trên tập test (Validation):
```bash
python test_yolo.py --mode val
```
- Xuất các chỉ số độ chính xác: mAP50, mAP50-95, Precision, Recall.

#### 3. Chạy dự đoán trên tập ảnh test (Prediction):
```bash
python test_yolo.py --mode predict --source test/images --conf 0.25
```
- Kết quả ảnh có bounding box được lưu tại thư mục: `runs/predict_test/`.

#### 4. Nhận diện trực tiếp qua Webcam (Real-time Camera AI):
```bash
python test_yolo.py --mode webcam --source 0 --conf 0.3
```
- Nhấn phím `q` trên cửa sổ video để kết thúc phiên nhận diện.

---

## 6. Giao Thức Tích Hợp MQTT Với ESP32-C5 & Dashboard

Khi trạm AI phát hiện vật thể, kết quả được publish trực tiếp lên MQTT broker:

- **Topic MQTT:** `sorter/sorter_01/vision`
- **Tần suất:** Theo từng vật thể kích hoạt (Triggered on-demand khi phôi đi qua cảm biến S1).
- **Cấu trúc JSON Payload:**
```json
{
  "item_id": "MED-1792815706",
  "brand": "med_syringe",
  "label": "HH",
  "confidence": 0.94,
  "timestamp": "2026-10-24T11:20:52.000Z"
}
```

- **Quy trình ghép cặp tại ESP32-C5:**
  1. Cảm biến IR S1 (GPIO0) ngắt chốt xung Encoder đưa phôi vào FIFO Tracking Queue.
  2. Gói tin MQTT Vision nhận được sẽ được ghép cặp với phôi đứng đầu hàng đợi FIFO.
  3. Firmware căn cứ vào `brand` / `label` và giá trị `confidence` để quyết định kích hoạt Servo 1 (GPIO6), Servo 2 (GPIO7) hoặc thả trôi về Khay 3.
