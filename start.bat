@echo off
echo Liberando puerto 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    if not "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)
echo Puerto liberado. Iniciando servidor...
npm run start:dev
