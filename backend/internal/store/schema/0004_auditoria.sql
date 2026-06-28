-- Registro de auditoría (RGPD): traza de quién hace qué sobre los datos.
-- Solo se registran operaciones que modifican o exportan datos; las lecturas
-- normales no se anotan para no inflar la tabla.

CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha     TEXT DEFAULT (datetime('now','localtime')),
    usuario   TEXT,
    metodo    TEXT,
    ruta      TEXT,
    estado    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(fecha);
