// Package naming replica EXACTAMENTE las funciones nombre_a_prefijo y
// nombre_a_carpeta de la app Flask original (app.py). Las carpetas de fotos
// ya existen en disco con estos nombres: cualquier desviación rompería el
// acceso a las fotos antiguas.
package naming

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// stripAccents replica unicodedata.normalize('NFKD', s).encode('ascii','ignore'):
// descompone (NFKD) y conserva solo runas ASCII (<128), descartando marcas
// combinantes y cualquier carácter no ASCII.
func stripAccents(s string) string {
	decomposed := norm.NFKD.String(s)
	var b strings.Builder
	for _, r := range decomposed {
		if r < 128 {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Prefijo replica nombre_a_prefijo: minúsculas, palabras unidas por '_'.
//
//	"José Pérez Gómez" -> "jose_perez_gomez"
func Prefijo(nombre string) string {
	n := stripAccents(nombre)
	return strings.Join(strings.Fields(strings.ToLower(n)), "_")
}

// Carpeta replica nombre_a_carpeta: cada palabra capitalizada (primera letra
// mayúscula, resto minúsculas), unidas sin separador.
//
//	"José Pérez Gómez" -> "JosePerezGomez"
func Carpeta(nombre string) string {
	n := stripAccents(nombre)
	var b strings.Builder
	for _, w := range strings.Fields(n) {
		b.WriteString(capitalize(w))
	}
	return b.String()
}

// capitalize replica str.capitalize() de Python: primera runa en mayúscula,
// el resto en minúsculas.
func capitalize(w string) string {
	if w == "" {
		return ""
	}
	runes := []rune(w)
	out := make([]rune, len(runes))
	out[0] = unicode.ToUpper(runes[0])
	for i := 1; i < len(runes); i++ {
		out[i] = unicode.ToLower(runes[i])
	}
	return string(out)
}
