@echo off
chcp 65001 >nul
echo ============================================================
echo   SortiX Conveyor Firmware - Nạp Firmware WeAct ESP32-C5
echo ============================================================
echo.

set /p COMPORT="Nhập cổng COM của ESP32-C5 (ví dụ COM3, COM4, COM5): "
if "%COMPORT%"=="" (
    echo Chưa nhập cổng COM, thử tự động nhận diện hoặc dùng COM3...
    set COMPORT=COM3
)

echo.
echo Đang nạp firmware vào cổng %COMPORT%...
python -m esptool --chip esp32c5 -p %COMPORT% -b 460800 --before default_reset --after hard_reset --no-stub write_flash --flash_mode dio --flash_size 8MB --flash_freq 80m 0x2000 build\bootloader\bootloader.bin 0x8000 build\partition_table\partition-table.bin 0xf000 build\ota_data_initial.bin 0x20000 build\sortix-firmware.bin

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [THÀNH CÔNG] Firmware đã được nạp hoàn tất vào ESP32-C5!
    echo ============================================================
    echo.
    echo HƯỚNG DẪN KẾT NỐI WI-FI TẠI NHÀ BẠN:
    echo 1. Sau khi nạp xong, nhấn nút RST (hoặc cắm lại cáp USB) để khởi động.
    echo 2. Chờ 10 giây, ESP32-C5 sẽ tự động phát mạng Wi-Fi:
    echo      - Tên Wi-Fi (SSID): SortiX-Setup
    echo      - Mật khẩu:         12345678
    echo 3. Dùng điện thoại hoặc laptop kết nối vào mạng 'SortiX-Setup'.
    echo 4. Trình duyệt sẽ tự mở (hoặc tự vào địa chỉ http://192.168.4.1).
    echo 5. Nhập tên Wi-Fi và Mật khẩu Wi-Fi nhà bạn rồi nhấn 'Save ^& Restart'.
    echo 6. ESP32-C5 sẽ lưu vĩnh viễn vào bộ nhớ flash và tự động kết nối Internet!
    echo.
) else (
    echo.
    echo ============================================================
    echo [LỖI] Quá trình nạp chưa thành công!
    echo ============================================================
    echo Hãy kiểm tra các bước sau:
    echo 1. Kiểm tra đúng cổng COM trong Device Manager (Ports COM ^& LPT).
    echo 2. Đảm bảo đã cài driver USB UART CH343 cho bo WeAct.
    echo 3. Thử giữ nút BOOT trên bo mạch, cắm cáp USB rồi nhấn nạp lại.
    echo 4. Cài đặt thư viện esptool nếu máy chưa có: pip install esptool
    echo.
)
pause

