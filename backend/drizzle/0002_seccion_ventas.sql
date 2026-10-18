CREATE TABLE `ajustes` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `caja_cierres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`creado` text DEFAULT (datetime('now', 'localtime')),
	`usuario` text,
	`num_ventas` integer DEFAULT 0 NOT NULL,
	`total_ventas` real DEFAULT 0 NOT NULL,
	`total_devoluciones` real DEFAULT 0 NOT NULL,
	`efectivo` real DEFAULT 0 NOT NULL,
	`tarjeta` real DEFAULT 0 NOT NULL,
	`bizum` real DEFAULT 0 NOT NULL,
	`sin_indicar` real DEFAULT 0 NOT NULL,
	`fondo_inicial` real DEFAULT 0 NOT NULL,
	`efectivo_esperado` real NOT NULL,
	`efectivo_contado` real NOT NULL,
	`notas` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `caja_cierres_fecha_unique` ON `caja_cierres` (`fecha`);--> statement-breakpoint
CREATE TABLE `stock_devoluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`creado` text DEFAULT (datetime('now', 'localtime')),
	`usuario` text,
	`motivo` text NOT NULL,
	`metodo_reembolso` text NOT NULL,
	`importe` real NOT NULL,
	`notas` text,
	FOREIGN KEY (`venta_id`) REFERENCES `stock_ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_devoluciones_venta` ON `stock_devoluciones` (`venta_id`);--> statement-breakpoint
CREATE INDEX `idx_devoluciones_fecha` ON `stock_devoluciones` (`fecha`);--> statement-breakpoint
CREATE TABLE `stock_devoluciones_lineas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`devolucion_id` integer NOT NULL,
	`venta_linea_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` real NOT NULL,
	`importe` real NOT NULL,
	`reingresa` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`devolucion_id`) REFERENCES `stock_devoluciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venta_linea_id`) REFERENCES `stock_ventas_lineas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_devoluciones_lineas_devolucion` ON `stock_devoluciones_lineas` (`devolucion_id`);--> statement-breakpoint
CREATE INDEX `idx_devoluciones_lineas_linea` ON `stock_devoluciones_lineas` (`venta_linea_id`);--> statement-breakpoint
CREATE INDEX `idx_devoluciones_lineas_producto` ON `stock_devoluciones_lineas` (`producto_id`);--> statement-breakpoint
CREATE TABLE `stock_ventas_pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`metodo` text NOT NULL,
	`importe` real NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `stock_ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ventas_pagos_venta` ON `stock_ventas_pagos` (`venta_id`);--> statement-breakpoint
ALTER TABLE `stock_productos` ADD `codigo_barras` text;--> statement-breakpoint
ALTER TABLE `stock_productos` ADD `iva` real DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_productos_codigo_barras` ON `stock_productos` (`codigo_barras`);--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `creado` text;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `usuario` text;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `estado` text DEFAULT 'completada' NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `entregado` real;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `anulacion_motivo` text;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `anulacion_fecha` text;--> statement-breakpoint
ALTER TABLE `stock_ventas` ADD `anulacion_usuario` text;--> statement-breakpoint
CREATE INDEX `idx_ventas_fecha` ON `stock_ventas` (`fecha`);--> statement-breakpoint
ALTER TABLE `stock_ventas_lineas` ADD `descuento` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_ventas_lineas` ADD `iva` real DEFAULT 10 NOT NULL;