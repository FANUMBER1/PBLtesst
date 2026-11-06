@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================================
echo   KHỞI ĐỘNG SORTIX-MED AI CAMERA TEST (DROIDCAM / YOLO)
echo ========================================================
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" test.py %*
) else (
    python test.py %*
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Chuong trinh ket thuc voi ma loi %ERRORLEVEL%.
)

pause

