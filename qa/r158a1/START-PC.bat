@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 START-PC.py
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python START-PC.py
  goto :eof
)
echo.
echo Python 3 was not found on this PC.
echo Install Python 3 or run: python START-PC.py
echo.
pause
