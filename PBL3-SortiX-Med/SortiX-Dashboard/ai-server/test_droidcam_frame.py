
import cv2
import time
from pygrabber.dshow_graph import FilterGraph

print("===== SORTIX DROIDCAM TEST =====")

# 1. Lay danh sach camera
devices = FilterGraph().get_input_devices()

for index, name in enumerate(devices):
    print(f"Camera {index}: {name}")

# 2. Tim DroidCam Video
camera_index = None

for index, name in enumerate(devices):
    if "droidcam video" in name.lower():
        camera_index = index
        break

if camera_index is None:
    raise RuntimeError("Khong tim thay DroidCam Video!")

print("\nDroidCam index:", camera_index)

# 3. Thu cac backend
backends = [
    ("MSMF", cv2.CAP_MSMF),
    ("DSHOW", cv2.CAP_DSHOW)
]

cap = None

for name, backend in backends:

    print("\nThu backend:", name)

    test_cap = cv2.VideoCapture(camera_index, backend)

    if test_cap.isOpened():
        cap = test_cap
        print("Da mo camera bang", name)
        break

    test_cap.release()

if cap is None:
    raise RuntimeError("Khong mo duoc camera DroidCam!")

# 4. Doc video
print("\nDang doc frame...")

count = 0

while True:

    ret, frame = cap.read()

    if not ret:
        print("Khong nhan duoc frame!")
        time.sleep(0.1)
        continue

    count += 1

    # Kiem tra do sang trung binh
    brightness = frame.mean()

    if count % 30 == 0:
        print(
            f"Frame: {count} | "
            f"Size: {frame.shape} | "
            f"Brightness: {brightness:.2f}"
        )

    cv2.putText(
        frame,
        f"DROIDCAM - Brightness: {brightness:.1f}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2
    )

    cv2.imshow("SORTIX - IPHONE CAMERA TEST", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
