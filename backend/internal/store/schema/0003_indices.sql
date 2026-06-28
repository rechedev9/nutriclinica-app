-- Indices sobre las claves foraneas. Sin ellos, cada consulta que filtra por
-- una FK (lineas de una compra/venta, fotos/revisiones de un paciente, etc.)
-- hace un full scan. Son idempotentes (IF NOT EXISTS) y no alteran datos.

CREATE INDEX IF NOT EXISTS idx_revisiones_paciente        ON revisiones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_fotos_paciente             ON fotos(paciente_id);

CREATE INDEX IF NOT EXISTS idx_productos_categoria        ON stock_productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor        ON stock_productos(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor          ON stock_compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_lineas_compra      ON stock_compras_lineas(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_lineas_producto    ON stock_compras_lineas(producto_id);

CREATE INDEX IF NOT EXISTS idx_ventas_paciente            ON stock_ventas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_lineas_venta        ON stock_ventas_lineas(venta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_lineas_producto     ON stock_ventas_lineas(producto_id);
