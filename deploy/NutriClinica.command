#!/usr/bin/env bash
# Lanzador de NutriClínica para macOS. Doble clic para abrir la aplicación.
# Para tenerlo "en el escritorio": arrastra este archivo al Escritorio (o crea un alias).
cd "$(dirname "$0")" || exit 1

ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then
  BIN="NutriClinica-mac-arm64"
else
  BIN="NutriClinica-mac-amd64"
fi

if [ ! -f "$BIN" ]; then
  echo "No encuentro el binario $BIN en esta carpeta."
  read -r -p "Pulsa Enter para salir."
  exit 1
fi

chmod +x "$BIN" 2>/dev/null
# Quitar el atributo de cuarentena de Gatekeeper en la primera ejecución (binario sin firmar).
xattr -dr com.apple.quarantine "$BIN" 2>/dev/null || true

exec "./$BIN"
