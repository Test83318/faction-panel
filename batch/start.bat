@echo off
echo Starting Faction Panel Environment...

:: Start Backend in a new window
start "Backend" cmd /c "backend.bat"

:: Start Frontend in a new window
start "Frontend" cmd /c "frontend.bat"

echo Environment is starting.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000

:: Wait a moment for services to initialize then open browser
timeout /t 5 /nobreak > nul
start http://localhost:3000

exit
