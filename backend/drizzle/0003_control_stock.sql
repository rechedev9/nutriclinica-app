CREATE TABLE `stock_recuentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`creado` text NOT NULL,
	`usuario` text,
	`motivo` text NOT NULL,
	`notas` text
);
--> statement-breakpoint
CREATE INDEX `idx_recuentos_fecha` ON `stock_recuentos` (`fecha`);--> statement-breakpoint
CREATE TABLE `stock_recuentos_lineas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recuento_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`esperado` real NOT NULL,
	`contado` real NOT NULL,
	`diferencia` real NOT NULL,
	FOREIGN KEY (`recuento_id`) REFERENCES `stock_recuentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recuentos_lineas_recuento` ON `stock_recuentos_lineas` (`recuento_id`);--> statement-breakpoint
CREATE INDEX `idx_recuentos_lineas_producto` ON `stock_recuentos_lineas` (`producto_id`);