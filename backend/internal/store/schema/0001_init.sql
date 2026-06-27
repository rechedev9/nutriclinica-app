-- Baseline schema. Copia EXACTA del init_db() de la app Flask original.
-- Sobre una BBDD existente, todos los CREATE ... IF NOT EXISTS son no-ops.

CREATE TABLE IF NOT EXISTS pacientes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT NOT NULL,
    fecha_nac        TEXT,
    sexo             TEXT,
    dni              TEXT,
    telefono         TEXT,
    email            TEXT,
    objetivo         TEXT,
    actividad_fisica TEXT,
    intolerancias    TEXT,
    patologias       TEXT,
    notas            TEXT,
    peso             REAL,
    talla            REAL,
    grupo_sanguineo  TEXT,
    creado           TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS revisiones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id     INTEGER NOT NULL,
    fecha           TEXT DEFAULT (date('now','localtime')),
    peso            REAL,
    talla           REAL,
    envergadura     REAL,
    pl_bicipital    REAL,
    pl_tricipital   REAL,
    pl_subescapular REAL,
    pl_supraespinal REAL,
    pl_supracrestal REAL,
    pl_abdominal    REAL,
    pl_muslo_int    REAL,
    pl_pierna_med   REAL,
    per_antebrazo   REAL,
    per_brazo_rel   REAL,
    per_brazo_cont  REAL,
    per_hombros     REAL,
    per_pecho       REAL,
    per_cintura     REAL,
    per_caderas     REAL,
    per_muslo       REAL,
    per_muslo_cont  REAL,
    per_gemelo      REAL,
    notas           TEXT,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

CREATE TABLE IF NOT EXISTS fotos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    filename    TEXT NOT NULL,
    nota        TEXT,
    fecha       TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

CREATE TABLE IF NOT EXISTS stock_categorias (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_proveedores (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT NOT NULL,
    telefono TEXT,
    email    TEXT,
    notas    TEXT
);

CREATE TABLE IF NOT EXISTS stock_productos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT NOT NULL,
    categoria_id INTEGER,
    proveedor_id INTEGER,
    precio_coste REAL DEFAULT 0,
    precio_venta REAL DEFAULT 0,
    unidad       TEXT DEFAULT 'ud',
    stock_minimo REAL DEFAULT 0,
    activo       INTEGER DEFAULT 1,
    creado       TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (categoria_id) REFERENCES stock_categorias(id),
    FOREIGN KEY (proveedor_id) REFERENCES stock_proveedores(id)
);

CREATE TABLE IF NOT EXISTS stock_compras (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha        TEXT DEFAULT (date('now','localtime')),
    proveedor_id INTEGER,
    notas        TEXT,
    total        REAL DEFAULT 0,
    FOREIGN KEY (proveedor_id) REFERENCES stock_proveedores(id)
);

CREATE TABLE IF NOT EXISTS stock_compras_lineas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id       INTEGER NOT NULL,
    producto_id     INTEGER NOT NULL,
    cantidad        REAL NOT NULL,
    precio_unitario REAL DEFAULT 0,
    FOREIGN KEY (compra_id)   REFERENCES stock_compras(id),
    FOREIGN KEY (producto_id) REFERENCES stock_productos(id)
);

CREATE TABLE IF NOT EXISTS stock_ventas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha       TEXT DEFAULT (date('now','localtime')),
    paciente_id INTEGER,
    notas       TEXT,
    total       REAL DEFAULT 0,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

CREATE TABLE IF NOT EXISTS stock_ventas_lineas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id        INTEGER NOT NULL,
    producto_id     INTEGER NOT NULL,
    cantidad        REAL NOT NULL,
    precio_unitario REAL DEFAULT 0,
    FOREIGN KEY (venta_id)    REFERENCES stock_ventas(id),
    FOREIGN KEY (producto_id) REFERENCES stock_productos(id)
);
