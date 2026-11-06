param (
    [string]$Port = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SortiX Conveyor Firmware - Nạp Firmware WeAct ESP32-C5" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrWhiteSpace($Port)) {
    # Thử tự động dò cổng COM nối với ESP32 / CH343
    $detected = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Caption -match "(COM\d+)" -and ($_.Caption -match "CH34" -or $_.Caption -match "USB-Enhanced-SERIAL" -or $_.Caption -match "Serial") } | Select-Object -First 1
    if ($detected -and ($detected.Caption -match "(COM\d+)")) {
        $Port = $matches[1]
        Write-Host "Tự động phát hiện cổng: $Port ($($detected.Caption))" -ForegroundColor Green
    } else {
        $Port = Read-Host "Nhập cổng COM của ESP32-C5 (ví dụ COM3, COM4, COM5)"
    }
}

if ([string]::IsNullOrWhiteSpace($Port)) {
    $Port = "COM3"
}

Write-Host "`nĐang nạp firmware vào cổng $Port..." -ForegroundColor Yellow

$esptoolCmd = "python -m esptool --chip esp32c5 -p $Port -b 460800 --before default_reset --after hard_reset --no-stub write_flash --flash_mode dio --flash_size 8MB --flash_freq 80m 0x2000 build\bootloader\bootloader.bin 0x8000 build\partition_table\partition-table.bin 0xf000 build\ota_data_initial.bin 0x20000 build\sortix-firmware.bin"

Invoke-Expression $esptoolCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host "[THÀNH CÔNG] Firmware đã nạp thành công vào ESP32-C5!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "`nHƯỚNG DẪN KẾT NỐI WI-FI TẠI NHÀ BẠN:" -ForegroundColor Cyan
    Write-Host "1. Sau khi nạp, nhấn nút RST (hoặc cắm lại cáp USB) để khởi động."
    Write-Host "2. Chờ 10 giây, ESP32-C5 sẽ tự động phát mạng Wi-Fi:"
    Write-Host "     - Tên Wi-Fi (SSID): SortiX-Setup" -ForegroundColor Yellow
    Write-Host "     - Mật khẩu:         12345678" -ForegroundColor Yellow
    Write-Host "3. Dùng điện thoại hoặc laptop kết nối vào mạng 'SortiX-Setup'."
    Write-Host "4. Trình duyệt tự mở (hoặc truy cập http://192.168.4.1)."
    Write-Host "5. Nhập tên và mật khẩu Wi-Fi nhà bạn rồi nhấn 'Save & Restart'."
    Write-Host "6. ESP32-C5 sẽ lưu vào bộ nhớ flash và tự động kết nối Internet!`n"
} else {
    Write-Host "`n============================================================" -ForegroundColor Red
    Write-Host "[LỖI] Quá trình nạp chưa thành công!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "Hãy kiểm tra: đúng cổng COM, đã cài driver CH343, hoặc cài esptool (pip install esptool).`n"
}

