
import cv2
import torch
import time
import json
import os
from pathlib import Path
from ultralytics import YOLO
import paho.mqtt.client as mqtt_client

# ==========================================
# 1. CAU HINH SORTIX
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

# Camera iPhone qua DroidCam
CAMERA_INDEX = 1
CAMERA_BACKEND = cv2.CAP_MSMF

# Thong so YOLO
IMAGE_SIZE = 640
CONFIDENCE = 0.5

# ==========================================
# 2. CAU HINH MQTT
# ==========================================

# Doc tu bien moi truong, fallback ve gia tri mac dinh
MQTT_BROKER   = os.environ.get("MQTT_BROKER_URL", "mqtt://broker.emqx.io:1883")
MQTT_USERNAME = os.environ.get("MQTT_USERNAME", "mqtx_sortix_demo01")
MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD", "")

# Parse host / port tu URL kieu "mqtt://host:port"
def _parse_broker(url: str):
    url = url.strip()
    for prefix in ("mqtts://", "mqtt://"):
        if url.startswith(prefix):
            url = url[len(prefix):]
    if ":" in url:
        host, port_str = url.rsplit(":", 1)
        return host, int(port_str)
    return url, 1883

MQTT_HOST, MQTT_PORT = _parse_broker(MQTT_BROKER)

# Topics (khop voi shared/constants/index.ts)
TOPIC_VISION   = "sorter/sorter_01/vision"
TOPIC_CONTROL  = "sorter/sorter_01/control"
TOPIC_STATUS   = "sorter/sorter_01/status"

# Khoang thoi gian toi thieu giua hai lan publish (giay)
PUBLISH_INTERVAL = 0.5

# ==========================================
# 3. TIM FILE BEST.PT
# ==========================================

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "weights" / "best.pt"

CAMERA_INDEX = 1
CAMERA_BACKEND = cv2.CAP_MSMF

if not MODEL_PATH.exists():

    models = [
        p for p in BASE_DIR.rglob("best.pt")
        if ".venv" not in p.parts
    ]

    if len(models) == 1:
        MODEL_PATH = models[0]

    elif len(models) > 1:
        print("Tim thay nhieu file best.pt:")
        for i, path in enumerate(models):
            print(f"{i + 1}. {path}")

        raise RuntimeError(
            "Co nhieu model best.pt. "
            "Hay chon dung model trong MODEL_PATH."
        )

    else:
        raise FileNotFoundError(
            "Khong tim thay best.pt trong ai-server!"
        )

print("\n================================")
print("SORTIX - YOLO11 IPHONE CAMERA")
print("================================")

print("Model:", MODEL_PATH)

# ==========================================
# 4. KIEM TRA GPU
# ==========================================

if torch.cuda.is_available():

    DEVICE = 0

    print("GPU:", torch.cuda.get_device_name(0))
    print("CUDA: AVAILABLE")

else:

    DEVICE = "cpu"

    print("GPU khong kha dung!")
    print("Chuyen sang CPU.")

# ==========================================
# 5. KHOI TAO MQTT CLIENT
# ==========================================

mqtt_connected = False
mqtt_cli = mqtt_client.Client(
    client_id=f"sortix_ai_{int(time.time())}",
    protocol=mqtt_client.MQTTv311,
)

if MQTT_USERNAME:
    mqtt_cli.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD or None)

def _on_connect(client, userdata, flags, rc):
    global mqtt_connected
    if rc == 0:
        mqtt_connected = True
        print(f"[MQTT] Ket noi thanh cong toi {MQTT_HOST}:{MQTT_PORT}")
        # Publish trang thai AI server online
        client.publish(
            TOPIC_STATUS,
            json.dumps({
                "source": "ai_server",
                "status": "online",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }),
            qos=0,
            retain=True,
        )
    else:
        print(f"[MQTT] Ket noi that bai, ma loi: {rc}")

def _on_disconnect(client, userdata, rc):
    global mqtt_connected
    mqtt_connected = False
    if rc != 0:
        print(f"[MQTT] Mat ket noi bat ngo (rc={rc}), dang tu ket noi lai...")

def _on_message(client, userdata, msg):
    """Nhan lenh dieu khien tu Dashboard (vi du: dung/chay bang tai)."""
    try:
        payload = json.loads(msg.payload.decode())
        print(f"[MQTT] Nhan lenh tu topic {msg.topic}: {payload}")
    except Exception:
        pass

mqtt_cli.on_connect    = _on_connect
mqtt_cli.on_disconnect = _on_disconnect
mqtt_cli.on_message    = _on_message

print(f"\n[MQTT] Dang ket noi toi {MQTT_HOST}:{MQTT_PORT}...")
try:
    mqtt_cli.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    mqtt_cli.loop_start()   # Chay MQTT trong thread rieng
    time.sleep(1.5)         # Cho ket noi hoan tat
except Exception as e:
    print(f"[MQTT] Canh bao: Khong ket noi duoc MQTT ({e}). Tiep tuc khong co MQTT.")

# Ham tien ich: publish ket qua nhan dien
def publish_vision(detections: list[dict]):
    """
    Gui ket qua nhan dien len MQTT topic sorter/sorter_01/vision.

    Payload (JSON):
    {
        "timestamp": "2026-11-04T14:07:22Z",
        "source": "ai_server",
        "count": 2,
        "detections": [
            {"class_id": 0, "class_name": "med_scissors",
             "confidence": 0.95, "bbox": [x1,y1,x2,y2]},
            ...
        ],
        "top": {
            "class_id": 0,
            "class_name": "med_scissors",
            "confidence": 0.95
        }
    }
    """
    if not mqtt_connected:
        return

    top = detections[0] if detections else None
    payload = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "ai_server",
        "count": len(detections),
        "detections": detections,
        "top": top,
    }
    mqtt_cli.publish(TOPIC_VISION, json.dumps(payload), qos=0)

# ==========================================
# 6. LOAD YOLO MODEL
# ==========================================

print("\nDang tai mo hinh YOLO11...")

model = YOLO(str(MODEL_PATH))

print("Tai model thanh cong!")
print("Danh sach classes:", model.names)

# ==========================================
# 7. KET NOI CAMERA IPHONE
# ==========================================

print("\nDang ket noi DroidCam Video...")

cap = cv2.VideoCapture(
    CAMERA_INDEX,
    CAMERA_BACKEND
)

if not cap.isOpened():

    raise RuntimeError(
        "Khong mo duoc camera iPhone "
        "bang Media Foundation index 1!"
    )

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

print("Ket noi camera iPhone thanh cong!")
print("Dang bat dau nhan dien YOLO11...")
print("Nhan Q de thoat.")

# ==========================================
# 8. NHAN DIEN TRUC TIEP
# ==========================================

prev_time = time.time()
last_print_time = 0
last_publish_time = 0   # Thoi gian lan publish MQTT cuoi cung

while True:

    ret, frame = cap.read()

    if not ret:

        print("Khong nhan duoc frame tu iPhone!")
        break

    # --------------------------------------
    # YOLO PREDICTION
    # --------------------------------------

    results = model.predict(
        source=frame,
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE,
        device=DEVICE,
        verbose=False
    )

    # Ve bounding box va nhan len hinh
    annotated_frame = results[0].plot()

    # --------------------------------------
    # LAY THONG TIN OBJECT
    # --------------------------------------

    boxes = results[0].boxes

    detected_objects = []   # ["class_name: conf", ...]  — dung de in ra terminal
    detection_dicts  = []   # [{"class_id":..., ...}]    — dung de publish MQTT

    for box in boxes:

        class_id   = int(box.cls[0])
        confidence = float(box.conf[0])
        class_name = model.names[class_id]

        # Lay toa do bounding box (xyxy) neu co
        try:
            x1, y1, x2, y2 = [round(float(v), 1) for v in box.xyxy[0]]
            bbox = [x1, y1, x2, y2]
        except Exception:
            bbox = []

        detected_objects.append(f"{class_name}: {confidence:.2f}")

        detection_dicts.append({
            "class_id":   class_id,
            "class_name": class_name,
            "confidence": round(confidence, 4),
            "bbox":       bbox,
        })

    # --------------------------------------
    # TINH FPS
    # --------------------------------------

    current_time = time.time()

    fps = 1 / max(current_time - prev_time, 0.0001)

    prev_time = current_time

    # --------------------------------------
    # PUBLISH MQTT (gioi han theo PUBLISH_INTERVAL)
    # --------------------------------------

    if detection_dicts and (current_time - last_publish_time >= PUBLISH_INTERVAL):
        publish_vision(detection_dicts)
        last_publish_time = current_time

    # --------------------------------------
    # HIEN THI THONG TIN
    # --------------------------------------

    cv2.putText(
        annotated_frame,
        "SORTIX - IPHONE YOLO11",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    cv2.putText(
        annotated_frame,
        f"FPS: {fps:.1f}",
        (20, 70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 255),
        2
    )

    cv2.putText(
        annotated_frame,
        f"DEVICE: {DEVICE}",
        (20, 105),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 0),
        2
    )

    # Hien thi trang thai MQTT
    mqtt_status_color = (0, 255, 0) if mqtt_connected else (0, 0, 255)
    mqtt_status_text  = "MQTT: OK" if mqtt_connected else "MQTT: OFF"
    cv2.putText(
        annotated_frame,
        mqtt_status_text,
        (20, 135),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        mqtt_status_color,
        2
    )

    if not detected_objects:

        cv2.putText(
            annotated_frame,
            "NO OBJECT DETECTED",
            (20, 170),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 0, 255),
            2
        )

    # In ket qua ra terminal moi 1 giay
    if detected_objects and current_time - last_print_time >= 1:

        print("Detected:", ", ".join(detected_objects))

        last_print_time = current_time

    # --------------------------------------
    # HIEN THI VIDEO
    # --------------------------------------

    cv2.imshow(
        "SORTIX - YOLO11 IPHONE DETECTION",
        annotated_frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# ==========================================
# 9. GIAI PHONG TAI NGUYEN
# ==========================================

cap.release()
cv2.destroyAllWindows()

# Ngat ket noi MQTT sach se
mqtt_cli.loop_stop()
mqtt_cli.disconnect()

print("\nDa dung chuong trinh SORTIX!")
