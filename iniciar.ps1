# FotoClinica - Lanzador
$Host.UI.RawUI.WindowTitle = "FotoClinica"
$Host.UI.RawUI.BackgroundColor = "Black"
Clear-Host

# ── Colores ──────────────────────────────────────────────────────────────────
function Write-Header {
    Write-Host ""
    Write-Host "  ███████╗ ██████╗ ████████╗ ██████╗  " -ForegroundColor Cyan
    Write-Host "  ██╔════╝██╔═══██╗╚══██╔══╝██╔═══██╗ " -ForegroundColor Cyan
    Write-Host "  █████╗  ██║   ██║   ██║   ██║   ██║ " -ForegroundColor Cyan
    Write-Host "  ██╔══╝  ██║   ██║   ██║   ██║   ██║ " -ForegroundColor Cyan
    Write-Host "  ██║     ╚██████╔╝   ██║   ╚██████╔╝ " -ForegroundColor Cyan
    Write-Host "  ╚═╝      ╚═════╝    ╚═╝    ╚═════╝  " -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "   Gestión de pacientes y fotografías  " -ForegroundColor DarkGray
    Write-Host "  ────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step([string]$msg) {
    Write-Host "  " -NoNewline
    Write-Host "→" -ForegroundColor DarkCyan -NoNewline
    Write-Host "  $msg" -ForegroundColor Gray
}

function Write-Ok([string]$msg) {
    Write-Host "  " -NoNewline
    Write-Host "✓" -ForegroundColor Green -NoNewline
    Write-Host "  $msg" -ForegroundColor White
}

function Write-Warn([string]$msg) {
    Write-Host "  " -NoNewline
    Write-Host "!" -ForegroundColor Yellow -NoNewline
    Write-Host "  $msg" -ForegroundColor Yellow
}

# ── Arranque ─────────────────────────────────────────────────────────────────
Write-Header

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Step "Comprobando dependencias..."
$pip = py -m pip install flask openpyxl --quiet --disable-pip-version-check 2>&1
Write-Ok "Dependencias listas"

Write-Step "Iniciando servidor..."
Start-Sleep -Milliseconds 400

$server = Start-Process -FilePath "py" -ArgumentList "app.py" -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden

Start-Sleep -Milliseconds 1500

Write-Ok "Servidor activo  →  http://localhost:5000"
Write-Host ""
Write-Host "  ────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:5000"

Write-Host "  Presiona " -NoNewline -ForegroundColor DarkGray
Write-Host "Ctrl+C" -NoNewline -ForegroundColor White
Write-Host " o cierra esta ventana para apagar." -ForegroundColor DarkGray
Write-Host ""

# Mantener vivo hasta que el usuario cierre
try {
    while (-not $server.HasExited) {
        Start-Sleep -Seconds 2
    }
} finally {
    if (-not $server.HasExited) { $server.Kill() }
    Write-Host ""
    Write-Warn "Servidor detenido."
    Write-Host ""
    Start-Sleep -Seconds 1
}
