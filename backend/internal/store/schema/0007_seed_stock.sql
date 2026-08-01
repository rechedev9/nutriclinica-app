-- Datos de ejemplo para tienda de nutrición deportiva.
-- Solo se aplica si las tablas de stock están vacías (idempotente).

-- CATEGORÍAS
INSERT INTO stock_categorias (nombre)
SELECT nombre FROM (
    SELECT 'Proteínas'                   AS nombre
    UNION ALL SELECT 'Creatina y Aminoácidos'
    UNION ALL SELECT 'Pre-entreno'
    UNION ALL SELECT 'Vitaminas y Minerales'
    UNION ALL SELECT 'Quemagrasas'
    UNION ALL SELECT 'Barritas y Snacks'
    UNION ALL SELECT 'Bebidas Deportivas'
    UNION ALL SELECT 'Colágeno y Articulaciones'
)
WHERE NOT EXISTS (SELECT 1 FROM stock_categorias);

-- PROVEEDORES
INSERT INTO stock_proveedores (nombre, telefono, email, notas)
SELECT nombre, telefono, email, notas FROM (
    SELECT 'HSN Store'      AS nombre, '958 461 743' AS telefono, 'pedidos@hsn.es'                 AS email, 'Proveedor online principal'              AS notas
    UNION ALL SELECT 'Amix Nutrition', '936 788 200', 'comercial@amix-nutrition.com', 'Distribución directa'
    UNION ALL SELECT 'Weider Spain',   '916 452 100', 'pedidos@weider.es',            'Pedidos mínimo 200 €'
    UNION ALL SELECT 'Best Protein',   '917 234 567', 'info@bestprotein.es',          'Especialistas en proteína vegana'
)
WHERE NOT EXISTS (SELECT 1 FROM stock_proveedores);

-- PRODUCTOS
INSERT INTO stock_productos (nombre, categoria_id, proveedor_id, precio_coste, precio_venta, unidad, stock_minimo)
SELECT nombre, categoria_id, proveedor_id, precio_coste, precio_venta, unidad, stock_minimo FROM (
    -- Proteínas
    SELECT 'Whey Protein Concentrada 1 kg' AS nombre,
           (SELECT id FROM stock_categorias WHERE nombre='Proteínas') AS categoria_id,
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store') AS proveedor_id,
           18.90 AS precio_coste, 27.90 AS precio_venta, 'kg' AS unidad, 5 AS stock_minimo
    UNION ALL
    SELECT 'Whey Protein Isolada 1 kg',
           (SELECT id FROM stock_categorias WHERE nombre='Proteínas'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           24.50, 34.90, 'kg', 3
    UNION ALL
    SELECT 'Proteína Vegana 1 kg',
           (SELECT id FROM stock_categorias WHERE nombre='Proteínas'),
           (SELECT id FROM stock_proveedores WHERE nombre='Best Protein'),
           22.00, 32.90, 'kg', 2
    UNION ALL
    SELECT 'Caseína Micelar 1 kg',
           (SELECT id FROM stock_categorias WHERE nombre='Proteínas'),
           (SELECT id FROM stock_proveedores WHERE nombre='Amix Nutrition'),
           20.50, 29.90, 'kg', 2
    -- Creatina y Aminoácidos
    UNION ALL
    SELECT 'Creatina Monohidrato 500g',
           (SELECT id FROM stock_categorias WHERE nombre='Creatina y Aminoácidos'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           8.50, 12.90, 'ud', 5
    UNION ALL
    SELECT 'BCAA 2:1:1 300g',
           (SELECT id FROM stock_categorias WHERE nombre='Creatina y Aminoácidos'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           12.00, 17.90, 'ud', 3
    UNION ALL
    SELECT 'L-Glutamina 400g',
           (SELECT id FROM stock_categorias WHERE nombre='Creatina y Aminoácidos'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           9.80, 14.90, 'ud', 3
    -- Pre-entreno
    UNION ALL
    SELECT 'Pre-Entreno Xplode 300g',
           (SELECT id FROM stock_categorias WHERE nombre='Pre-entreno'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           19.50, 27.90, 'ud', 3
    -- Vitaminas y Minerales
    UNION ALL
    SELECT 'Multivitamínico Daily 60 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Vitaminas y Minerales'),
           (SELECT id FROM stock_proveedores WHERE nombre='Amix Nutrition'),
           8.90, 13.90, 'ud', 5
    UNION ALL
    SELECT 'Omega-3 Fish Oil 90 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Vitaminas y Minerales'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           7.50, 11.90, 'ud', 5
    UNION ALL
    SELECT 'Vitamina D3 2000UI 120 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Vitaminas y Minerales'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           4.90, 7.90, 'ud', 5
    UNION ALL
    SELECT 'Magnesio 400mg 120 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Vitaminas y Minerales'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           5.90, 8.90, 'ud', 5
    UNION ALL
    SELECT 'Zinc + Vitamina C 120 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Vitaminas y Minerales'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           4.50, 6.90, 'ud', 5
    -- Quemagrasas
    UNION ALL
    SELECT 'L-Carnitina 1000mg 90 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Quemagrasas'),
           (SELECT id FROM stock_proveedores WHERE nombre='Amix Nutrition'),
           11.00, 16.90, 'ud', 3
    UNION ALL
    SELECT 'CLA 1000mg 90 cáps',
           (SELECT id FROM stock_categorias WHERE nombre='Quemagrasas'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           9.50, 14.90, 'ud', 3
    -- Barritas y Snacks
    UNION ALL
    SELECT 'Barrita Proteica Chocolate',
           (SELECT id FROM stock_categorias WHERE nombre='Barritas y Snacks'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           1.80, 2.90, 'ud', 20
    UNION ALL
    SELECT 'Barrita Proteica Vainilla',
           (SELECT id FROM stock_categorias WHERE nombre='Barritas y Snacks'),
           (SELECT id FROM stock_proveedores WHERE nombre='Best Protein'),
           1.90, 2.99, 'ud', 20
    -- Bebidas Deportivas
    UNION ALL
    SELECT 'Isotónica Naranja 500ml',
           (SELECT id FROM stock_categorias WHERE nombre='Bebidas Deportivas'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           1.20, 1.90, 'ud', 24
    UNION ALL
    SELECT 'Bebida Energética Pro 500g',
           (SELECT id FROM stock_categorias WHERE nombre='Bebidas Deportivas'),
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           14.50, 19.90, 'ud', 3
    -- Colágeno y Articulaciones
    UNION ALL
    SELECT 'Colágeno Hidrolizado 400g',
           (SELECT id FROM stock_categorias WHERE nombre='Colágeno y Articulaciones'),
           (SELECT id FROM stock_proveedores WHERE nombre='Best Protein'),
           16.50, 23.90, 'ud', 3
)
WHERE NOT EXISTS (SELECT 1 FROM stock_productos);

-- COMPRAS
INSERT INTO stock_compras (fecha, proveedor_id, notas, total)
SELECT fecha, proveedor_id, notas, total FROM (
    SELECT '2025-12-10' AS fecha,
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store') AS proveedor_id,
           'Pedido diciembre: proteínas y suplementos base' AS notas,
           392.80 AS total
    UNION ALL
    SELECT '2025-12-15',
           (SELECT id FROM stock_proveedores WHERE nombre='Amix Nutrition'),
           'Reposición diciembre: vitaminas y aminoácidos',
           251.00
    UNION ALL
    SELECT '2026-01-05',
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           'Pedido enero: pre-entreno y snacks',
           303.60
    UNION ALL
    SELECT '2026-01-20',
           (SELECT id FROM stock_proveedores WHERE nombre='HSN Store'),
           'Reposición enero: whey isolada y micronutrientes',
           347.00
    UNION ALL
    SELECT '2026-02-10',
           (SELECT id FROM stock_proveedores WHERE nombre='Best Protein'),
           'Pedido febrero: proteínas veganas y colágeno',
           299.40
)
WHERE NOT EXISTS (SELECT 1 FROM stock_compras);

-- LÍNEAS DE COMPRA
INSERT INTO stock_compras_lineas (compra_id, producto_id, cantidad, precio_unitario)
SELECT compra_id, producto_id, cantidad, precio_unitario FROM (
    -- Compra 1: HSN Store 2025-12-10 (total 392.80)
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido diciembre: proteínas y suplementos base') AS compra_id,
           (SELECT id FROM stock_productos WHERE nombre='Whey Protein Concentrada 1 kg') AS producto_id,
           10.0 AS cantidad, 18.90 AS precio_unitario
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido diciembre: proteínas y suplementos base'),
           (SELECT id FROM stock_productos WHERE nombre='Creatina Monohidrato 500g'),
           10.0, 8.50
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido diciembre: proteínas y suplementos base'),
           (SELECT id FROM stock_productos WHERE nombre='Omega-3 Fish Oil 90 cáps'),
           8.0, 7.50
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido diciembre: proteínas y suplementos base'),
           (SELECT id FROM stock_productos WHERE nombre='L-Glutamina 400g'),
           6.0, 9.80
    -- Compra 2: Amix Nutrition 2025-12-15 (total 251.00)
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición diciembre: vitaminas y aminoácidos'),
           (SELECT id FROM stock_productos WHERE nombre='BCAA 2:1:1 300g'),
           8.0, 12.00
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición diciembre: vitaminas y aminoácidos'),
           (SELECT id FROM stock_productos WHERE nombre='Multivitamínico Daily 60 cáps'),
           10.0, 8.90
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición diciembre: vitaminas y aminoácidos'),
           (SELECT id FROM stock_productos WHERE nombre='L-Carnitina 1000mg 90 cáps'),
           6.0, 11.00
    -- Compra 3: Weider Spain 2026-01-05 (total 303.60)
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido enero: pre-entreno y snacks'),
           (SELECT id FROM stock_productos WHERE nombre='Pre-Entreno Xplode 300g'),
           6.0, 19.50
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido enero: pre-entreno y snacks'),
           (SELECT id FROM stock_productos WHERE nombre='Barrita Proteica Chocolate'),
           48.0, 1.80
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido enero: pre-entreno y snacks'),
           (SELECT id FROM stock_productos WHERE nombre='Isotónica Naranja 500ml'),
           36.0, 1.20
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido enero: pre-entreno y snacks'),
           (SELECT id FROM stock_productos WHERE nombre='CLA 1000mg 90 cáps'),
           6.0, 9.50
    -- Compra 4: HSN Store 2026-01-20 (total 347.00)
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición enero: whey isolada y micronutrientes'),
           (SELECT id FROM stock_productos WHERE nombre='Whey Protein Isolada 1 kg'),
           8.0, 24.50
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición enero: whey isolada y micronutrientes'),
           (SELECT id FROM stock_productos WHERE nombre='Vitamina D3 2000UI 120 cáps'),
           12.0, 4.90
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición enero: whey isolada y micronutrientes'),
           (SELECT id FROM stock_productos WHERE nombre='Magnesio 400mg 120 cáps'),
           8.0, 5.90
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Reposición enero: whey isolada y micronutrientes'),
           (SELECT id FROM stock_productos WHERE nombre='Zinc + Vitamina C 120 cáps'),
           10.0, 4.50
    -- Compra 5: Best Protein 2026-02-10 (total 299.40)
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido febrero: proteínas veganas y colágeno'),
           (SELECT id FROM stock_productos WHERE nombre='Proteína Vegana 1 kg'),
           6.0, 22.00
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido febrero: proteínas veganas y colágeno'),
           (SELECT id FROM stock_productos WHERE nombre='Barrita Proteica Vainilla'),
           36.0, 1.90
    UNION ALL
    SELECT (SELECT id FROM stock_compras WHERE notas='Pedido febrero: proteínas veganas y colágeno'),
           (SELECT id FROM stock_productos WHERE nombre='Colágeno Hidrolizado 400g'),
           6.0, 16.50
)
WHERE NOT EXISTS (SELECT 1 FROM stock_compras_lineas);

-- VENTAS (paciente_id NULL = venta de mostrador sin paciente registrado)
INSERT INTO stock_ventas (fecha, paciente_id, notas, total)
SELECT fecha, paciente_id, notas, total FROM (
    SELECT '2025-12-12' AS fecha, NULL::integer AS paciente_id, 'Venta mostrador 12-dic'     AS notas, 40.80 AS total
    UNION ALL SELECT '2025-12-18', NULL, 'Venta mostrador 18-dic',  40.60
    UNION ALL SELECT '2026-01-08', NULL, 'Venta mostrador 8-ene',   60.70
    UNION ALL SELECT '2026-01-15', NULL, 'Venta mostrador 15-ene',  25.00
    UNION ALL SELECT '2026-01-22', NULL, 'Venta mostrador 22-ene',  69.70
    UNION ALL SELECT '2026-02-05', NULL, 'Venta mostrador 5-feb',   31.80
    UNION ALL SELECT '2026-02-14', NULL, 'Venta mostrador 14-feb',  32.80
    UNION ALL SELECT '2026-03-01', NULL, 'Venta mostrador 1-mar',   44.86
)
WHERE NOT EXISTS (SELECT 1 FROM stock_ventas);

-- LÍNEAS DE VENTA
INSERT INTO stock_ventas_lineas (venta_id, producto_id, cantidad, precio_unitario)
SELECT venta_id, producto_id, cantidad, precio_unitario FROM (
    -- Venta 1: 2025-12-12 (40.80)
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 12-dic') AS venta_id,
           (SELECT id FROM stock_productos WHERE nombre='Whey Protein Concentrada 1 kg') AS producto_id,
           1.0 AS cantidad, 27.90 AS precio_unitario
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 12-dic'),
           (SELECT id FROM stock_productos WHERE nombre='Creatina Monohidrato 500g'),
           1.0, 12.90
    -- Venta 2: 2025-12-18 (40.60)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 18-dic'),
           (SELECT id FROM stock_productos WHERE nombre='Omega-3 Fish Oil 90 cáps'),
           2.0, 11.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 18-dic'),
           (SELECT id FROM stock_productos WHERE nombre='Vitamina D3 2000UI 120 cáps'),
           1.0, 7.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 18-dic'),
           (SELECT id FROM stock_productos WHERE nombre='Magnesio 400mg 120 cáps'),
           1.0, 8.90
    -- Venta 3: 2026-01-08 (60.70)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 8-ene'),
           (SELECT id FROM stock_productos WHERE nombre='BCAA 2:1:1 300g'),
           1.0, 17.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 8-ene'),
           (SELECT id FROM stock_productos WHERE nombre='L-Glutamina 400g'),
           1.0, 14.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 8-ene'),
           (SELECT id FROM stock_productos WHERE nombre='Pre-Entreno Xplode 300g'),
           1.0, 27.90
    -- Venta 4: 2026-01-15 (25.00)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 15-ene'),
           (SELECT id FROM stock_productos WHERE nombre='Barrita Proteica Chocolate'),
           6.0, 2.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 15-ene'),
           (SELECT id FROM stock_productos WHERE nombre='Isotónica Naranja 500ml'),
           4.0, 1.90
    -- Venta 5: 2026-01-22 (69.70)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 22-ene'),
           (SELECT id FROM stock_productos WHERE nombre='Whey Protein Concentrada 1 kg'),
           2.0, 27.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 22-ene'),
           (SELECT id FROM stock_productos WHERE nombre='Multivitamínico Daily 60 cáps'),
           1.0, 13.90
    -- Venta 6: 2026-02-05 (31.80)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 5-feb'),
           (SELECT id FROM stock_productos WHERE nombre='L-Carnitina 1000mg 90 cáps'),
           1.0, 16.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 5-feb'),
           (SELECT id FROM stock_productos WHERE nombre='CLA 1000mg 90 cáps'),
           1.0, 14.90
    -- Venta 7: 2026-02-14 (32.80)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 14-feb'),
           (SELECT id FROM stock_productos WHERE nombre='Colágeno Hidrolizado 400g'),
           1.0, 23.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 14-feb'),
           (SELECT id FROM stock_productos WHERE nombre='Magnesio 400mg 120 cáps'),
           1.0, 8.90
    -- Venta 8: 2026-03-01 (44.86)
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 1-mar'),
           (SELECT id FROM stock_productos WHERE nombre='Proteína Vegana 1 kg'),
           1.0, 32.90
    UNION ALL
    SELECT (SELECT id FROM stock_ventas WHERE notas='Venta mostrador 1-mar'),
           (SELECT id FROM stock_productos WHERE nombre='Barrita Proteica Vainilla'),
           4.0, 2.99
)
WHERE NOT EXISTS (SELECT 1 FROM stock_ventas_lineas);

-- MERMAS
INSERT INTO stock_mermas (producto_id, proveedor_id, cantidad, motivo, fecha, notas)
SELECT producto_id, proveedor_id, cantidad, motivo, fecha, notas FROM (
    SELECT (SELECT id FROM stock_productos WHERE nombre='Barrita Proteica Chocolate') AS producto_id,
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain')             AS proveedor_id,
           3.0  AS cantidad, 'caducidad'          AS motivo,
           '2026-01-16' AS fecha, 'Lote caducado enero — retirado de expositor' AS notas
    UNION ALL
    SELECT (SELECT id FROM stock_productos WHERE nombre='Isotónica Naranja 500ml'),
           (SELECT id FROM stock_proveedores WHERE nombre='Weider Spain'),
           2.0, 'accidente_rotura', '2026-02-01', 'Rotura de botellas en almacén'
    UNION ALL
    SELECT (SELECT id FROM stock_productos WHERE nombre='Creatina Monohidrato 500g'),
           NULL,
           1.0, 'devolucion_cliente', '2026-01-26', 'Devolución por cambio de producto — bote abierto'
)
WHERE NOT EXISTS (SELECT 1 FROM stock_mermas);
