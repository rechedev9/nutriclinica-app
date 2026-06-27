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
    go build -ldflags '-s -w' -o "$DIST/$out" ./cmd/nutriclinica
}

build windows amd64 NutriClinica-win-amd64.exe
build darwin  arm64 NutriClinica-mac-arm64
build darwin  amd64 NutriClinica-mac-amd64

echo "==> Listo. Binarios en $DIST"
ls -lh "$DIST"
