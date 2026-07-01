CREATE TABLE IF NOT EXISTS stock_mermas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id  INTEGER NOT NULL REFERENCES stock_productos(id),
  proveedor_id INTEGER REFERENCES stock_proveedores(id),
  cantidad     REAL    NOT NULL DEFAULT 1,
  motivo       TEXT    NOT NULL CHECK(motivo IN ('caducidad','accidente_rotura','devolucion_cliente')),
  fecha        TEXT,
  notas        TEXT,
  creado       TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_mermas_producto ON stock_mermas(producto_id);
