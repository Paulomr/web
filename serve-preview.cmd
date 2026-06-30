@echo off
rem Wrapper para el panel de preview: garantiza Node en el PATH y el cwd correcto.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
call npm start
