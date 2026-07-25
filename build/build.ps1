# Build de NutriClínica para Windows y macOS.
# 1) Compila el SPA (Vite) y lo copia a backend/web/dist (embebido por Go).
# 2) Cross-compila el binario Go para win/amd64, darwin/arm64 y darwin/amd64.
#
# Uso:  pwsh build/build.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '==> Build del frontend (pnpm build)...' -ForegroundColor Cyan
Push-Location "$root/frontend"
pnpm install --frozen-lockfile
pnpm build
Pop-Location

Write-Host '==> Cross-compilando binarios Go...' -ForegroundColor Cyan
Push-Location "$root/backend"
$dist = "$root/dist"
New-Item -ItemType Directory -Force $dist | Out-Null

$targets = @(
  @{ os = 'windows'; arch = 'amd64'; out = 'NutriClinica-win-amd64.exe' },
  @{ os = 'darwin';  arch = 'arm64'; out = 'NutriClinica-mac-arm64' },
  @{ os = 'darwin';  arch = 'amd64'; out = 'NutriClinica-mac-amd64' }
)
foreach ($t in $targets) {
  Write-Host "    -> $($t.os)/$($t.arch)" -ForegroundColor DarkCyan
  $env:GOOS = $t.os
  $env:GOARCH = $t.arch
  $env:CGO_ENABLED = '0'
  go build -trimpath -ldflags '-s -w' -o "$dist/$($t.out)" ./cmd/nutriclinica
}
Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
Pop-Location

Write-Host '==> Ensamblando carpetas distribuibles...' -ForegroundColor Cyan

# Windows: ejecutable + icono + lanzador + creador de acceso directo + LEEME.
$win = "$dist/NutriClinica-Windows"
New-Item -ItemType Directory -Force $win | Out-Null
Copy-Item "$dist/NutriClinica-win-amd64.exe" "$win/NutriClinica.exe" -Force
Copy-Item "$root/icono_nutri.ico" "$win/icono_nutri.ico" -Force
Copy-Item "$root/deploy/NutriClinica.bat" $win -Force
Copy-Item "$root/deploy/Crear acceso directo.bat" $win -Force
Copy-Item "$root/deploy/crear-acceso-directo.ps1" $win -Force
Copy-Item "$root/deploy/aws-backup.env.example" $win -Force
Copy-Item "$root/deploy/LEEME.txt" $win -Force

# macOS: binarios (arm64 + amd64) + lanzador .command + LEEME.
$mac = "$dist/NutriClinica-macOS"
New-Item -ItemType Directory -Force $mac | Out-Null
Copy-Item "$dist/NutriClinica-mac-arm64" $mac -Force
Copy-Item "$dist/NutriClinica-mac-amd64" $mac -Force
Copy-Item "$root/deploy/NutriClinica.command" $mac -Force
Copy-Item "$root/deploy/aws-backup.env.example" $mac -Force
Copy-Item "$root/deploy/LEEME.txt" $mac -Force

Write-Host "==> Listo." -ForegroundColor Green
Write-Host "    Binarios sueltos:        $dist" -ForegroundColor Gray
Write-Host "    Carpeta Windows lista:   $win" -ForegroundColor Gray
Write-Host "    Carpeta macOS lista:     $mac" -ForegroundColor Gray
