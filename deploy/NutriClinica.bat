@echo off
rem Lanzador de NutriClinica para Windows. Si existe "aws-backup.env" en esta
rem misma carpeta, carga esas variables (credenciales de AWS) antes de abrir
rem la app, para activar el backup automatico a S3.
cd /d "%~dp0"

if exist "aws-backup.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("aws-backup.env") do (
    if not "%%A"=="" set "%%A=%%B"
  )
)

"%~dp0NutriClinica.exe"
