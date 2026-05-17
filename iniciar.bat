@echo off
title NutriClinica
cd /d "%~dp0"
echo Instalando dependencias...
py -m pip install flask openpyxl --quiet --disable-pip-version-check
echo.
echo Iniciando NutriClinica en http://localhost:5001
echo Cierra esta ventana para apagar el servidor.
echo.
py app.py
pause
