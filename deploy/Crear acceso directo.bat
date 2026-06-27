@echo off
chcp 65001 >nul
rem Doble clic aqui para crear el acceso directo de NutriClinica en el escritorio.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear-acceso-directo.ps1"
pause
