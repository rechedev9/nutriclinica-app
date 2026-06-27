-- Tabla de usuarios gestionable (sustituye al dict USUARIOS hardcodeado).
-- El seed de usuarios iniciales (admin, Jose) se inserta en código (hash bcrypt en runtime).

CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol           TEXT DEFAULT 'user',
    creado        TEXT DEFAULT (datetime('now','localtime'))
);
