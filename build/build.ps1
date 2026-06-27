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
  go build -ldflags '-s -w' -o "$dist/$($t.out)" ./cmd/nutriclinica
}
Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
Pop-Location

Write-Host "==> Listo. Binarios en $dist" -ForegroundColor Green
Get-ChildItem $dist | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,1)}}
