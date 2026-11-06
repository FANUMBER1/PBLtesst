# Bảng Tra Cứu Thông Số Kỹ Thuật & Pinout ESP32-C5-WROOM-1-N8R8 (Datasheet Reference)

> Tài liệu này tập trung vào module **ESP32-C5-WROOM-1-N8R8** (8 MB Flash và 8 MB Quad SPI PSRAM) theo datasheet Espressif và bo phát triển **WeAct Studio ESP32-C5-A-N8R8** (đã đối chiếu chính xác khớp 100% theo tem nhãn và phần cứng thực tế).

---

## 1. Thông Số Cốt Lõi Module ESP32-C5-WROOM-1-N8R8

### 1.1 Vi Xử Lý & Bộ Nhớ (SoC & In-Package Memory)
- **SoC trung tâm:** ESP32-C5 (Kiến trúc vi xử lý RISC-V 32-bit đơn nhân, xung nhịp hoạt động tối đa **240 MHz**).
- **Bộ nhớ ROM:** 320 KB (Lưu trữ ROM Bootloader và các hàm hệ thống cốt lõi).
- **Bộ nhớ HP SRAM (High-Performance SRAM):** 384 KB.
- **Bộ nhớ LP SRAM (Low-Power SRAM):** 16 KB (Dành cho bộ đồng xử lý năng lượng thấp trong chế độ Deep-sleep).
- **Bộ nhớ Flash (N8):** **8 MB** Quad SPI (QSPI), tối đa 80 MHz theo thông số bộ nhớ trong datasheet module; thông số flash công bố 100.000 chu kỳ ghi/xóa và thời gian lưu dữ liệu 20 năm (giá trị datasheet, không phải cam kết tuổi thọ hệ thống).
- **Bộ nhớ SiP PSRAM tích hợp (R8):** **8 MB** Pseudo-SRAM chuẩn giao tiếp **Quad SPI (QSPI)** tốc độ cao 80 MHz, đóng gói ngầm bên trong nắp kim loại (SiP), kết nối qua kênh chọn chip nội bộ **`SPICS1`**.

### 1.2 Kết Nối Không Dây Đa Giao Thức (Wireless Radios)
- **Wi-Fi 6 (Dual-Band 2.4 GHz & 5 GHz):**
  - Cấu hình 1T1R (1 Transmitter, 1 Receiver), tương thích chuẩn **IEEE 802.11ax**.
  - Dải tần hoạt động: 2412 ~ 2484 MHz (2.4 GHz) và 5180 ~ 5885 MHz (5 GHz).
  - Băng thông kênh Wi-Fi 6 (802.11ax): **20 MHz** (hỗ trợ non-AP mode); các chuẩn tương thích ngược (802.11n) hỗ trợ băng thông 20 MHz / 40 MHz.
  - Hỗ trợ công nghệ OFDMA cho cả đường lên (Uplink) và đường xuống (Downlink), Target Wake Time (TWT), bảo mật WPA3.
- **Bluetooth 5 (LE - Low Energy):**
  - Tốc độ truyền dữ liệu: 125 Kbps (Coded PHY Long Range), 500 Kbps, 1 Mbps, 2 Mbps.
  - Hỗ trợ tính năng Advertising Extensions và Multiple Advertising Sets.
- **IEEE 802.15.4 (Zigbee & Thread):**
  - Tương thích chuẩn IEEE 802.15.4-2015 (băng tần 2.4 GHz, tốc độ 250 Kbps, điều chế OQPSK PHY).
  - Hỗ trợ mạng lưới **Thread 1.4** và **Zigbee 3.0**.

---

## 2. Bảng Định Nghĩa 29 Chân Module ESP32-C5-WROOM-1 (Pin Definitions)

Module **ESP32-C5-WROOM-1** sử dụng ăng-ten PCB trên bo, có **29 pad chân bề mặt (Surface Mount Pads)** (28 chân viền và 1 pad nhiệt Ground EPAD ở đáy):

| Số chân (Pin No.) | Tên chân (Pin Name) | Loại chân (Type) | Chức năng mặc định & Ghép kênh ngoại vi (Functions / Multiplexing) | Ghi chú kỹ thuật từ Datasheet Espressif |
|:---:|:---:|:---:|---|---|
| **1** | **GND** | P | Ground (Nối mass) | Mass chung |
| **2** | **3V3** | P | Power Supply (3.0 V ~ 3.6 V) | Cấp nguồn cho module (nguồn ngoài yêu cầu khả năng cấp $\ge 0.6\text{A}$) |
| **3** | **EN** | I | Chip Enable (Active High) | Mức cao (High): Bật chip; Mức thấp (Low): Tắt chip.<br>**Lưu ý:** Tuyệt đối không để chân EN thả nổi (floating). |
| **4** | **IO2** | I/O/T | **MTMS**, GPIO2, LP_GPIO2, LP_UART_RTSN, LP_I2C_SDA, ADC1_CH1, FSPIQ | **MTMS/JTAG; SoC liệt kê MTMS là chân strapping. Không dùng để chọn tần số XTAL.** |
| **5** | **IO3** | I/O/T | **MTDI**, GPIO3, LP_GPIO3, LP_UART_CTSN, LP_I2C_SCL, ADC1_CH2 | **MTDI/JTAG; là chân strapping và kết hợp GPIO25 để chọn cạnh lấy mẫu SDIO.** |
| **6** | **IO0** | I/O/T | GPIO0, XTAL_32K_P, LP_GPIO0, LP_UART_DTRN | GPIO đa năng / Chân thạch anh 32.768 kHz (+) |
| **7** | **IO1** | I/O/T | GPIO1, XTAL_32K_N, LP_GPIO1, LP_UART_DSRN, ADC1_CH0 | GPIO đa năng / Chân thạch anh 32.768 kHz (-) / ADC1_CH0 |
| **8** | **IO6** | I/O/T | GPIO6, LP_GPIO6, ADC1_CH5, FSPICLK | GPIO đa năng / Kênh ADC1_CH5 / SPI CLK |
| **9** | **IO7** | I/O/T | **GPIO7**, LP_GPIO7, FSPID, SDIO_DATA1 | **Strapping Pin (JTAG Signal Source Control)** / SPI Data |
| **10** | **IO8** | I/O/T | GPIO8, PAD_COMP0, SDIO_DATA0 | GPIO đa năng / Comparator Pad 0 / SDIO Data 0 |
| **11** | **IO9** | I/O/T | GPIO9, PAD_COMP1, SDIO_CLK | GPIO đa năng / Comparator Pad 1 / SDIO Clock |
| **12** | **IO10** | I/O/T | GPIO10, FSPICS0, SDIO_CMD | GPIO đa năng / SPI CS0 / SDIO Command |
| **13** | **IO13** | I/O/T | GPIO13, **USB_D-**, SDIO_DATA3 | **Đường dữ liệu USB D-** của USB Serial/JTAG Controller native |
| **14** | **IO14** | I/O/T | GPIO14, **USB_D+**, SDIO_DATA2 | **Đường dữ liệu USB D+** của USB Serial/JTAG Controller native |
| **15** | **IO28** | I/O/T | **GPIO28** | **Strapping Pin cốt lõi (Chip Boot Mode Control)** |
| **16** | **IO5** | I/O/T | MTDO, GPIO5, LP_GPIO5, LP_UART_TXD, ADC1_CH4, FSPIWP | Chân JTAG MTDO / Kênh ADC1_CH4 / LP UART TXD |
| **17** | **IO4** | I/O/T | MTCK, GPIO4, LP_GPIO4, LP_UART_RXD, ADC1_CH3, FSPIHD | Chân JTAG MTCK / Kênh ADC1_CH3 / LP UART RXD |
| **18** | **IO27** | I/O/T | **GPIO27** | **Strapping Pin cốt lõi (Boot Mode & ROM Message Print Control)** |
| **19** | **NC/IO15** | I/O/T | **SPICS1**, GPIO15 | **Chân chọn chip SPI PSRAM (SPICS1):** Trên bản N8R8 có PSRAM tích hợp, chân này đã nối ngầm với PSRAM, **tuyệt đối cấm sử dụng cho mục đích khác**. |
| **20** | **NC** | — | NC (Not Connected) | Chân không kết nối |
| **21** | **IO23** | I/O/T | GPIO23 | GPIO đa năng |
| **22** | **NC** | — | NC (Not Connected) | Chân không kết nối |
| **23** | **IO24** | I/O/T | GPIO24 | GPIO đa năng |
| **24** | **RX0** | I/O/T | **U0RXD**, GPIO12 | Chân nhận tín hiệu cổng nạp & debug UART0 |
| **25** | **TX0** | I/O/T | **U0TXD**, GPIO11 | Chân truyền tín hiệu cổng nạp & debug UART0 |
| **26** | **IO25** | I/O/T | **GPIO25** | **Strapping Pin (SDIO Sampling/Driving Clock Edge Control)** |
| **27** | **IO26** | I/O/T | **GPIO26** | **Strapping Pin cốt lõi (Chip Boot Mode Control)** |
| **28** | **GND** | P | Ground (Nối mass) | Mass chung |
| **29** | **EPAD** | P | Exposed Thermal Pad (Ground) | Miếng kim loại tản nhiệt đáy module, bắt buộc nối GND |

*Chú thích loại chân:*  
- **P:** Power supply (Chân cấp nguồn / Mass).  
- **I:** Input only (Chỉ ngõ vào).  
- **O:** Output only (Chỉ ngõ ra).  
- **T:** High Impedance / Tristate (Trở kháng cao).  

---

## 3. Bảng Ánh Xạ Chân Bo Mạch WeAct Studio ESP32-C5-A Core Board

Bo mạch thương mại **WeAct Studio ESP32-C5-A Core Board** đưa các chân của module ESP32-C5-WROOM-1 ra **hai hàng rào 16 chân chuẩn bước 2.54mm (Header Trái - J6 và Header Phải - J7)**:

> [!NOTE]
> Bo phát triển đã được xác nhận chính xác là **WeAct Studio ESP32-C5-A-N8R8** (đối chiếu khớp 100% với tem nhãn xuất xưởng và sơ đồ chân header vàng J6/J7 16 chân). Bảng dưới đây ánh xạ trực tiếp từ chân module ESP32-C5 ra 2 hàng rào cắm của bo.

### 3.1 Dãy Chân Bên Trái (Left Header - J6)
| Thứ tự chân | Tên in trên bo | Tên chân Module | Tên GPIO SoC | Chức năng phần cứng trên bo WeAct |
|:---:|:---:|:---:|:---:|---|
| **Pin 1** | **3V3** | Pin 2 (3V3) | — | Ngõ ra nguồn 3.3V (sau IC LDO ME6211 trên bo WeAct) |
| **Pin 2** | **RST** | Pin 3 (EN) | CHIP_PU | Chân kích hoạt / Reset chip (nối nút nhấn RESET trên bo) |
| **Pin 3** | **2** | Pin 4 (IO2) | GPIO2 | GPIO / ADC1_CH1 / LP_I2C_SDA / MTMS; xem lưu ý chân strapping của SoC |
| **Pin 4** | **3** | Pin 5 (IO3) | GPIO3 | GPIO tự do / ADC1_CH2 / LP_I2C_SCL / JTAG MTDI / Strap SDIO |
| **Pin 5** | **0** | Pin 6 (IO0) | GPIO0 | GPIO tự do / XTAL_32K_P / LP_UART_DTRN |
| **Pin 6** | **1** | Pin 7 (IO1) | GPIO1 | GPIO tự do / ADC1_CH0 / XTAL_32K_N |
| **Pin 7** | **6** | Pin 8 (IO6) | GPIO6 | GPIO tự do / ADC1_CH5 / FSPICLK |
| **Pin 8** | **7** | Pin 9 (IO7) | GPIO7 | GPIO tự do / FSPID (Strapping pin JTAG Source) |
| **Pin 9** | **8** | Pin 10 (IO8) | GPIO8 | GPIO tự do / PAD_COMP0 / SDIO_DATA0 |
| **Pin 10** | **9** | Pin 11 (IO9) | GPIO9 | GPIO tự do / PAD_COMP1 / SDIO_CLK |
| **Pin 11** | **10** | Pin 12 (IO10) | GPIO10 | GPIO tự do / FSPICS0 / SDIO_CMD |
| **Pin 12** | **26** | Pin 27 (IO26) | GPIO26 | **Strapping Pin Boot Mode Control** |
| **Pin 13** | **25** | Pin 26 (IO25) | GPIO25 | GPIO tự do / Strapping Pin SDIO Edge |
| **Pin 14** | **5V** | — | — | **Ngõ vào cấp nguồn 5.0V** cho bo (cấp vào ngõ vào LDO tạo 3.3V) |
| **Pin 15** | **G** | Pin 1, 28 (GND) | GND | Mass chung (Ground) |
| **Pin 16** | **NC** | — | — | Chân trống không kết nối |

### 3.2 Dãy Chân Bên Phải (Right Header - J7)
| Thứ tự chân | Tên in trên bo | Tên chân Module | Tên GPIO SoC | Chức năng phần cứng trên bo WeAct |
|:---:|:---:|:---:|:---:|---|
| **Pin 1** | **G** | Pin 1, 28 (GND) | GND | Mass chung (Ground) |
| **Pin 2** | **TX0** | Pin 25 (TX0) | GPIO11 | UART0 TXD (nối IC chuyển đổi Type-C UART CH343 trên bo) |
| **Pin 3** | **RX0** | Pin 24 (RX0) | GPIO12 | UART0 RXD (nối IC chuyển đổi Type-C UART CH343 trên bo) |
| **Pin 4** | **24** | Pin 23 (IO24) | GPIO24 | GPIO tự do |
| **Pin 5** | **23** | Pin 21 (IO23) | GPIO23 | GPIO tự do |
| **Pin 6** | **15 (N/15)**| Pin 19 (NC/IO15)| GPIO15 | **Chân chọn chip SPI PSRAM (SPICS1): Không được sử dụng** |
| **Pin 7** | **27** | Pin 18 (IO27) | GPIO27 | Nối vào đèn **LED RGB (`RGB@27`)** trên bo WeAct (Strapping pin) |
| **Pin 8** | **4** | Pin 17 (IO4) | GPIO4 | GPIO tự do / ADC1_CH3 / LP_UART_RXD / JTAG MTCK |
| **Pin 9** | **5** | Pin 16 (IO5) | GPIO5 | GPIO tự do / ADC1_CH4 / LP_UART_TXD / JTAG MTDO |
| **Pin 10** | **NC** | — | — | Chân trống không kết nối |
| **Pin 11** | **28** | Pin 15 (IO28) | GPIO28 | **Strapping Pin Boot Mode (Nối nút nhấn BOOT trên bo WeAct)** |
| **Pin 12** | **G** | Pin 1, 28 (GND) | GND | Mass chung (Ground) |
| **Pin 13** | **14** | Pin 14 (IO14) | GPIO14 | **Đường tín hiệu USB D+ (Nối trực tiếp cổng Type-C USB native)** |
| **Pin 14** | **13** | Pin 13 (IO13) | GPIO13 | **Đường tín hiệu USB D- (Nối trực tiếp cổng Type-C USB native)** |
| **Pin 15** | **G** | Pin 1, 28 (GND) | GND | Mass chung (Ground) |
| **Pin 16** | **NC** | — | — | Chân trống không kết nối |

---

## 4. Bảng Cấu Hình Chân Khởi Động (Strapping Pins) & Chế Độ Boot Chuẩn Datasheet

Tại thời điểm cấp nguồn hoặc Reset phần cứng (khi chân `CHIP_PU` chuyển từ mức thấp lên mức cao), chip ESP32-C5 sẽ lấy mẫu trạng thái logic trên các chân **Strapping Pins** để xác định chế độ vận hành:

### 4.1 Bảng Điều Khiển Chế Độ Khởi Động (Boot Mode Control - Chuẩn Espressif Datasheet)
| Chế độ Boot (Boot Mode) | GPIO26 | GPIO27 | GPIO28 | Phương thức nạp & Ý nghĩa vận hành |
|---|:---:|:---:|:---:|---|
| **SPI Boot (Mặc định)** | **Tùy ý (x)** | **Tùy ý (x)** | **1 (Mức cao)** | **Chế độ chạy bình thường:** ROM Bootloader đọc và thực thi firmware từ SPI Flash nội bộ. |
| **Joint Download Boot 0** | **Tùy ý (x)** | **1 (Mức cao)** | **0 (Mức thấp)** | **Chế độ nạp code 0:** Hỗ trợ nạp firmware qua cổng **USB Serial/JTAG native (GPIO13/14)**, UART0 (TX0/RX0) hoặc SPI Slave. |
| **Joint Download Boot 1** | **0 (Mức thấp)** | **0 (Mức thấp)** | **0 (Mức thấp)** | **Chế độ nạp code 1:** Hỗ trợ nạp firmware qua cổng UART0 hoặc SDIO. |

> [!IMPORTANT]
> **Quy tắc thiết kế phần cứng đối với Strapping Pins:**
> 1. **Chân GPIO28:** Datasheet SoC cho biết GPIO28 mặc định có pull-up nội (chế độ SPI Boot bình thường). Nút BOOT trên bo WeAct ESP32-C5-A được nối kéo GPIO28 xuống GND khi nhấn để chuyển sang chế độ Download Boot khi cần nạp firmware thủ công.
> 2. **Chân GPIO27:** Tham gia chọn boot mode và điều khiển ROM message print. GPIO27 mặc định pull-up theo datasheet SoC; mọi LED/mạch ngoài nối chân này cần được kiểm tra để không làm sai mức lúc reset.
> 3. **Chân GPIO2/MTMS & GPIO3/MTDI:** Đây là các strap inputs theo datasheet SoC. MTDI kết hợp với GPIO25 để đặt cạnh lấy mẫu/điều khiển SDIO; tránh ép mức logic trong lúc reset nếu chưa kiểm tra bảng boot configuration đầy đủ.

### 4.2 Thời Gian Đáp Ứng Chân Strapping (Timing Parameters)
- **Thời gian thiết lập ($t_{SU}$ - Setup Time):** Tối thiểu **$0\text{ ms}$** (thời gian đường nguồn ổn định trước khi `CHIP_PU` lên cao).
- **Thời gian duy trì ($t_H$ - Hold Time):** Tối thiểu **$3\text{ ms}$** (thời gian chip đọc giá trị chốt trên chân Strapping sau khi `CHIP_PU` lên cao trước khi giải phóng các chân làm GPIO thông thường).

---

## 5. Ghép Kênh Ngoại Vi & Cụm Chức Năng Phần Cứng (Peripheral Multiplexing)

### 5.1 Bộ Chuyển Đổi Tương Tự - Số ADC (Analog to Digital Converter)
ESP32-C5 tích hợp khối **SAR ADC 12-bit** hỗ trợ lấy mẫu trên 6 kênh (ghép kênh với các chân từ GPIO1 đến GPIO6):
- **ADC1_CH0:** GPIO1 (Pin 7 Module)
- **ADC1_CH1:** GPIO2 (Pin 4 Module)
- **ADC1_CH2:** GPIO3 (Pin 5 Module)
- **ADC1_CH3:** GPIO4 (Pin 17 Module)
- **ADC1_CH4:** GPIO5 (Pin 16 Module)
- **ADC1_CH5:** GPIO6 (Pin 8 Module)

### 5.2 Giao Tiếp USB Serial/JTAG Native
- **USB_D-:** GPIO13 (Pin 13 Module / Header Phải Pin 14)
- **USB_D+:** GPIO14 (Pin 14 Module / Header Phải Pin 13)
- Hỗ trợ giao tiếp trực tiếp chuẩn USB 2.0 Full-Speed (12 Mbps), cho phép nạp firmware tốc độ cao, gỡ lỗi JTAG không cần mạch nạp ngoài, và tạo cổng Virtual COM port CDC. Trên bo WeAct, 2 chân này được nối trực tiếp vào cổng Type-C USB native.

### 5.3 Cổng Giao Tiếp Nối Tiếp UART
- **UART0 (Cổng nạp mặc định & Debug Console):**  
  - TXD: GPIO11 (Pin 25 Module / Header Phải Pin 2)  
  - RXD: GPIO12 (Pin 24 Module / Header Phải Pin 3)  
  *(Được nối vào IC cầu chuyển đổi CH343 sang cổng Type-C UART trên bo WeAct).*
- **LP_UART (Low-Power UART):** LP_U0TXD (GPIO5), LP_U0RXD (GPIO4), LP_U0CTS (GPIO3), LP_U0RTS (GPIO2).

---

## 6. Giới Hạn Điện Áp, Điều Kiện Hoạt Động & Đặc Tính I/O

### 6.1 Giới Hạn Tuyệt Đối và Lưu Ý Nhiệt Độ
| Ký hiệu | Thông số | Min | Max | Đơn vị | Nguồn |
|---|---|:---:|:---:|:---:|---|
| $V_{DD33}$ (module) | Điện áp nguồn tuyệt đối | -0.3 | +3.6 | V | Module datasheet v1.3, Table 6-1 |
| $T_{STORE}$ (SoC) | Nhiệt độ lưu kho của SoC; không áp dụng tự động cho module | -40 | +150 | °C | SoC datasheet v1.5, Table 5-1 |
| $T_A$ (module) | Nhiệt độ môi trường hoạt động khuyến nghị | -40 | +85 | °C | Module datasheet v1.3, Table 6-2 |
| $V_{IN}$ (GPIO) | Mức vào DC từ -0.3V tới $V_{DD}+0.3V$ | -0.3 | 3.6V khi $V_{DD}=3.3V$ | V | SoC datasheet v1.5, Table 5-4 |

> [!NOTE]
> Datasheet SoC quy định $T_{STORE}=-40..150^\circ C$ cho chip. Datasheet module v1.3 mô tả điều kiện bảo quản trong túi chống ẩm nhưng không đưa ra giới hạn $T_{STORE}$ riêng cho module. Không suy ra $+85^\circ C$ là nhiệt độ lưu kho; $T_A=-40..+85^\circ C$ là nhiệt độ môi trường hoạt động khuyến nghị.

> [!CAUTION]
> Không cấp tín hiệu 5V trực tiếp vào GPIO. Khi $V_{DD}=3.3V$, giới hạn mức vào theo bảng DC là $V_{DD}+0.3V=3.6V$; phải kiểm tra mức ra của mọi cảm biến/module ngoại vi.


### 6.2 Điều Kiện Hoạt Động Khuyến Nghị (Recommended Operating Conditions)
| Ký hiệu (Symbol) | Thông số kỹ thuật (Parameter) | Min | Điển hình (Typ) | Max | Đơn vị (Unit) |
|---|---|:---:|:---:|:---:|:---:|
| **VDD33** | Điện áp cấp nguồn danh định | **3.0** | **3.3** | **3.6** | **V** |
| **$I_{VDD}$** | Khả năng cấp dòng cộng dồn tối thiểu của nguồn 3.3V | **0.6** | — | — | **A** |
| **$T_A$** | Nhiệt độ môi trường hoạt động khuyến nghị | -40 | 25 | +85 | °C |

### 6.3 Đặc Tính Dòng I/O DC (3.3V, 25°C)
- **Điện áp mức CAO ($V_{IH}$):** $0.75 \times V_{DD}$ đến $V_{DD} + 0.3\text{ V}$.
- **Điện áp mức THẤP ($V_{IL}$):** $-0.3\text{ V}$ đến $0.25 \times V_{DD}$.
- **Dòng cấp/hút đo được ở điều kiện thử nghiệm (Test Condition Drive Strength):**
  - Dòng nguồn (Source current) điển hình trong điều kiện thử nghiệm: **40 mA** ($V_{DD}=3.3V$, $V_{OH}\ge2.64V$, `PAD_DRIVER=3`).
  - Dòng hút (Sink current) trong điều kiện thử nghiệm datasheet: **28 mA typ** ($V_{DD}=3.3V$, $V_{OL}=0.495V$, `PAD_DRIVER=3`).
  - *Lưu ý thiết kế:* 40mA/28mA là điểm đo đặc tính I/O, không phải dòng tải liên tục được khuyến nghị. Tính dòng từng chân và tổng rail theo datasheet; tải công suất (relay, motor, servo) cần transistor/driver ngoài.

### 6.4 Dòng Tiêu Thụ Đỉnh Khi Phát/Thu Sóng RF (RF Current Consumption)
- Các trị số dưới đây là phép đo RF trong datasheet module ESP32-C5-WROOM-1 v1.3 tại 3.3V, 25°C; không phải tổng dòng tiêu thụ của bo phát triển.
- **Wi-Fi 2.4 GHz TX đỉnh:** **313 mA** (802.11b, 1 Mbps @ 19 dBm).
- **Wi-Fi 5 GHz TX đỉnh:** **403 mA** (802.11a, 6 Mbps @ 16.5 dBm).
- **802.15.4 TX đỉnh (Zigbee/Thread):** **321 mA** (@ 19 dBm).
- **Dòng tiêu thụ ở chế độ thu sóng (RX Mode):**
  - **Wi-Fi 2.4 GHz RX:** **87 mA** (ở chế độ HT20) và **91 mA** (ở chế độ HT40).
  - **Wi-Fi 5 GHz RX:** **110 mA** (ở chế độ HT20) và **113 mA** (ở chế độ HT40).

---

## 7. Tài Liệu Kỹ Thuật Tham Chiếu Chính Thức (Official References)

1. **Espressif Systems:**
    - *ESP32-C5 Series SoC Datasheet* (v1.5: Tables 5-1/5-2/5-4 về giới hạn, nguồn và I/O; Tables 5-7 đến 5-10 về dòng RF TX/RX): [datasheet chính thức](https://documentation.espressif.com/esp32-c5_datasheet_en.html).
    - *ESP32-C5-WROOM-1 & ESP32-C5-WROOM-1U Module Datasheet* (v1.3: Table 3-1 pin module; Tables 6-1/6-2 điện áp và nhiệt độ hoạt động; Tables 6-3 đến 6-7 điện I/O và RF): [datasheet chính thức](https://documentation.espressif.com/esp32-c5-wroom-1_wroom-1u_datasheet_en.html).
   - *ESP32-C5 Technical Reference Manual* (Chương IO MUX and GPIO Matrix, Strapping Pins & Boot Configuration).
2. **WeAct Studio:**
   - *WeAct Studio ESP32-C5-A Core Board Schematic v1.0 & Pinout Diagram* ([WeActStudio GitHub](https://github.com/WeActStudio/WeActStudio.ESP32-C5-A)).

