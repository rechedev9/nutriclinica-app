CREATE TABLE `stock_pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`proveedor_id` integer NOT NULL,
	`fecha_prevista` text,
	`estado` text DEFAULT 'abierto' NOT NULL,
	`notas` text,
	`creado` text NOT NULL,
	`usuario` text,
	FOREIGN KEY (`proveedor_id`) REFERENCES `stock_proveedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pedidos_proveedor` ON `stock_pedidos` (`proveedor_id`);--> statement-breakpoint
CREATE TABLE `stock_pedidos_lineas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` real NOT NULL,
	`precio_unitario` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `stock_pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pedidos_lineas_pedido` ON `stock_pedidos_lineas` (`pedido_id`);--> statement-breakpoint
CREATE INDEX `idx_pedidos_lineas_producto` ON `stock_pedidos_lineas` (`producto_id`);--> statement-breakpoint
ALTER TABLE `stock_compras` ADD `albaran` text;--> statement-breakpoint
ALTER TABLE `stock_compras` ADD `pedido_id` integer REFERENCES stock_pedidos(id);--> statement-breakpoint
CREATE INDEX `idx_compras_pedido` ON `stock_compras` (`pedido_id`);