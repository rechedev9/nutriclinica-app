ALTER TABLE `audit_log` ADD `paciente_id` integer;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `detalle` text;--> statement-breakpoint
CREATE INDEX `idx_audit_paciente` ON `audit_log` (`paciente_id`);
--> statement-breakpoint
UPDATE `audit_log` SET `paciente_id` = CAST(substr(`ruta`, 16) AS INTEGER) WHERE `ruta` GLOB '/api/pacientes/[0-9]*' AND `estado` < 400 AND EXISTS (SELECT 1 FROM `pacientes` WHERE `pacientes`.`id` = CAST(substr(`audit_log`.`ruta`, 16) AS INTEGER) AND `audit_log`.`fecha` >= `pacientes`.`creado`);
