# Crea un acceso directo a NutriClínica en el escritorio del usuario.
# Debe ejecutarse desde la carpeta donde está NutriClinica.exe (junto a icono_nutri.ico).
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

$exe = Get-ChildItem -Path $here -Filter 'NutriClinica*.exe' -File |
  Where-Object { $_.Name -notlike '*acceso*' } |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $exe) {
  Write-Host 'No encuentro NutriClinica.exe junto a este script.' -ForegroundColor Red
  Write-Host 'Coloca este script en la misma carpeta que el ejecutable.' -ForegroundColor Red
  Read-Host 'Pulsa Enter para salir'
  exit 1
}

$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'NutriClínica.lnk'

$ws  = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath       = $exe
$lnk.WorkingDirectory = $here
$lnk.Description       = 'NutriClínica - gestión de pacientes'
$icon = Join-Path $here 'icono_nutri.ico'
if (Test-Path $icon) { $lnk.IconLocation = $icon }
$lnk.Save()

Write-Host ''
Write-Host "  Acceso directo creado en el escritorio:" -ForegroundColor Green
Write-Host "  $lnkPath" -ForegroundColor White
Write-Host ''
Write-Host "  Haz doble clic en 'NutriClínica' para abrir la aplicación." -ForegroundColor Gray
Write-Host ''
