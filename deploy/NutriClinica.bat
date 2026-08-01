@echo off
rem Lanzador de NutriClinica para Windows. Carga "pg.env" (obligatorio: son las
rem credenciales de conexion a la base de datos PostgreSQL/RDS, sin ellas la
rem app no arranca) y, si existe, "aws-backup.env" (opcional, backup a S3).
cd /d "%~dp0"

if not exist "pg.env" (
  echo No encuentro "pg.env" en esta carpeta.
  echo Copia "pg.env.example" como "pg.env" y rellena tus datos de conexion a Postgres/RDS.
  pause
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("pg.env") do (
  if not "%%A"=="" set "%%A=%%B"
)

if exist "aws-backup.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("aws-backup.env") do (
    if not "%%A"=="" set "%%A=%%B"
  )
)

"%~dp0NutriClinica.exe"
