CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text DEFAULT (datetime('now', 'localtime')),
	`usuario` text,
	`metodo` text NOT NULL,
	`ruta` text NOT NULL,
	`estado` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_fecha` ON `audit_log` (`fecha`);--> statement-breakpoint
CREATE TABLE `fotos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`filename` text NOT NULL,
	`nota` text,
	`fecha` text DEFAULT (datetime('now', 'localtime')),
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fotos_paciente` ON `fotos` (`paciente_id`);--> statement-breakpoint
CREATE TABLE `pacientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`fecha_nac` text,
	`sexo` text,
	`dni` text,
	`telefono` text,
	`email` text,
	`objetivo` text,
	`actividad_fisica` text,
	`intolerancias` text,
	`patologias` text,
	`notas` text,
	`peso` real,
	`talla` real,
	`grupo_sanguineo` text,
	`creado` text DEFAULT (datetime('now', 'localtime')),
	`consentimiento` integer DEFAULT 0 NOT NULL,
	`consentimiento_fecha` text
);
--> statement-breakpoint
CREATE TABLE `revisiones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`fecha` text DEFAULT (date('now', 'localtime')),
	`peso` real,
	`talla` real,
	`envergadura` real,
	`pl_bicipital` real,
	`pl_tricipital` real,
	`pl_subescapular` real,
	`pl_supraespinal` real,
	`pl_supracrestal` real,
	`pl_abdominal` real,
	`pl_muslo_int` real,
	`pl_pierna_med` real,
	`per_antebrazo` real,
	`per_brazo_rel` real,
	`per_brazo_cont` real,
	`per_hombros` real,
	`per_pecho` real,
	`per_cintura` real,
	`per_caderas` real,
	`per_muslo` real,
	`per_muslo_cont` real,
	`per_gemelo` real,
	`notas` text,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_revisiones_paciente` ON `revisiones` (`paciente_id`);--> statement-breakpoint
CREATE TABLE `sesiones` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`usuario_id` integer NOT NULL,
	`expira` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sesiones_usuario` ON `sesiones` (`usuario_id`);--> statement-breakpoint
CREATE TABLE `stock_categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_compras` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text DEFAULT (date('now', 'localtime')),
	`proveedor_id` integer,
	`notas` text,
	`total` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`proveedor_id`) REFERENCES `stock_proveedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_compras_proveedor` ON `stock_compras` (`proveedor_id`);--> statement-breakpoint
CREATE TABLE `stock_compras_lineas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compra_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` real NOT NULL,
	`precio_unitario` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`compra_id`) REFERENCES `stock_compras`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_compras_lineas_compra` ON `stock_compras_lineas` (`compra_id`);--> statement-breakpoint
CREATE INDEX `idx_compras_lineas_producto` ON `stock_compras_lineas` (`producto_id`);--> statement-breakpoint
CREATE TABLE `stock_mermas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`proveedor_id` integer,
	`cantidad` real DEFAULT 1 NOT NULL,
	`motivo` text NOT NULL,
	`fecha` text,
	`notas` text,
	`creado` text DEFAULT (datetime('now', 'localtime')),
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proveedor_id`) REFERENCES `stock_proveedores`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_mermas_motivo" CHECK("stock_mermas"."motivo" IN ('caducidad', 'accidente_rotura', 'devolucion_cliente'))
);
--> statement-breakpoint
CREATE INDEX `idx_mermas_producto` ON `stock_mermas` (`producto_id`);--> statement-breakpoint
CREATE TABLE `stock_productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`categoria_id` integer,
	`proveedor_id` integer,
	`precio_coste` real DEFAULT 0 NOT NULL,
	`precio_venta` real DEFAULT 0 NOT NULL,
	`unidad` text DEFAULT 'ud',
	`stock_minimo` real DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`creado` text DEFAULT (datetime('now', 'localtime')),
	FOREIGN KEY (`categoria_id`) REFERENCES `stock_categorias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proveedor_id`) REFERENCES `stock_proveedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_productos_categoria` ON `stock_productos` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `idx_productos_proveedor` ON `stock_productos` (`proveedor_id`);--> statement-breakpoint
CREATE TABLE `stock_proveedores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`telefono` text,
	`email` text,
	`notas` text
);
--> statement-breakpoint
CREATE TABLE `stock_ventas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text DEFAULT (date('now', 'localtime')),
	`paciente_id` integer,
	`notas` text,
	`total` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ventas_paciente` ON `stock_ventas` (`paciente_id`);--> statement-breakpoint
CREATE TABLE `stock_ventas_lineas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` real NOT NULL,
	`precio_unitario` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `stock_ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `stock_productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ventas_lineas_venta` ON `stock_ventas_lineas` (`venta_id`);--> statement-breakpoint
CREATE INDEX `idx_ventas_lineas_producto` ON `stock_ventas_lineas` (`producto_id`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text DEFAULT 'user' NOT NULL,
	`creado` text DEFAULT (datetime('now', 'localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_usuario_unique` ON `usuarios` (`usuario`);