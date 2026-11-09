@echo off
chcp 65001 >nul
echo ========================================================
echo   ADSINSIGHT PRO - AUTO DEPLOY LEN GITHUB AN TOAN
echo ========================================================
echo.

REM 1. Tim duong dan git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\bin\git.exe" (
        set "PATH=C:\Program Files\Git\bin;C:\Program Files\Git\cmd;%PATH%"
    ) else if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Git\bin\git.exe" (
        set "PATH=C:\Users\%USERNAME%\AppData\Local\Programs\Git\bin;C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd;%PATH%"
    ) else (
        echo [LOI] Khong tim thay Git tren may.
        pause
        exit /b
    )
)

REM 2. Cau hinh ten va email git neu chua co (tranh loi Please tell me who you are)
git config --global user.name >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Dang thiet lap danh tinh Git...
    git config --global user.name "Newbie8323"
    git config --global user.email "newbie8323@users.noreply.github.com"
)

REM 3. Khoi tao Git neu chua co
if not exist ".git" (
    echo [*] Dang khoi tao Git Repository...
    git init
    git branch -M main
    git remote add origin https://github.com/Newbie8323/google-ads-suite.git
)

echo [*] Dang chuan bi code... (File bi mat config.local.js se tu dong bi loai bo)
git add .
git commit -m "Auto update: %date% %time%"

echo [*] Dang dong bo tu GitHub ve truoc...
git pull origin main --rebase >nul 2>nul

echo [*] Dang day code len GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [THANH CONG] Code da duoc day len GitHub an toan!
    echo   Thong tin Google Sheet bi mat da duoc giu lai tai may.
    echo ========================================================
) else (
    echo.
    echo [Luu y] Neu lan dau day code, co the Git dang doi ban xac nhan dang nhap tren trinh duyet.
)
echo.
pause
