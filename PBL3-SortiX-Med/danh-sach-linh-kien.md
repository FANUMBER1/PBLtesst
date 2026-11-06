# Dự Thảo BOM, Sơ Đồ Khối & Hướng Dẫn Đấu Nối Hệ Thống (SortiX)

> **Dự án:** Hệ thống băng tải phân loại tự động điều khiển bằng **ESP32-C5**  
> **Phần cứng vi điều khiển đã xác nhận:** **Bo phát triển WeAct Studio ESP32-C5-A-N8R8** (Module ESP32-C5-WROOM-1-N8R8 tích hợp sẵn 8 MB Flash + 8 MB Quad SPI PSRAM, 2 cổng Type-C, rào 16 chân J6/J7 đã đối chiếu thực tế).  
> **Trạng thái:** Toàn bộ pinout, sơ đồ đấu nối và kiến trúc hệ thống đã được rà soát và chuẩn hóa đồng bộ.

---

## 1. Danh Sách Linh Kiện Dự Kiến & Link Tham Khảo

Module XL4015 là phương án buck đang xem xét. Dòng liên tục thực tế của module phụ thuộc PCB, diode, cuộn cảm và tản nhiệt; định mức của IC không xác nhận khả năng tải liên tục của mọi module bán sẵn.

| STT | Tên chức năng trong hệ thống | Tên thương mại & Mã hiệu chính xác (Model / Part Number) | Số lượng | Thông số cốt lõi | Link tham khảo & Mua hàng trực tuyến |
|:---:|---|---|:---:|---|---|
| **1** | **Bo vi điều khiển trung tâm** | **Bo phát triển WeAct Studio ESP32-C5-A-N8R8** (Module ESP32-C5-WROOM-1-N8R8 hàn sẵn trên bo) | **01 bộ (Đã có sẵn)** | 240 MHz, Wi-Fi 6 băng tần kép, 8 MB Flash + 8 MB Quad SPI PSRAM | Đã đối chiếu khớp 100% với phần cứng thực tế. [Repo WeAct](https://github.com/WeActStudio/WeActStudio.ESP32-C5-A) |
| **2** | **Động cơ Servo gạt 1 & 2** | **TowerPro MG996R** (hoặc **MG966R**) Digital High Torque Metal Gear | **02 con** | Nhông kim loại, góc quay 180°, lực kéo 11–13 kg.cm, điện áp 4.8V–6V, dòng đỉnh 1.5A | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/dong-co-servo-mg996r)<br>• [Mua tại BanLinhKien](https://banlinhkien.com/dong-co-servo-mg996r-metal-gear-p7988.html)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=servo%20mg996r%20nhong%20kim%20loai) |
| **3** | **Động cơ kéo băng tải 65 RPM** | **Động cơ DC giảm tốc JGB37-520 12V 66RPM có Encoder** (Tỉ số truyền hộp số $\approx 1:90$) | **01 con** | Động cơ 12VDC, tốc độ 60–66 vòng/phút, đĩa từ Encoder 2 pha A/B (11 xung/vòng tại trục motor) | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/dong-co-giam-toc-jgb37-520-12v-66rpm-co-encoder)<br>• [Mua tại BanLinhKien](https://banlinhkien.com/dong-co-giam-toc-jgb37-520-12v-66rpm-kem-encoder-p15442.html)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=dong%20co%20jgb37-520%2012v%20encoder) |
| **4** | **Mạch điều khiển đảo chiều động cơ** | **Module Driver L298N (Đỏ)** - Dual Full-Bridge Motor Driver | **01 module** | Cầu H kép L298; datasheet IC nêu giới hạn dòng đầu ra đến 2A/kênh theo điều kiện quy định. Dòng liên tục của module phụ thuộc board và tản nhiệt, chưa xác nhận cho module cụ thể. | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/mach-dieu-khien-dong-co-l298n)<br>• [Mua tại BanLinhKien](https://banlinhkien.com/module-dieu-khien-dong-co-l298n-p1108.html) |
| **5** | **Cảm biến phát hiện vật cản** | **Module cảm biến hồng ngoại tránh vật cản LM393** (IR Obstacle Sensor) | **01 module** | Ngõ ra Digital DO (Active Low), biến trở chỉnh cự ly 2–30cm, **cấp nguồn nuôi 3.3V** | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/module-cam-bien-tranh-vat-can-hong-ngoai)<br>• [Mua tại BanLinhKien](https://banlinhkien.com/module-cam-bien-tranh-vat-can-lm393-p1523.html)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=cam%20bien%20vat%20can%20hong%20ngoai%20lm393) |
| **6** | **Cảm biến ánh sáng buồng quét** | **Module cảm biến quang trở ánh sáng LDR LM393** (Photoresistor Sensor) | **01 module** | Ngõ ra Digital DO, có biến trở chỉnh ngưỡng sáng, **cấp nguồn nuôi 3.3V** | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/module-cam-bien-anh-sang-quang-tro-lm393)<br>• [Mua tại BanLinhKien](https://banlinhkien.com/module-cam-bien-anh-sang-ldr-lm393-p1525.html)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=cam%20bien%20anh%20sang%20quang%20tro%20lm393) |
| **7** | **Nút nhấn Khởi Động (Start)** | **Nút nhấn tự nhả phi 12mm PBS-110** (hoặc nút kim loại phi 16mm tiếp điểm NO) | **01 cái** | Tiếp điểm Thường Mở (NO), nhấn đóng mạch, thả tay tự nhả về hở | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/nut-nhan-nha-pbs-110-12mm)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=nut%20nhan%20pbs-110%2012mm) |
| **8** | **Nút Dừng Khẩn Cấp (E-Stop)** | Nút nấm phi 22 mm và tiếp điểm NC **phải thuộc bộ tương thích cơ khí**; mã LAY5/XB2/ZB2 hiện là phương án cần xác nhận | **01 bộ** | ZB2-BE102C có $I_{th}=10\text{A}$ nhưng đây không phải định mức đóng cắt tải DC. Schneider công bố DC-13: 0.55A/125V, 0.27A/250V, 0.1A/600V; chưa công bố điểm định mức phù hợp cho việc ngắt bus 12V nhiều ampere trong cấu hình này. Không dùng tiếp điểm này trực tiếp cắt bus; dùng nó điều khiển contactor DC phù hợp hoặc chọn thiết bị có rating đúng tải. | [Thông số Schneider Electric](https://eshop.se.com/ae/xb2-metallic-control-zb2be102c.html) |
| **9** | **Cầu chì bảo vệ ngõ vào 12V** | Cầu chì DC 5×20 mm và đế giữ; **6A chỉ là giá trị dự kiến, chưa chốt** | **01 bộ** | Chọn đặc tuyến thời gian-dòng, khả năng cắt DC và dòng định mức theo dòng khởi động đo được, tiết diện dây và nguồn thực tế. Không dùng một giá trị cầu chì để suy ra thời gian ngắt khi sự cố. | [Đế cầu chì tham khảo](https://www.thegioiic.com/products/de-cau-chi-ong-5x20mm) |
| **10** | **Bộ nguồn 12VDC tổng** | Nguồn cách ly 12VDC; model và chứng nhận cụ thể **chưa chốt** | **01 bộ** | Công suất cần tính lại sau khi đo dòng khởi động/kẹt motor và dòng servo. Nếu dùng nguồn khung hở, cần enclosure và đấu nối bảo vệ phù hợp; sơ đồ trong tài liệu không bao gồm đấu dây điện lưới. | Chọn theo tải đo được và tài liệu an toàn của đúng model. |
| **11** | **Khối nguồn hạ áp 5V công suất** | Module hạ áp buck dùng IC **XL4015** | **01 module** | IC XL4015 có dải điện áp vào hoạt động 8–36V và dòng danh định tối đa 5A theo datasheet IC. Dòng tải liên tục của module cụ thể phải xác nhận bằng thông số module và kiểm tra nhiệt. | • [XLSEMI XL4015 Datasheet](https://www.xlsemi.com/datasheet/XL4015-EN.pdf)<br>• [Module tham khảo](https://www.thegioiic.com/products/mach-ha-ap-dc-dc-xl4015-5a) |
| **12** | **Diode Schottky chống ngược cực** | **Diode Schottky MBR1045** (10A / 45V, vỏ TO-220) hoặc **SR560** (5A / 60V) | **01 con** | Sụt áp thấp (~0.5V), bảo vệ chống cắm ngược cực nguồn 12V tổ ong | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/mbr1045-diode-schottky-10a-45v)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=diode%20mbr1045) |
| **13** | **Diode TVS dập xung quá áp** | TVS đơn hướng **P6KE15A** (phải kiểm tra điện áp rail và năng lượng xung) | **01 con** | $V_{RWM}=12.8\text{V}$; $V_C=21.2\text{V}$ tại $I_{PP}=28.8\text{A}$ theo dạng xung quy định trong datasheet. Không quy đổi thông số này thành năng lượng joule dùng được cho mọi xung. | [Littelfuse P6KE Datasheet](https://www.littelfuse.com/assetdocs/tvs-diodes-p6ke-datasheet?assetguid=620a3cb5-3282-4670-8b03-66f21bc75523) |
| **14** | **Tụ hóa lọc cục bộ đường 5V** | Tụ nhôm 2200 µF / 16V, ESR và ripple-current cần kiểm tra | **01 con** | Có thể giảm sụt áp rất ngắn. Với tải 3A và độ sụt 0.5V, mô hình lý tưởng $t=C\Delta V/I$ cho khoảng **0.37 ms**; không bù được xung servo 100–300ms và không chứng minh tránh brownout. | [Tụ tham khảo](https://www.thegioiic.com/products/tu-hoa-2200uf-16v) |
| **15** | **Tụ lọc nút Start / giảm nhiễu motor** | Tụ 0.1 µF / 50V cho mạch RC Start; tụ giảm nhiễu motor chỉ chọn theo datasheet/đo kiểm của đúng motor | **04 con dự kiến** | 01 tụ cho nút Start ($C_3$); tối đa 03 tụ ở motor chỉ khi xác nhận đúng vị trí đấu và loại tụ theo hướng dẫn nhà sản xuất. Không mặc định nối tụ vào vỏ motor. | [Tụ tham khảo](https://www.thegioiic.com/products/tu-gom-100nf-50v-104) |
| **16** | **Điện trở phân áp & hạn dòng (1/4W)** | • $R_0 = 1.5\text{ k}\Omega$ (LED báo nguồn 12V): **01 con**<br>• $R_5 = 10\text{ k}\Omega$ (Treo nút Start): **01 con**<br>• $R_3 = 220\text{ }\Omega$ (Hạn dòng LED trạng thái GPIO10): **01 con** | **Mỗi loại 1–2 con** | Điện trở màng kim loại/carbon 1/4W, sai số 1%–5% | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/dien-tro-1-4w-10k)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=dien%20tro%201-4w) |
| **17** | **Đèn LED báo hiển thị** | • 01 LED phi 5mm Đỏ (Báo nguồn 12V sau E-Stop & Cầu chì)<br>• 01 LED phi 5mm Xanh lá (Báo trạng thái hệ thống chạy từ GPIO10) | **02 con** | LED tròn siêu sáng phi 5mm | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/led-phi-5mm-do)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=led%20phi%205mm) |
| **18** | **Socket cắm bo WeAct** | **Thanh rào cái 16 chân đơn (Female Header 1x16P 2.54mm thẳng)** | **02 thanh** | Làm đế cắm bo WeAct ESP32-C5 tháo lắp tiện lợi | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/thanh-rao-cai-1-16p-2-54mm-thang)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=thanh%20rao%20cai%2016%20chan%202.54mm) |
| **19** | **Cọc đấu dây nguồn 12V** | **Domino 2 chân vặn vít KF301-2P (bước chân 5.08mm)** | **01 cái** | Đấu nối dây nguồn 12V từ bộ nguồn tổ ong vào bo mạch chắc chắn | • [Mua tại Thế Giới IC](https://www.thegioiic.com/products/domino-kf301-2p-5-08mm)<br>• [Tìm mua trên Shopee](https://shopee.vn/search?keyword=domino%20kf301%202p) |
| **20** | **Thiết bị thị giác máy tính (Camera AI)** | **Webcam USB 2K QHD Plug & Play** (Chuẩn UVC, kèm cáp USB & kẹp gá) | **01 cái** | Độ phân giải 2K, cắm trực tiếp vào Laptop/PC trạm AI chạy mô hình **YOLO11** (`PBL.v1i.yolov11/test_yolo.py`), gửi kết quả phân loại qua MQTT topic `sorter/sorter_01/vision` | Có sẵn của bạn (hoặc mua webcam USB chuẩn UVC) |

> [!NOTE]
> **Kiến trúc phân hệ xử lý ảnh thị giác máy tính (Computer Vision Station):**  
> Chiếc **Webcam USB 2K** được cắm trực tiếp vào **Laptop / Máy tính trạm**, **KHÔNG** cắm vào ESP32-C5.  
> - **Laptop / PC:** Chạy script Python `PBL.v1i.yolov11/test_yolo.py` (Ultralytics YOLO11 + OpenCV), nhận diện dụng cụ y tế và publish kết quả JSON thời gian thực lên MQTT broker theo topic `sorter/sorter_01/vision`.

---

## 2. Phương Án GPIO, Bo Phát Triển & An Toàn Nguồn

### 2.1 Bảng Gán GPIO Chuẩn Hóa Cho Bo WeAct Studio ESP32-C5-A-N8R8
> [!IMPORTANT]
> **PHƯƠNG ÁN GÁN GPIO ĐÃ ĐƯỢC CHUẨN HÓA & KHÔNG XUNG ĐỘT PHẦN CỨNG:**  
> Phương án phân bổ chân đã được đối chiếu trực tiếp với sơ đồ mạch và 2 hàng rào chân 16P (J6/J7) của bo **WeAct Studio ESP32-C5-A-N8R8**:
> 1. **Driver L298N (Động cơ 65 RPM):** Nối vào **GPIO8** (IN1 - Dãy Trái Pin 9) và **GPIO9** (IN2 - Dãy Trái Pin 10).
> 2. **Cổng Type-C USB Native trên bo WeAct:** Dành riêng cho **GPIO13** (USB D- - Dãy Phải Pin 14) và **GPIO14** (USB D+ - Dãy Phải Pin 13), không dùng làm chân xuất tín hiệu khác để bảo toàn tính năng nạp code và debug native USB CDC/JTAG.
> 3. **Động cơ Servo 1:** Điều khiển bằng xung PWM tại **GPIO6** (Dãy Trái Pin 7).
> 4. **Động cơ Servo 2:** Điều khiển bằng xung PWM tại **GPIO7** (Dãy Trái Pin 8). Tuyệt đối không nối vào chân **GPIO15 / SPICS1** (Dãy Phải Pin 6) vì đây là đường chọn chip nội bộ của bộ nhớ 8 MB PSRAM.
> 5. **Bộ đọc Encoder:** Kênh A nối vào **GPIO1** (ngắt ngoài - Dãy Trái Pin 6), Kênh B nối vào **GPIO4** (Dãy Phải Pin 8).
> 6. **Cảm biến:** Cảm biến vật cản nối vào **GPIO0** (Dãy Trái Pin 5), Cảm biến ánh sáng nối vào **GPIO5** (Dãy Phải Pin 9), cả hai đều được nuôi bằng nguồn 3.3V lấy từ Dãy Trái Pin 1.
> 7. **Nút nhấn Start:** Nối vào **GPIO23** (Dãy Phải Pin 5) kèm mạch lọc RC ($10\text{k}\Omega // 0.1\mu\text{F}$).
> 8. **Đèn LED Báo Trạng Thái:** Nối vào **GPIO10** (Dãy Trái Pin 11) qua điện trở hạn dòng $220\Omega$.

### 2.2 Quy Tắc An Toàn Cấp Nguồn Khi Cắm Cáp USB Nạp Code & Chân 5V0
> [!CAUTION]
> **QUY TẮC AN TOÀN ĐẤU NỐI ĐƯỜNG NGUỒN 5V VÀ CÁP USB TYPE-C:**  
> 1. **Quy tắc khi nạp code / debug qua máy tính:** Luôn **rút dây cấp nguồn ngoài 5V0** (từ module buck XL4015 nối vào Dãy Trái Pin 14) trước khi cắm cáp Type-C vào máy tính để tránh hiện tượng xông điện ngược (back-powering) giữa 2 nguồn điện áp khác nhau gây hỏng cổng USB máy tính hoặc bo mạch.
> 2. **Khi hệ thống vận hành độc lập:** Cấp nguồn +5.0V từ ngõ ra module XL4015 vào chân **5V0 (Dãy Trái Pin 14)** và **GND (Dãy Trái Pin 15)**.
> 3. **Tuyệt đối không cấp nguồn toàn hệ thống chỉ bằng cổng USB máy tính:** Cổng USB của PC (500mA - 900mA) không thể nuôi được 2 động cơ servo MG996R (dòng đỉnh tới 3A) và động cơ 12V. Khối công suất (Servo và Motor) bắt buộc phải lấy nguồn từ XL4015 và nguồn 12V.

---

### 2.3 Các Bước Kiểm Tra An Toàn Trước Khi Đóng Điện (Pre-flight Checklist)

- **Đo kiểm ngõ ra Module XL4015 trước khi gắn tải:** Trước khi cắm dây nguồn 5V vào bo WeAct và 2 servo, dùng đồng hồ vạn năng (VOM) đo ngõ ra của module XL4015, xoay biến trở tinh chỉnh điện áp chính xác ở mức **5.0V - 5.1V**.
- **Tiếp điểm E-Stop & Nguồn 12V:** Tiếp điểm NC ZB2-BE102C dùng ngắt mạch nguồn 12V. Nhả nút E-Stop không được làm băng tải tự động chạy lại; hệ thống phải luôn chờ nhấn nút Start (GPIO23) để tái khởi động.
- **Tiếp địa và cách ly an toàn:** Khung nhôm băng tải và vỏ kim loại của bộ nguồn tổ ong 12V phải được nối tiếp địa (Earth Ground - PE) để triệt tiêu tĩnh điện và đảm bảo an toàn điện.
- **Chân SPICS1 (Dãy Phải Pin 6):** Kiểm tra kỹ đảm bảo chân này hoàn toàn để hở, không cắm bất kỳ dây nào.
- Chọn đúng bộ nút nấm/tiếp điểm có tương thích cơ khí; xác nhận contact DC-13 cho tải thực tế hoặc bổ sung contactor DC và mạch cuộn điều khiển vào BOM. Không mắc ZB2-BE102C trực tiếp cắt bus nhiều ampere khi chưa có rating phù hợp. Nhả E-Stop không được tự làm băng tải chạy lại; cần reset bằng thao tác riêng và lệnh Start.
- Chốt nguồn 12V, enclosure, tiếp địa/bảo vệ AC theo hồ sơ của đúng nguồn; tài liệu này chưa phải hướng dẫn đấu điện lưới.
- Lấy datasheet của đúng servo, motor, encoder, module L298N, buck và cầu chì; đo dòng khởi động/kẹt có giới hạn dòng, sụt áp rail 5V và nhiệt độ driver trước khi chốt nguồn, dây và cầu chì.
- Khi tích hợp, đối chiếu sơ đồ GPIO và topic/schema camera-MQTT với phần mềm điều khiển, rồi kiểm chứng trên hệ thống thực tế.

## 3. Ước Tính Tải Nguồn & Bảo Vệ (Cần Xác Nhận Bằng Datasheet/Đo Kiểm)

### 3.1 Bảng Ước Tính Ban Đầu Công Suất & Dòng Điện

Các số dưới đây là ước lượng để lập kế hoạch, chưa phải xác nhận nguồn đủ tải. Datasheet module ESP32-C5 yêu cầu nguồn có khả năng cấp ít nhất 0.6A ở rail 3.3V; dòng của cả bo, cảm biến và servo phải cộng theo đúng sơ đồ thực tế. Chưa có datasheet cùng revision cho motor, servo, module L298N, buck và nguồn tổng nên tổng dòng 12V chưa thể chốt.

| Khối phụ tải | Điện áp hoạt động | Dòng làm việc bình thường (Normal) | Dòng điện đỉnh lớn nhất (Peak / Stall) | Công suất tiêu thụ cực đại | Ghi chú kỹ thuật & Phân tích an toàn |
|---|:---:|:---:|:---:|:---:|---|
| **Module ESP32-C5-WROOM-1-N8R8** | 3.3V trên module | Theo workload | RF TX tới 408mA ở điều kiện SoC datasheet; đây không phải tổng dòng bo | Tính theo rail 3.3V và bộ nguồn bo thực tế | Cấp nguồn có khả năng tối thiểu 0.6A theo Espressif. LDO/đường 5V của bo mang module chưa xác nhận. |
| **02 Servo MG996R** | 4.8–6V theo đúng phiên bản servo | Chưa đo | 3A nếu giả định 1.5A mỗi servo; cần xác nhận đúng nhà sản xuất/model | 15W tại 5V, 3A | Datasheet servo cụ thể chưa có. Tụ 2200µF chỉ là lọc cục bộ, không giữ rail ổn định trong xung dài. |
| **Buck 5V cho bo và servo** | 5V | Chưa đo | Lập kế hoạch ít nhất bằng tổng stall current của servo cộng tải bo; cần đo | Chưa chốt | IC XL4015 có dòng danh định 5A, nhưng module cụ thể cần kiểm tra sụt áp và nhiệt. Cân nhắc tách rail servo và bo nếu phép đo cho thấy nhiễu hoặc brownout. |
| **Motor JGB37-520 và L298N** | 12V đầu vào driver | Chưa có dữ liệu xác nhận | Dòng khởi động/kẹt rotor chưa xác định | Chưa chốt | Mã JGB37-520 có nhiều biến thể. Cần datasheet đúng motor/encoder hoặc đo dòng kẹt trong phép thử có giới hạn dòng; không lấy điện trở 6.8Ω chưa dẫn nguồn làm thông số thiết kế. |
| **Nguồn và cầu chì 12V** | 12VDC | Chưa đo | Chưa tính tổng tải 12V, hiệu suất buck và surge | Chưa chốt | Chọn nguồn, dây và cầu chì sau khi có dòng tải đo được, đặc tuyến cầu chì và khả năng cắt DC. Không thể kết luận nguồn 10A hoặc cầu chì 6A đã phù hợp từ bảng hiện tại. |

#### Điểm cần xác nhận cho driver, tải và bảo vệ:
1. **Sụt áp L298:** Datasheet ST DS0218 Rev 5 nêu tổng sụt áp điển hình 1.8V, tối đa 3.2V tại 1A; tại 2A tối đa 4.9V. Với nguồn 12V, đầu ra motor ở 1A là khoảng 10.2V điển hình hoặc tối thiểu 8.8V theo thông số tối đa; tại 2A, trường hợp sụt áp tối đa còn khoảng 7.1V. Không suy ra RPM thực tế nếu chưa có đặc tính motor và module.
2. **Stall và nhiệt:** Không dùng motor kẹt để chạy liên tục. Chưa có điện trở cuộn dây, dòng stall và điện trở nhiệt của đúng motor/module; vì vậy các phép tính thời gian tới ngưỡng nhiệt trước đây được bỏ. Cần xác nhận giới hạn driver và tản nhiệt theo đúng board, thêm giới hạn dòng hoặc bảo vệ phù hợp; phát hiện kẹt bằng encoder chỉ là lớp bổ sung.
3. **Cầu chì:** Chưa có mã cầu chì và đường cong thời gian-dòng. Chốt cầu chì sau khi đo dòng khởi động/stall, kiểm tra tiết diện dây, nhiệt độ lắp đặt và khả năng cắt dòng DC của đúng fuse-holder.

---

### 3.2 Đặc Tính Khối Tiếp Điểm Nút Dừng Khẩn Cấp (E-Stop) & Quán Tính Cơ Học
- **Phân tích tiếp điểm NC dự kiến (Model ZB2-BE102C; đầu nấm tương thích chưa chốt):**
  - **Dòng nhiệt quy ước ($I_{th}$):** Giá trị 10A không phải định mức đóng cắt tải DC.
  - **Định mức DC-13 của nhà sản xuất:** Trang Schneider Electric công bố các điểm định mức 0.55A tại 125VDC, 0.27A tại 250VDC và 0.1A tại 600VDC. Tài liệu được tìm thấy không xác nhận khả năng ngắt bus 12V nhiều ampere trong cấu hình này. Không mắc tiếp điểm ZB2-BE102C trực tiếp nối/ngắt tải tổng khi chưa có định mức phù hợp từ nhà sản xuất.
  - **Phương án cần chốt:** Dùng tiếp điểm NC làm mạch điều khiển cho contactor DC có định mức phù hợp tải và có phần tử dập xung cuộn dây đúng thiết kế, hoặc chọn thiết bị đóng cắt được định mức cho chính tải này. Contactor và mạch điều khiển hiện chưa có trong BOM. Cũng cần xác nhận đầu nấm và khối tiếp điểm lắp vừa nhau; các mã LAY5/XB2/ZB2 không được xem là tương thích mặc định.
- **Giới hạn an toàn & Quán tính cơ học (Mechanical Coasting):**  
  > [!WARNING]
  > **NGẮT NGUỒN KHÔNG ĐỒNG NGHĨA KHÓA BĂNG TẢI TỨC THỜI 0 MILI-GIÂY:**  
  > Khi nhấn E-Stop, băng tải có thể tiếp tục trượt theo quán tính. Chưa có phép đo khoảng dừng cho tải, tốc độ và cơ cấu thực tế. Vì vậy:
  > - Không được coi việc ngắt điện là điểm dừng tuyệt đối không trôi.
  > - Đo khoảng dừng ở tốc độ và tải xấu nhất trước khi chốt vị trí cảm biến, cơ cấu gạt hoặc khoảng cách an toàn. Chưa có cơ sở cho con số dự phòng cố định 50mm.

---

### 3.3 Thông Số Diode TVS P6KE15A & Diode Chống Ngược Cực MBR1045
1. **Diode Schottky MBR1045 (10A / 45V TO-220):**  
   - Chịu dòng liên tục 10A, sụt áp thuận cực thấp $V_F \approx 0.45\text{V} - 0.50\text{V}$ ở dòng 2A.  
   - Mắc nối tiếp ngay sau cầu chì ngõ vào 12V: Nếu đấu nhầm cực âm/dương từ nguồn tổ ong, diode phân cực ngược chặn hoàn toàn dòng điện, bảo vệ an toàn cho tụ hóa và các IC trên bo.
2. **Diode TVS P6KE15A (Transient Voltage Suppressor):**  
   - **Xác định cực tính:** TVS đơn hướng (Unidirectional) có dải vạch màu trắng ở cực **Cathode**. Bắt buộc đấu **Cathode nối vào đường +12V**, **Anode nối vào GND**.
   - **Phân tích điện áp hoạt động chuẩn datasheet (Littelfuse P6KE Series):**  
      - **Điện áp làm việc ngược định mức ($V_{RWM}$):** **12.8V**. Điện áp rail lớn nhất ở điều kiện bình thường phải thấp hơn mức này; đo rail ở mọi điều kiện nguồn trước khi chọn TVS. Nếu nguồn có thể vượt 12.8V, P6KE15A có thể dẫn ngoài dự kiến.
      - **Điện áp đánh thủng danh định ($V_{BR}$):** Từ **14.3V đến 15.8V** (đo tại dòng thử $I_T = 1\text{mA}$).
      - **Điện áp kẹp cực đại ($V_C$ - Maximum Clamping Voltage):** **21.2V** tại $I_{PP}=28.8\text{A}$ theo dạng xung quy định trong datasheet. Mức 600W là công suất xung theo điều kiện datasheet, không phải mức tải liên tục.
   
      > [!IMPORTANT]
      > **Chọn TVS theo toàn mạch:** Điện áp kẹp phụ thuộc dòng xung. Dù mức 21.2V thấp hơn điện áp vào tối đa 36V của IC XL4015 và điện áp nguồn motor tối đa 46V của L298, vẫn phải kiểm tra giới hạn của mọi linh kiện trên rail, dạng xung, năng lượng và tần suất lặp. Chưa có dữ liệu cảm kháng/dòng của motor nên không khẳng định năng lượng xung hoặc tuổi thọ TVS.

---

## 4. Sơ Đồ Khối Toàn Hệ Thống (Chưa Phải Sơ Đồ Chế Tạo)

### 4.1 Sơ Đồ Khối Nguồn 12V & Hạ Áp 5V (Phương Án, Chưa Sẵn Sàng Lắp Ráp)

Sơ đồ chỉ bắt đầu từ đầu ra 12VDC. Model nguồn, cầu chì, contactor, tiết diện dây, cách đấu nguồn USB và giới hạn dòng vẫn cần chốt trước khi lắp.

```
 [NGUỒN 12VDC CÁCH LY — model, công suất và chứng nhận cần chốt]
   +12V ----[F1: cầu chì DC, dòng/đặc tuyến TBD]----[bảo vệ ngược cực]----[K1: tiếp điểm lực DC, định mức TBD]----+12V BUS
   GND -------------------------------------------------------------------------+------------------------------- GND BUS
                                                                                 |
[E-STOP NC 1-2] ------------------> [reset thủ công + Start/interlock + mạch cuộn K1/dập xung, chưa có trong BOM]

                                            +--------------------------+
                                            | TVS P6KE15A (tùy chọn)   |  Chọn sau khi xác nhận rail, xung và tải
                                            | Cathode -> +12V, Anode -> GND; tuân theo datasheet
                                            +--------------------------+

   +12V BUS -----------------------+---------------------------------------------+
                                   |                                             |
                                   v                                             v
                       +----------------------+                     +------------------------------+
                       | MODULE CẦU H L298N   |                     | MODULE BUCK XL4015          |
                       | Vs: theo module      |                     | IN+: +12V / IN-: GND        |
                       | GND: GND chung       |                     | OUT: chỉnh/đo 5V trước tải  |
                       | Jumper 5V: CẮM ĐÓNG  |                     +---------------+--------------+
                       | (IC 78M05 nuôi logic)|                                     | +5V BUS
                       +----------+-----------+                                     +-- Servo 1 VCC
                                  |                                                  +-- Servo 2 VCC
                       Motor 12V + encoder                                       +-- Bo C5 5V input*
                                                                                 +-- C_OUT 2200uF/GND

   GND BUS ----------------------------------------------------------------------+-- L298 GND
                                                                                 +-- Buck GND
                                                                                 +-- Servo GND / Bo C5 GND

   * Chỉ cấp +5V vào chân 5V0 bo WeAct khi chạy độc lập; ngắt dây này khi cắm USB máy tính nạp code.
   K1/contact, cuộn điều khiển, cầu chì, nguồn, tải dây và AC-side protection cần được đưa vào BOM.
   Không đấu điện lưới theo sơ đồ này; enclosure/PE/bảo vệ phía AC phải theo tài liệu đúng model nguồn.
```
---

### 4.2 Sơ Đồ Mạch Kết Nối Chi Tiết Bo Mạch WeAct ESP32-C5 Với Ngoại Vi

> [!NOTE]
> Sơ đồ kết nối dưới đây chuẩn hóa theo đúng sơ đồ chân bo phát triển **WeAct Studio ESP32-C5-A-N8R8** (2 hàng rào 16 chân J6/J7) đã được đối chiếu thực tế.

```
========================================================================================================================
                      SƠ ĐỒ ĐẤU NỐI DỰ KIẾN — BO WEACT ESP32-C5 VỚI THIẾT BỊ NGOẠI VI
========================================================================================================================

                 +---------------------------------------------------------------+
                 |             BO MẠCH WEACT STUDIO ESP32-C5-A                   |
                 |               (ESP32-C5-WROOM-1-N8R8)                         |
                 |                                                               |
                 |       [DÃY CHÂN TRÁI]                   [DÃY CHÂN PHẢI]       |
                 +---------------------------------------------------------------+
(Cấp nguồn 3.3V) | Pin  1 [3V3]                |  Pin  1 [GND]                   | ---> Nối mass nút Start & C3
                 | Pin  2 [RST - Reset]        |  Pin  2 [TX0 - GPIO11]          | ---> (Type-C UART Debug)
                 | Pin  3 [GPIO2]              |  Pin  3 [RX0 - GPIO12]          | ---> (Type-C UART Debug)
                 | Pin  4 [GPIO3]              |  Pin  4 [GPIO24]                |
CẢM BIẾN VẬT CẢN | Pin  5 [GPIO0]              |  Pin  5 [GPIO23]                | <--- NÚT NHẤN START (RC)
ENCODER KÊNH A   | Pin  6 [GPIO1]              |  Pin  6 [N/15 - SPICS1]         | (ĐỂ TRỐNG - 8MB PSRAM NỘI)
Tín hiệu SERVO 1 | Pin  7 [GPIO6]              |  Pin  7 [GPIO27/RGB]            | (LED RGB trên bo WeAct)
Tín hiệu SERVO 2 | Pin  8 [GPIO7]              |  Pin  8 [GPIO4]                 | <--- ENCODER KÊNH B
DRIVER L298N IN1 | Pin  9 [GPIO8]              |  Pin  9 [GPIO5]                 | <--- CẢM BIẾN ÁNH SÁNG
DRIVER L298N IN2 | Pin 10 [GPIO9]              |  Pin 10 [NC]                    |
LED TRẠNG THÁI   | Pin 11 [GPIO10]             |  Pin 11 [GPIO28/BOOT]           | (Nút BOOT trên bo WeAct)
                 | Pin 12 [GPIO26/STRAP]       |  Pin 12 [GND]                   |
                 | Pin 13 [GPIO25]             |  Pin 13 [GPIO14/USB D+]         | ---> (Cổng Type-C USB Native)
NHẬN NGUỒN +5V   | Pin 14 [5V0]                |  Pin 14 [GPIO13/USB D-]         | ---> (Cổng Type-C USB Native)
MASS CHUNG (GND) | Pin 15 [GND]                |  Pin 15 [GND]                   |
                 | Pin 16 [NC]                 |  Pin 16 [NC]                    |
                 +---------------------------------------------------------------+
                                 |                               |
        +------------------------+-------------------------------+------------------------+
        |                                                                                 |
        v                                                                                 v
 [CÁC KHỐI NGOẠI VI DÃY TRÁI]                                                    [CÁC KHỐI NGOẠI VI DÃY PHẢI]

 1. NGUỒN NUÔI 3.3V (Dãy Trái Pin 1 - 3V3):                                      1. MẠCH NÚT NHẤN START (GPIO23):
    • Nối vào chân VCC của Cảm biến Vật cản LM393                                   Đường 3.3V (Dãy Trái Pin 1)
    • Nối vào chân VCC của Cảm biến Ánh sáng LM393                                          |
    • Nối vào chân VCC của Cụm mắt đọc Encoder 2 pha                                      [R5: 10k]
    • Nối vào 1 đầu điện trở kéo R5 (10k) của nút Start                                     |
                                                                                            +------+---> Chân GPIO23 (Phải Pin 5)
 2. CẢM BIẾN VẬT CẢN HỒNG NGOẠI (LM393):                                                    |      |
    • Chân DO   --------> Nối vào chân GPIO0 (Dãy Trái Pin 5)                             [C3]   [NÚT START]
    • Chân VCC  --------> Cấp nguồn 3.3V (Dãy Trái Pin 1)                               (0.1uF)   (PBS-110)
    • Chân GND  --------> Nối Mass chung (GND)                                              |      |
                                                                                           ===    ===
 3. ENCODER ĐỘNG CƠ 65 RPM (KÊNH A):                                                       GND    GND (Dãy Phải Pin 1)
    • Dây Kênh A -------> Nối vào chân GPIO1 (Dãy Trái Pin 6)
                                                                                 2. ĐỘNG CƠ SERVO 2 (MG996R - Gạt 2):
 4. ĐỘNG CƠ SERVO 1 (MG996R - Gạt 1):                                               • Dây Cam/Vàng (Signal) -> GPIO7 (Trái Pin 8)
    • Dây Cam/Vàng (Signal) -> Nối chân GPIO6 (Dãy Trái Pin 7)                      • Dây Đỏ      (VCC 5V)  -> Đường +5V (XL4015)
    • Dây Đỏ      (VCC 5V)  -> Đường +5V (từ mạch XL4015)                           • Dây Nâu/Đen (GND)     -> Mass chung (GND)
    • Dây Nâu/Đen (GND)     -> Mass chung (GND)
                                                                                 3. ENCODER ĐỘNG CƠ 65 RPM (KÊNH B):
 5. DRIVER CẦU H L298N (ĐỘNG CƠ 65 RPM):                                            • Dây Kênh B -------> Nối GPIO4 (Phải Pin 8)
    • Chân IN1  --------> Nối vào chân GPIO8 (Dãy Trái Pin 9)
    • Chân IN2  --------> Nối vào chân GPIO9 (Dãy Trái Pin 10)                  4. CẢM BIẾN ÁNH SÁNG QUANG TRỞ (LM393):
    • Chân 12V  --------> Nối nguồn +12V (sau E-Stop & Cầu chì)                     • Chân DO   --------> Nối GPIO5 (Phải Pin 9)
    • Chân GND  --------> Nối Mass chung (GND)                                      • Chân VCC  --------> Cấp nguồn 3.3V (Trái Pin 1)
    • Cặp ngõ ra OUT1, OUT2: Nối 2 cực động cơ DC 65 RPM                            • Chân GND  --------> Nối Mass chung (GND)
    • Jumper ENA: CẮM ĐÓNG cố định (Full tốc độ 65 RPM)
    • Jumper 5V Enable: CẮM ĐÓNG (Nuôi logic L298N)
    • Chân 5V cọc vít L298N: ĐỂ HỞ (Không nối ra ngoài)

 6. ĐÈN LED BÁO TRẠNG THÁI HỆ THỐNG:
    • GPIO10 (Trái Pin 11) ---> [R3: 220 Ohm] ---> [Anode (+) LED]
    • [Cathode (-) LED]   ---> Nối Mass chung (GND)

 7. CẤP NGUỒN CHO BO WEACT:
    • Chân 5V0 (Trái Pin 14) <--- Nhận nguồn +5.0V từ ngõ ra XL4015
    • Chân GND (Trái Pin 15) <--- Nối Mass chung (GND)
```

---

## 5. Từng Sơ Đồ Mạch Con Chi Tiết (Detailed Sub-Circuits)

### 5.1 Mạch Nút Nhấn Khởi Động (Start) - Lọc Rung RC & Debounce
```
          Đường nguồn 3.3V (Dãy Trái - Pin 1)
                  |
             [R5: 10k Ohm] (Trở kéo lên 3.3V)
                  |
                  +----------------------------------> Nối chân GPIO23 (Dãy Phải - Pin 5)
                  |                     |
            [C3: 0.1 uF]         [NÚT NHẤN START]
            (Tụ gốm 104)           (PBS-110 - NO)
                  |                     |
                 ===                   ===
                 GND                   GND (Dãy Phải - Pin 1)
```
- **Nguyên lý hoạt động:** Điện trở $R_5$ ($10\text{k}\Omega$) và tụ $C_3$ ($0.1\mu\text{F}$) tạo mạch lọc thông thấp với hằng số thời gian $\tau = R \times C = 1\text{ ms}$, giúp dập tắt phần lớn xung nhọn cao tần sinh ra do ma sát cơ khí khi bấm nút.
- **Phần mềm (Firmware Debounce):** Bắt buộc duy trì kiểm tra trễ phần mềm từ **15ms – 25ms** trong ngắt/vòng quét để đảm bảo không bị kích hoạt kép khi nút nhấn bị rung tiếp điểm cơ khí.

---

### 5.2 Mạch Driver L298N, Động Cơ 65 RPM & Cụm Tụ Chống Nhiễu Chổi Than
```
 +-------------------------+                        +------------------------------------+
 | BO WEACT ESP32-C5       |                        | MODULE DRIVER CẦU H L298N          |
 |                         |                        |                                    |
 | GPIO8 (Trái Pin 9)  ----+----------------------->| Chân tín hiệu IN1                  |
 | GPIO9 (Trái Pin 10) ----+----------------------->| Chân tín hiệu IN2                  |
 | GND   (Trái Pin 15) ----+----------------------->| Chân GND tín hiệu                  |
 |                         |                        | Chân 12V VCC <--- Nguồn +12V       |
 +-------------------------+                        | Jumper ENA   <--- CẮM NỐI 5V ONBOARD
                                                    | Jumper 5V En <--- CẮM ĐÓNG         |
                                                    | Chân 5V vít  <--- ĐỂ HỞ (KHÔNG NỐI)|
                                                    | Chân OUT1 ---+                     |
                                                    | Chân OUT2 ---|----+                |
                                                    +--------------|----|----------------+
                                                                   |    |
                                                                   v    v
                                                    +------------------------------------+
                                                    | ĐỘNG CƠ GIẢM TỐC JGB37-520 (65 RPM)|
                                                    | Cực động cơ M+ <--- OUT1           |
                                                    | Cực động cơ M- <--- OUT2           |
                                                    |                                    |
                                                    | [CỤM TỤ GỐM 104 DẬP TIA LỬA ĐIỆN]: |
                                                    |  • C_M1 (0.1uF): Mắc giữa M+ và M- |
                                                    |  • C_M2 (0.1uF): Cực M+ nối vỏ sắt |
                                                    |  • C_M3 (0.1uF): Cực M- nối vỏ sắt |
                                                    |                                    |
 +-------------------------+                        | CỤM ĐĨA TỪ ENCODER (ĐUÔI ĐỘNG CƠ): |
 | 3V3   (Trái Pin 1)  ----+----------------------->| Chân VCC (+3.3V)                   |
 | GND   (Trái Pin 15) ----+----------------------->| Chân GND (Mass)                    |
 | GPIO1 (Trái Pin 6)  <---+------------------------| Chân Kênh A (Đếm xung ngắt)        |
 | GPIO4 (Phải Pin 8)  <---+------------------------| Chân Kênh B (Đo chiều quay)        |
 +-------------------------+                        +------------------------------------+
```

#### Cấu hình chân & lưu ý vận hành Driver L298N:
1. **Cấu hình Jumper ENA (Enable A):**
   - Trên module L298N có sẵn chân cắm jumper nối ENA với 5V. **Giữ cắm jumper này** để kênh A luôn hoạt động ở chế độ chạy định mức 65 RPM.
   - Bảng điều khiển logic:
     - **Quay Thuận:** `IN1 = 1, IN2 = 0` (Kéo hàng tới).
     - **Quay Nghịch:** `IN1 = 0, IN2 = 1` (Lùi hàng về).
     - **Dừng hãm (Brake):** `IN1 = 1, IN2 = 1` (Phanh hãm động cơ tức thì, chỉ có tác dụng khi ENA = 1).
     - **Thả trôi (Coast):** `IN1 = 0, IN2 = 0` (Động cơ quay theo quán tính đến khi dừng).
2. **Cấu hình Nguồn 5V Logic (VSS) trên L298N:**
   - Khi cấp nguồn 12V vào cọc 12V, **giữ cắm Jumper 5V Enable** trên module L298N để IC ổn áp 78M05 tích hợp tự sinh 5V nuôi phần logic nội bộ.
   - **Tuyệt đối không nối cọc 5V của L298N vào ngõ ra 5V của Module XL4015** (để hở cọc này) nhằm tránh hiện tượng 2 nguồn ổn áp đấu song song gây xông điện và nóng hỏng linh kiện.
3. **Đặc tính dòng điện & Tản nhiệt:**
   - Driver L298 dùng transistor BJT, sụt áp nội $V_{CE(sat)}$ từ 1.8V đến 2.5V. Với động cơ JGB37-520 dòng tải làm việc khoảng 0.3A – 0.6A, tấm nhôm tản nhiệt trên module đáp ứng an toàn. Nếu xảy ra kẹt tải cơ khí lâu dài (dòng kẹt trục lên đến 1.8A), nhiệt độ nhôm sẽ tăng cao, cần ngắt điện hoặc bổ sung quạt tản nhiệt.

---

### 5.3 Mạch 2 Động Cơ Servo MG996R (Gạt Phân Loại 1 & 2)
```
 +-------------------------+
 | BO WEACT ESP32-C5       |
 |                         |
 | GPIO6  (Trái Pin 7) ----+-----------------------> Dây Cam/Vàng (Signal) - SERVO 1 (Cửa gạt 1)
 | GPIO7  (Trái Pin 8) ----+-----------------------> Dây Cam/Vàng (Signal) - SERVO 2 (Cửa gạt 2)
 +-------------------------+

 +-------------------------+
 | MODULE HẠ ÁP XL4015     |
 | Ngõ ra +5.0V (Dòng 5A) -+-----------------------> Dây Đỏ (VCC) - SERVO 1 & SERVO 2
 | Đường Mass chung (GND) -+-----------------------> Dây Nâu/Đen (GND) - SERVO 1 & SERVO 2
 +-------------------------+
```
> [!TIP]
> **Hiệu chỉnh góc Servo (Mechanical Calibration):**  
> Trạng thái "0°" của Servo là **vị trí đóng cửa gạt ban đầu đã được căn chỉnh cơ khí (Mechanical Home)**. Trước khi gắn cánh tay gạt cơ khí vào trục servo, hãy cấp xung 1000µs (hoặc 1500µs góc giữa) để servo quay về góc chuẩn của phần mềm, sau đó mới lắp cần gạt khớp vào vị trí đóng.

---

### 5.4 Mạch 2 Cảm Biến LM393 (Vật Cản & Ánh Sáng Buồng Quét)
```
 +-------------------------+                        +------------------------------------+
 | BO WEACT ESP32-C5       |                        | CẢM BIẾN HỒNG NGOẠI VẬT CẢN (LM393)|
 | 3V3   (Trái Pin 1)  ----+----------------------->| Chân VCC (+3.3V an toàn cho chip)  |
 | GND   (Trái Pin 15) ----+----------------------->| Chân GND                           |
 | GPIO0 (Trái Pin 5)  <---+------------------------| Chân DO (Phát hiện phôi hàng)      |
 +-------------------------+                        +------------------------------------+

 +-------------------------+                        +------------------------------------+
 | BO WEACT ESP32-C5       |                        | CẢM BIẾN ÁNH SÁNG QUANG TRỞ (LM393)|
 | 3V3   (Trái Pin 1)  ----+----------------------->| Chân VCC (+3.3V an toàn cho chip)  |
 | GND   (Trái Pin 15) ----+----------------------->| Chân GND                           |
 | GPIO5 (Phải Pin 9)  <---+------------------------| Chân DO (Ngưỡng sáng buồng camera) |
 +-------------------------+                        +------------------------------------+
```

---

### 5.5 Mạch Đèn LED Báo Trạng Thái Hệ Thống
```
 Chân GPIO10 (Dãy Trái - Pin 11)
          |
     [R3: 220 Ohm] (Hạn dòng an toàn ~7 mA cho chân GPIO)
          |
        +---+ (Anode)
        |LED| LED phi 5mm Xanh lá
        +---+
          | (Cathode)
         === GND (Dãy Trái - Pin 15)
```

---

## 6. Tính Toán Quãng Đường & Định Vị Phôi (Ví Dụ Cần Hiệu Chuẩn)

### 6.1 Các Giả Định Encoder và Con Lăn

Các dữ liệu dưới đây chỉ là giả định ban đầu từ tên gọi sản phẩm, chưa được xác nhận bằng datasheet đúng motor/encoder. Xung trên mỗi vòng có thể được quy định theo chu kỳ, cạnh đơn, hoặc cách đếm x4; tỉ số truyền và tốc độ đầu ra cũng thay đổi theo biến thể và tải.

- Giả định encoder cho **11 chu kỳ/vòng trục motor**, hộp số **90:1**, con lăn chủ động đường kính **40 mm**.
- Nếu firmware đếm một cạnh lên kênh A: $N_{out}=11 × 90=990$ xung/vòng trục ra; chu vi con lăn $C=π × D≈125.66$ mm, tức khoảng **7.88 xung/mm**.
- Nếu datasheet xác nhận 11 chu kỳ quadrature/vòng và firmware đếm đủ 4 cạnh: $N_{out}=11 × 4 × 90=3960$ count/vòng, tức khoảng **31.5 count/mm**.
- Tại tốc độ trục ra giả định 60 RPM, vận tốc lý thuyết là khoảng **125.66 mm/s**. Tốc độ thực phụ thuộc tải, motor, hộp số, driver và nguồn; cần đo bằng encoder hoặc đánh dấu chiều dài thực.

### 6.2 Bảng Vị Trí Mẫu — Cần Thay Bằng Kích Thước Đã Đo

Bảng sau minh họa hình học băng tải giả định dài 600 mm. Các tọa độ, tốc độ và số đếm không phải cấu hình đã có trong firmware. Sau khi lắp, đo đường kính hiệu dụng, tỉ số truyền, số count/mm, trượt băng và độ trễ servo; sau đó hiệu chuẩn lại từng trạm.

| Vị trí mẫu | Tọa độ giả định | Khoảng cách từ S1 | Thời gian tại 125.66 mm/s | Count kênh A (giả định 7.88 xung/mm) |
|---|:---:|:---:|:---:|:---:|
| S1 / camera | 60 mm | 0 mm | 0 s | 0 |
| Servo 1 | 260 mm | 200 mm | 1.59 s | 1,576 |
| Servo 2 | 460 mm | 400 mm | 3.18 s | 3,152 |
| Cuối băng | 600 mm | 540 mm | 4.29 s | 4,255 |

### 6.3 Kiến Trúc Camera/MQTT Mục Tiêu

1. Webcam USB kết nối Laptop/PC; đo latency end-to-end trên đúng độ phân giải, ánh sáng và model AI. Không giả định inference luôn mất 25 ms.
2. Ngưỡng confidence (ví dụ 0.75) là tham số phải chọn theo bộ dữ liệu kiểm chứng, không phải mức đạt độ chính xác đã được bảo đảm.
3. Topic và schema MQTT cần được thống nhất với firmware/dashboard. Bản tin nên có **event_id**, **captured_at**, nhãn lớp và confidence; đồng hồ camera/host/ESP32 không được xem là đồng bộ nếu chưa triển khai đồng bộ thời gian.
4. Firmware phải ghép kết quả thị giác với vị trí encoder theo mốc S1 và latency đã đo, đồng thời xử lý mất gói, bản tin lặp và vật thể bị nhận diện nhiều lần.
5. Đây là kiến trúc mục tiêu; cập nhật sau khi tích hợp phần mềm và kiểm chứng latency, ghép vị trí encoder, mất gói và bản tin lặp.

## 7. Bảng Hướng Dẫn Đấu Nối Từng Dây & Quy Chuẩn Màu Dây

> [!NOTE]
> Bảng đấu nối dưới đây chuẩn hóa theo đúng sơ đồ chân thực tế của bo **WeAct Studio ESP32-C5-A-N8R8** và các khối ngoại vi.

| Tên thiết bị ngoại vi | Đầu cắm trên thiết bị | Màu dây khuyên dùng | Nối vào chân nào trên bo WeAct / Khối nguồn | Chức năng chi tiết khi vận hành |
|---|---|:---:|---|---|
| **Nút nhấn Start** | Chân tín hiệu 1 | **Xanh dương** | **Dãy Phải - Pin 5 (GPIO23)** | Đọc tín hiệu nút bấm (Chưa bấm = 1, Bấm = 0) |
| | Chân mass 2 | **Đen** | **Dãy Phải - Pin 1 (GND)** | Nối mass cho nút bấm và tụ $C_3$ (0.1µF) |
| **Cảm biến Vật cản** | Chân DO | **Vàng** | **Dãy Trái - Pin 5 (GPIO0)** | Ngõ ra phát hiện sản phẩm (Có vật = 0, Trống = 1) |
| | Chân VCC | **Cam** | **Dãy Trái - Pin 1 (3V3)** | Cấp nguồn nuôi 3.3V an toàn cho chip |
| | Chân GND | **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối mass chung |
| **Cảm biến Ánh sáng**| Chân DO | **Trắng** | **Dãy Phải - Pin 9 (GPIO5)** | Báo điều kiện ánh sáng buồng quét camera |
| | Chân VCC | **Cam** | **Dãy Trái - Pin 1 (3V3)** | Cấp nguồn nuôi 3.3V |
| | Chân GND | **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối mass chung |
| **Servo 1 (Gạt 1)** | Dây Signal | **Vàng / Cam** | **Dãy Trái - Pin 7 (GPIO6)** | Xuất xung PWM 50 Hz điều khiển góc gạt 1 |
| | Dây VCC | **Đỏ** | **Ngõ ra +5.0V (Module XL4015)** | Nguồn công suất 5V nuôi motor servo |
| | Dây GND | **Nâu / Đen** | **Mass chung (GND)** | Nối mass chung |
| **Servo 2 (Gạt 2)** | Dây Signal | **Vàng / Cam** | **Dãy Trái - Pin 8 (GPIO7)** | Xuất xung PWM 50 Hz điều khiển góc gạt 2 |
| | Dây VCC | **Đỏ** | **Ngõ ra +5.0V (Module XL4015)** | Nguồn công suất 5V nuôi motor servo |
| | Dây GND | **Nâu / Đen** | **Mass chung (GND)** | Nối mass chung |
| **Driver L298N** | Chân IN1 | **Xanh lá** | **Dãy Trái - Pin 9 (GPIO8)** | Điều khiển chiều quay Thuận (kéo hàng tới) |
| | Chân IN2 | **Tím** | **Dãy Trái - Pin 10 (GPIO9)** | Điều khiển chiều quay Nghịch (lùi hàng về) |
| | Chân GND | **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối mass chung giữa L298N và ESP32 |
| | Chân 12V VCC | **Đỏ to** | **Đường +12V sau F1 và tiếp điểm K1 đã định mức (E-Stop NC điều khiển K1)** | Nguồn động lực kéo motor 65 RPM |
| **Encoder Động cơ** | Dây Kênh A | **Vàng** | **Dãy Trái - Pin 6 (GPIO1)** | Ngắt ngoài đọc đếm xung quay |
| | Dây Kênh B | **Xanh lá** | **Dãy Phải - Pin 8 (GPIO4)** | Đọc mức logic nhận biết chiều quay |
| | Dây VCC | **Cam** | **Dãy Trái - Pin 1 (3V3)** | Nuôi mắt đọc từ tính Encoder bằng 3.3V |
| | Dây GND | **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối mass chung |
| **Đèn LED Báo Trạng Thái** | Chân Dương (Anode)| **Xanh lá** | **Dãy Trái - Pin 11 (GPIO10)** qua trở 220R | Sáng khi hệ thống đang ở Mức 1 (Hoạt động) |
| | Chân Âm (Cathode)| **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối về mass chung |
| **Nguồn bo WeAct ESP32-C5** | Chân 5V0 | **Đỏ** | **Dãy Trái - Pin 14 (5V0)** | Cấp nguồn +5.0V từ XL4015 (lưu ý rút dây này khi cắm USB máy tính nạp code) |
| | Chân GND | **Đen** | **Dãy Trái - Pin 15 (GND)** | Nối mass chung hệ thống |

---

## 8. Danh Mục Tiêu Chuẩn Kỹ Thuật & Tài Liệu Datasheet Tham Chiếu Đối Chiếu

Các tài liệu dưới đây là nguồn tham chiếu chuẩn xác cho các thông số kỹ thuật của linh kiện trong hệ thống:

1. **Espressif Systems:**
   - *ESP32-C5 Series SoC Datasheet* v1.5 (các bảng 5-1, 5-2, 5-4, 5-7 đến 5-10): [datasheet chính thức](https://documentation.espressif.com/esp32-c5_datasheet_en.html).
   - *ESP32-C5-WROOM-1 & ESP32-C5-WROOM-1U Module Datasheet* v1.3 (bảng 3-1, 6-1 đến 6-7): [datasheet chính thức](https://documentation.espressif.com/esp32-c5-wroom-1_wroom-1u_datasheet_en.html).
   - *ESP32-C5 Technical Reference Manual* (Chương Reset and Clock, IO MUX & GPIO Matrix, Boot Control).
2. **WeAct Studio:**
   - *WeAct Studio ESP32-C5-A Core Board Hardware Repository/Schematic* ([GitHub](https://github.com/WeActStudio/WeActStudio.ESP32-C5-A)); áp dụng chuẩn xác cho bo WeAct Studio ESP32-C5-A-N8R8.
   - Module N8R8 dùng 8 MB Flash + 8 MB PSRAM **Quad SPI**; chân module 19 có chức năng SPICS1 và không dùng như GPIO khi module tích hợp PSRAM. Pinout/USB/nguồn của bo mang module không được suy ra từ datasheet module.
3. **STMicroelectronics:**
   - *L298 Dual Full-Bridge Driver Datasheet* (ST DS0218 Rev 5, thông số sụt áp bão hòa): [datasheet ST](https://www.st.com/resource/en/datasheet/l298.pdf).
4. **XLSEMI:**
   - *XL4015 180KHz 5A 36V Buck DC to DC Converter Datasheet* (Rev 2.0; dải vào hoạt động 8–36V): [datasheet XLSEMI](https://www.xlsemi.com/datasheet/XL4015-EN.pdf).
5. **Littelfuse Inc.:**
   - *TVS Diodes P6KE Series Datasheet* ($V_{RWM}=12.8V$, $V_{BR}=14.3..15.8V$, $V_C=21.2V$ tại $I_{PP}=28.8A$ theo dạng xung quy định): [datasheet Littelfuse](https://www.littelfuse.com/assetdocs/tvs-diodes-p6ke-datasheet?assetguid=620a3cb5-3282-4670-8b03-66f21bc75523).
6. **Diodes Incorporated:**
   - *MBR1045 / MBR1045CT 10A High Voltage Power Schottky Rectifier Datasheet*.
7. **Tiêu chuẩn công nghiệp quốc tế:**
   - Tiếp điểm NC/đầu nấm phải có tài liệu tương thích cơ khí và định mức DC cho tải thực tế; không lấy $I_{th}$ thay cho DC-13.
   - Trạng thái SELV/PE/enclosure phụ thuộc nguồn 12VDC cụ thể; BOM chưa xác định model hay chứng nhận nên chưa thể khẳng định.
