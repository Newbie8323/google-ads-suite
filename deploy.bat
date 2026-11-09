@echo off
chcp 65001 >nul
echo ========================================================
echo   ADSINSIGHT PRO - AUTO DEPLOY LEN GITHUB AN TOAN
echo ========================================================
echo.

set "PATH=C:\Program Files\Git\bin;C:\Program Files\Git\cmd;%PATH%"

echo [*] Dang chuan bi code... (File config.local.js duoc giu lai tai may)
git add .
git commit -m "Auto update: %date% %time%" >nul 2>nul

echo [*] Dang day code len GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [THANH CONG] Code da duoc day len GitHub an toan!
    echo   Trang web online se cap nhat trong 1-2 phut.
    echo ========================================================
) else (
    echo.
    echo [Loi] Khong the day code len GitHub. Vui long kiem tra lai mang.
)
echo.
pause
