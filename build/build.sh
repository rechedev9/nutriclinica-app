#!/usr/bin/env bash
# Build de NutriClínica para Windows y macOS.
# 1) Compila el SPA (Vite) y lo copia a backend/web/dist (embebido por Go).
# 2) Cross-compila el binario Go para win/amd64, darwin/arm64 y darwin/amd64.
#
# Uso:  ./build/build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Build del frontend (pnpm build)..."
( cd "$ROOT/frontend" && pnpm install --frozen-lockfile && pnpm build )

echo "==> Cross-compilando binarios Go..."
DIST="$ROOT/dist"
mkdir -p "$DIST"
cd "$ROOT/backend"

build() {
  local os="$1" arch="$2" out="$3"
  echo "    -> $os/$arch"
  GOOS="$os" GOARCH="$arch" CGO_ENABLED=0 \
    go build -trimpath -ldflags '-s -w' -o "$DIST/$out" ./cmd/nutriclinica
}

build windows amd64 NutriClinica-win-amd64.exe
build darwin  arm64 NutriClinica-mac-arm64
build darwin  amd64 NutriClinica-mac-amd64

echo "==> Ensamblando carpetas distribuibles..."

# Windows: ejecutable + icono + creador de acceso directo + LEEME.
WIN="$DIST/NutriClinica-Windows"
mkdir -p "$WIN"
cp "$DIST/NutriClinica-win-amd64.exe" "$WIN/NutriClinica.exe"
cp "$ROOT/icono_nutri.ico" "$WIN/icono_nutri.ico"
cp "$ROOT/deploy/Crear acceso directo.bat" "$WIN/"
cp "$ROOT/deploy/crear-acceso-directo.ps1" "$WIN/"
cp "$ROOT/deploy/LEEME.txt" "$WIN/"

# macOS: binarios (arm64 + amd64) + lanzador .command + LEEME.
MAC="$DIST/NutriClinica-macOS"
mkdir -p "$MAC"
cp "$DIST/NutriClinica-mac-arm64" "$MAC/"
cp "$DIST/NutriClinica-mac-amd64" "$MAC/"
cp "$ROOT/deploy/NutriClinica.command" "$MAC/"
chmod +x "$MAC/NutriClinica.command" "$MAC/NutriClinica-mac-arm64" "$MAC/NutriClinica-mac-amd64"
cp "$ROOT/deploy/LEEME.txt" "$MAC/"

echo "==> Listo."
echo "    Binarios sueltos:      $DIST"
echo "    Carpeta Windows lista: $WIN"
echo "    Carpeta macOS lista:   $MAC"
