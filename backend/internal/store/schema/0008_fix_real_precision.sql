-- Corrige un bug de la migración a Postgres: REAL en SQLite es doble
-- precisión (8 bytes, como un float64 de Go), pero en Postgres REAL es
-- precisión simple (4 bytes, float32). Las columnas numéricas se crearon
-- con el tipo equivocado, así que valores como 58.3 se guardaban redondeados
-- a la precisión de float32 (p.ej. 58.29999923706055). Se amplían a
-- DOUBLE PRECISION (el equivalente correcto). Ensanchar real -> double
-- precision es una conversión segura (no trunca), pero los valores ya
-- guardados con precisión perdida no se recuperan solos aquí: hace falta
-- volver a importar los datos reales desde el origen (cmd/migrate_to_postgres)
-- después de aplicar esta migración.

ALTER TABLE pacientes
  ALTER COLUMN peso  TYPE DOUBLE PRECISION,
  ALTER COLUMN talla TYPE DOUBLE PRECISION;

ALTER TABLE revisiones
  ALTER COLUMN peso            TYPE DOUBLE PRECISION,
  ALTER COLUMN talla           TYPE DOUBLE PRECISION,
  ALTER COLUMN envergadura     TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_bicipital    TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_tricipital   TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_subescapular TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_supraespinal TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_supracrestal TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_abdominal    TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_muslo_int    TYPE DOUBLE PRECISION,
  ALTER COLUMN pl_pierna_med   TYPE DOUBLE PRECISION,
  ALTER COLUMN per_antebrazo   TYPE DOUBLE PRECISION,
  ALTER COLUMN per_brazo_rel   TYPE DOUBLE PRECISION,
  ALTER COLUMN per_brazo_cont  TYPE DOUBLE PRECISION,
  ALTER COLUMN per_hombros     TYPE DOUBLE PRECISION,
  ALTER COLUMN per_pecho       TYPE DOUBLE PRECISION,
  ALTER COLUMN per_cintura     TYPE DOUBLE PRECISION,
  ALTER COLUMN per_caderas     TYPE DOUBLE PRECISION,
  ALTER COLUMN per_muslo       TYPE DOUBLE PRECISION,
  ALTER COLUMN per_muslo_cont  TYPE DOUBLE PRECISION,
  ALTER COLUMN per_gemelo      TYPE DOUBLE PRECISION;

ALTER TABLE stock_productos
  ALTER COLUMN precio_coste TYPE DOUBLE PRECISION,
  ALTER COLUMN precio_venta TYPE DOUBLE PRECISION,
  ALTER COLUMN stock_minimo TYPE DOUBLE PRECISION;

ALTER TABLE stock_compras
  ALTER COLUMN total TYPE DOUBLE PRECISION;

ALTER TABLE stock_compras_lineas
  ALTER COLUMN cantidad        TYPE DOUBLE PRECISION,
  ALTER COLUMN precio_unitario TYPE DOUBLE PRECISION;

ALTER TABLE stock_ventas
  ALTER COLUMN total TYPE DOUBLE PRECISION;

ALTER TABLE stock_ventas_lineas
  ALTER COLUMN cantidad        TYPE DOUBLE PRECISION,
  ALTER COLUMN precio_unitario TYPE DOUBLE PRECISION;

ALTER TABLE stock_mermas
  ALTER COLUMN cantidad TYPE DOUBLE PRECISION;
