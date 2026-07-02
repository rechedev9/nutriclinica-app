// Inserta pacientes de ejemplo con revisiones mensuales. Idempotente.
// Uso: go run ./cmd/seed_pacientes  (desde backend/)
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"nutriclinica/internal/store"
)

func main() {
	dataDir := "../bbdd"
	if len(os.Args) > 1 {
		dataDir = os.Args[1]
	}
	dbPath := filepath.Join(dataDir, "pacientes.db")

	st, err := store.Open(dbPath, nil)
	if err != nil {
		log.Fatalf("abriendo BD: %v", err)
	}
	defer st.Close()

	for _, sql := range seedSQL() {
		if _, err := st.DB.Exec(sql); err != nil {
			log.Fatalf("ejecutando SQL:\n%s\nError: %v", sql, err)
		}
	}
	fmt.Println("✓ Pacientes y revisiones de ejemplo insertados correctamente.")
}

func seedSQL() []string {
	return []string{

		// ── PACIENTES ────────────────────────────────────────────────────────────

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'María García López','1994-03-15','F','12345678A','612 345 678','maria.garcia@email.com',
'Adelgazamiento y mejora de la composición corporal','Baja (caminar 2-3 x/semana)',
NULL,NULL,'Primera consulta. Refiere cansancio y dificultad para perder peso pese a intentos previos.',78.5,164.0,'A+'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Carlos Martínez Ruiz','1979-07-22','M','87654321B','623 456 789','carlos.martinez@email.com',
'Pérdida de grasa y mejora de la composición corporal','Moderada (gym 3x/semana)',
NULL,NULL,'Trabaja muchas horas sentado. Quiere perder el exceso de grasa abdominal.',92.4,178.0,'O+'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Ana Fernández Soto','1998-01-08','F','23456789C','634 567 890','ana.fernandez@email.com',
'Ganancia de masa muscular y fuerza','Alta (gym 5x/semana + cardio)',
NULL,NULL,'Atleta aficionada. Sigue entrenamiento de fuerza. Dieta actualmente hipercalórica.',58.3,168.0,'B+'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Javier López Moreno','1986-11-30','M','34567890D','645 678 901','javier.lopez@email.com',
'Pérdida de peso significativa y control de tensión','Sedentaria (oficina)',
NULL,'Hipertensión arterial, colesterol LDL elevado','Derivado por médico de cabecera. Objetivo -20 kg en 12 meses.',108.4,175.0,'AB-'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Laura Sánchez Gil','1971-06-12','F','45678901E','656 789 012','laura.sanchez@email.com',
'Mejorar salud metabólica y control de peso','Baja (paseos suaves)',
NULL,'Hipotiroidismo (tratada con levotiroxina)','La medicación tiroidea puede ralentizar la pérdida. Progreso esperado más lento.',72.8,161.0,'A-'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Pedro Rodríguez Díaz','2000-03-04','M','56789012F','667 890 123','pedro.rodriguez@email.com',
'Volumen muscular máximo','Muy alta (gym 6x/semana + fútbol sala)',
NULL,NULL,'Ectomorfo con dificultad para ganar masa. Superávit calórico y alta ingesta proteica.',75.6,182.0,'O-'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Isabel Torres Vega','1984-09-18','F','67890123G','678 901 234','isabel.torres@email.com',
'Mantenimiento y tonificación','Moderada (yoga 3x/semana, pilates 1x/semana)',
'Intolerancia a la lactosa',NULL,'Peso estable desde hace años. Busca mejorar composición corporal sin perder peso.',69.1,166.0,'B+'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')`,

		`INSERT INTO pacientes (nombre,fecha_nac,sexo,dni,telefono,email,objetivo,actividad_fisica,intolerancias,patologias,notas,peso,talla,grupo_sanguineo)
SELECT 'Miguel Romero Castro','1976-04-25','M','78901234H','689 012 345','miguel.romero@email.com',
'Control de peso y glucemia','Muy baja (sedentario)',
NULL,'Diabetes mellitus tipo 2, obesidad grado II','Insulinorresistencia. Coordinado con endocrino. Objetivo inicial -10 kg.',96.0,170.0,'A+'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')`,

		// ── REVISIONES: María García López ───────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='María García López'),
'2026-01-10',78.5,164.0,163.0,18.2,30.5,22.4,23.8,25.1,28.6,32.4,18.9,24.1,32.8,32.5,108.2,94.5,87.6,103.8,60.2,59.5,37.4,
'Primera revisión. Medidas de referencia. Plan hipocalórico pautado (-500 kcal/día). Sin restricciones especiales.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='María García López') AND fecha='2026-01-10')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='María García López'),
'2026-02-08',77.3,164.0,163.0,17.5,29.2,21.8,22.9,24.0,27.4,31.0,18.2,24.0,32.4,32.1,107.8,93.8,86.2,102.9,59.3,58.8,37.1,
'Buena adhesión. -1.2 kg. Cintura -1.4 cm. Refiere menos hinchazón abdominal. Mantener plan.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='María García López') AND fecha='2026-02-08')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='María García López'),
'2026-03-07',76.0,164.0,163.0,16.8,28.0,21.0,22.1,22.8,26.0,29.5,17.5,23.9,32.0,31.8,107.5,93.2,84.8,101.8,58.5,58.0,36.8,
'Tendencia excelente. -2.5 kg acumulados. Cintura -2.8 cm. Introduce caminata diaria de 20 min.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='María García López') AND fecha='2026-03-07')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='María García López'),
'2026-04-05',74.8,164.0,163.0,16.0,26.8,20.1,21.2,21.5,24.5,28.2,16.8,23.8,31.6,31.4,107.2,92.5,83.5,100.5,57.6,57.2,36.5,
'Muy bien. Acumula -3.7 kg. Energía mejorada. Introduce sesión de bici estática 1x/semana.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='María García López') AND fecha='2026-04-05')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='María García López'),
'2026-05-03',73.5,164.0,163.0,15.2,25.5,19.0,20.3,20.2,23.0,26.8,16.0,23.7,31.2,31.0,106.9,91.9,82.1,99.4,56.8,56.4,36.2,
'Excelente evolución. -5.0 kg en 5 meses. Cintura -5.5 cm. Transición a plan de mantenimiento activo.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='María García López')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='María García López') AND fecha='2026-05-03')`,

		// ── REVISIONES: Carlos Martínez Ruiz ─────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-01-12',92.4,178.0,180.0,14.2,22.8,26.5,22.0,28.4,34.2,24.5,14.8,29.2,37.8,38.2,121.5,108.4,100.2,108.6,62.5,61.8,40.2,
'Primera revisión. Grasa abdominal elevada. Plan combinado: déficit moderado + entrenamiento de fuerza 3x/sem.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-01-12')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-02-09',91.0,178.0,180.0,13.5,21.5,25.4,21.0,27.1,32.8,23.2,14.2,29.2,37.6,38.0,121.2,107.8,98.8,107.9,61.8,61.2,40.0,
'-1.4 kg. Cintura -1.4 cm. Comenta que el entrenamiento le cuesta menos. Aumentar proteína a 2 g/kg.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-02-09')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-03-09',89.5,178.0,180.0,12.8,20.2,24.2,19.8,25.6,31.2,22.0,13.5,29.1,37.4,37.8,120.9,107.1,97.2,107.2,61.0,60.5,39.8,
'-2.9 kg acumulados. La grasa abdominal baja de forma notable. Continúa el plan sin cambios.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-03-09')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-04-06',88.1,178.0,180.0,12.0,19.0,23.0,18.6,24.0,29.6,20.8,12.8,29.1,37.2,37.6,120.5,106.5,95.6,106.5,60.2,59.8,39.5,
'-4.3 kg. Cintura -4.6 cm. Comenta mejoría en el sueño y energía. Mantiene adherencia al plan.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-04-06')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-05-04',86.8,178.0,180.0,11.2,17.8,21.8,17.4,22.5,28.0,19.5,12.0,29.0,37.0,37.4,120.2,105.8,93.9,105.8,59.5,59.2,39.2,
'-5.6 kg. Excelente composición. Pericias de brazo mantenidas (masa muscular conservada). Ajustar calorías.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-05-04')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz'),
'2026-06-02',85.4,178.0,180.0,10.5,16.5,20.5,16.2,21.0,26.5,18.2,11.2,29.0,36.8,37.2,119.8,105.2,92.2,105.1,58.8,58.5,39.0,
'-7.0 kg en 6 meses. Cintura -8.0 cm. Resultado excelente. Inicia fase de mantenimiento con ejercicio 4x/sem.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Carlos Martínez Ruiz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Carlos Martínez Ruiz') AND fecha='2026-06-02')`,

		// ── REVISIONES: Ana Fernández Soto ────────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto'),
'2026-02-03',58.3,168.0,170.0,10.5,16.2,11.8,12.4,13.5,14.8,22.5,12.0,24.8,31.2,31.8,105.5,85.2,68.4,91.8,55.4,54.8,36.2,
'Primera revisión. Buena masa muscular de base. Bajo porcentaje graso. Plan hipercalórico +400 kcal con 2.2 g proteína/kg.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto') AND fecha='2026-02-03')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto'),
'2026-03-03',59.2,168.0,170.0,10.2,15.8,11.5,12.1,13.0,14.2,22.0,11.5,25.2,31.8,32.4,106.2,85.8,68.0,92.2,56.2,55.5,36.8,
'+0.9 kg. Perímetros de brazo y muslo aumentan: ganancia muscular confirmada. Pliegues estables o bajan levemente.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto') AND fecha='2026-03-03')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto'),
'2026-04-01',60.0,168.0,170.0,9.8,15.4,11.2,11.8,12.5,13.6,21.5,11.0,25.6,32.4,33.0,106.8,86.4,67.6,92.6,57.0,56.2,37.4,
'+1.7 kg acumulados. Brazos más definidos. Registra récords personales en sentadilla y press banca. Seguir igual.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto') AND fecha='2026-04-01')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto'),
'2026-05-06',60.9,168.0,170.0,9.4,15.0,10.8,11.4,12.0,13.0,21.0,10.5,26.0,33.0,33.6,107.5,87.0,67.2,93.0,57.8,57.0,38.0,
'+2.6 kg en 3 meses. Composición excelente: masa muscular sube, grasa baja. Reculibrar calorías al alza +200 kcal más.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto') AND fecha='2026-05-06')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto'),
'2026-06-03',61.5,168.0,170.0,9.0,14.6,10.5,11.0,11.5,12.4,20.5,10.0,26.4,33.6,34.2,108.2,87.6,66.8,93.4,58.6,57.8,38.6,
'+3.2 kg totales. Porcentaje graso reducido. Evolución muy por encima de la media. Inicia mini-ciclo de definición.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Ana Fernández Soto')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Ana Fernández Soto') AND fecha='2026-06-03')`,

		// ── REVISIONES: Javier López Moreno ──────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Javier López Moreno'),
'2026-01-15',108.4,175.0,178.0,20.8,32.5,40.2,36.8,42.5,52.4,35.8,22.4,32.8,44.5,45.2,130.4,118.5,118.8,121.4,70.5,69.8,44.2,
'Primera revisión. Obesidad grado II. Cintura hipertensiva. Plan muy bajo en sodio y azúcares, déficit 700 kcal. Coordinar con médico.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Javier López Moreno') AND fecha='2026-01-15')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Javier López Moreno'),
'2026-02-12',106.2,175.0,178.0,19.5,30.8,38.5,35.0,40.4,50.0,34.0,21.2,32.5,44.0,44.8,129.8,117.6,116.4,120.2,69.5,68.8,43.8,
'-2.2 kg. TA mejorada (médico confirma). Comenta sentirse menos hinchado. Refuerzo de adherencia al plan alimentario.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Javier López Moreno') AND fecha='2026-02-12')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Javier López Moreno'),
'2026-03-10',104.0,175.0,178.0,18.2,29.2,36.8,33.2,38.2,47.5,32.2,20.0,32.2,43.5,44.2,129.0,116.5,113.8,118.8,68.4,67.8,43.2,
'-4.4 kg acumulados. Cintura -5 cm. El médico reduce dosis de antihipertensivo. Introduce caminatas 30 min/día.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Javier López Moreno') AND fecha='2026-03-10')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Javier López Moreno'),
'2026-04-07',102.1,175.0,178.0,16.8,27.5,34.8,31.4,36.0,45.0,30.5,18.8,31.9,42.9,43.6,128.2,115.4,111.2,117.5,67.2,66.5,42.6,
'-6.3 kg. LDL colesterol mejorado en analítica. Aumenta la caminata a 45 min. Ánimo muy positivo.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Javier López Moreno') AND fecha='2026-04-07')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Javier López Moreno'),
'2026-05-05',100.5,175.0,178.0,15.5,26.0,33.0,29.6,34.0,42.5,29.0,17.5,31.5,42.2,43.0,127.5,114.2,108.5,116.0,66.0,65.4,42.0,
'-7.9 kg en 4 meses. Cintura -10.3 cm. Sale de obesidad grado II. Objetivo segundo semestre: bajar de 95 kg.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Javier López Moreno')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Javier López Moreno') AND fecha='2026-05-05')`,

		// ── REVISIONES: Laura Sánchez Gil ────────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil'),
'2026-02-05',72.8,161.0,160.0,16.5,29.2,24.5,26.8,28.2,31.5,34.2,19.8,23.2,31.5,31.2,105.8,95.2,91.8,107.4,60.8,60.2,37.8,
'Primera revisión. Hipotiroidismo controlado. Metabolismo basal más lento. Plan hipocalórico moderado -350 kcal. Objetivo realista: -0.5 kg/mes.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil') AND fecha='2026-02-05')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil'),
'2026-03-05',72.1,161.0,160.0,16.0,28.5,23.8,26.0,27.4,30.6,33.4,19.2,23.1,31.2,31.0,105.5,94.8,90.9,106.9,60.2,59.7,37.5,
'-0.7 kg. Acorde al ritmo esperado. Cintura -0.9 cm. Refiere más energía y menos retención de líquidos.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil') AND fecha='2026-03-05')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil'),
'2026-04-02',71.4,161.0,160.0,15.5,27.8,23.0,25.2,26.5,29.8,32.5,18.5,23.0,30.9,30.7,105.2,94.2,89.8,106.4,59.5,59.0,37.1,
'-1.4 kg totales. Buena tendencia continua. Endocrina ajusta dosis de levotiroxina: puede mejorar velocidad de pérdida.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil') AND fecha='2026-04-02')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil'),
'2026-05-07',70.6,161.0,160.0,15.0,27.0,22.2,24.5,25.6,28.9,31.6,17.8,22.9,30.6,30.4,104.9,93.6,88.7,105.8,58.8,58.4,36.8,
'-2.2 kg. Dosis de levotiroxina ajustada el mes pasado: la pérdida se acelera levemente. Añade natación 1x/semana.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil') AND fecha='2026-05-07')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil'),
'2026-06-04',69.9,161.0,160.0,14.5,26.2,21.4,23.8,24.8,28.0,30.8,17.2,22.8,30.3,30.1,104.6,93.0,87.6,105.2,58.1,57.8,36.5,
'-2.9 kg en 4 meses. Buena evolución considerando el hipotiroidismo. Cintura -4.2 cm. Continuar 4 meses más con el mismo enfoque.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Laura Sánchez Gil')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Laura Sánchez Gil') AND fecha='2026-06-04')`,

		// ── REVISIONES: Pedro Rodríguez Díaz ─────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz'),
'2026-01-08',75.6,182.0,186.0,6.5,12.8,12.2,10.5,13.2,14.5,18.0,9.8,28.5,35.5,36.5,118.5,100.2,82.5,96.8,58.5,58.0,39.5,
'Primera revisión. Ectomorfo. Bajo porcentaje graso de base. Dificultad genética para ganar masa. Plan +500 kcal, 2.4 g proteína/kg.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz') AND fecha='2026-01-08')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz'),
'2026-02-05',77.2,182.0,186.0,6.8,13.2,12.5,10.8,13.6,15.0,18.4,10.0,29.0,36.4,37.4,119.4,101.2,83.2,97.5,59.8,59.2,40.2,
'+1.6 kg. Perímetros de brazo y muslo aumentan: ganancia muscular confirmada. Pliegues muy ligeramente al alza (esperado en volumen).'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz') AND fecha='2026-02-05')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz'),
'2026-03-05',78.8,182.0,186.0,7.0,13.6,12.8,11.0,14.0,15.4,18.8,10.2,29.5,37.2,38.2,120.2,102.1,83.8,98.2,61.0,60.4,40.8,
'+3.2 kg acumulados. Buena ratio masa/grasa ganada. Marca récord en press militar. Plan en curso sin cambios.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz') AND fecha='2026-03-05')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz'),
'2026-04-02',80.1,182.0,186.0,7.2,14.0,13.0,11.2,14.3,15.8,19.2,10.5,30.0,38.0,39.0,121.0,103.0,84.5,98.8,62.2,61.6,41.5,
'+4.5 kg. Cuerpo respondiendo muy bien. Introduce fase de carga de creatina. Supervisar que la grasa no suba más de 2 puntos.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz') AND fecha='2026-04-02')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz'),
'2026-05-07',81.5,182.0,186.0,7.5,14.4,13.3,11.5,14.6,16.2,19.5,10.8,30.5,38.8,39.8,121.8,103.8,85.1,99.4,63.4,62.8,42.2,
'+5.9 kg en 5 meses. Volumen muscular muy notable. Recomienda mini-corte de 6 semanas antes de retomar el volumen en otoño.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Pedro Rodríguez Díaz')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Pedro Rodríguez Díaz') AND fecha='2026-05-07')`,

		// ── REVISIONES: Isabel Torres Vega ───────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega'),
'2026-02-11',69.1,166.0,165.0,13.8,23.5,18.2,19.5,21.0,22.8,28.5,16.5,24.5,32.2,32.0,107.0,91.5,78.4,99.2,57.8,57.3,37.0,
'Primera revisión. Peso estable. Objetivo: recomposición corporal (mantener peso, reducir grasa, ganar tono). Sin lactosa.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega') AND fecha='2026-02-11')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega'),
'2026-03-11',68.8,166.0,165.0,13.4,23.0,17.8,19.0,20.4,22.2,27.9,16.0,24.5,32.1,31.9,107.0,91.2,78.0,98.9,57.5,57.0,36.8,
'-0.3 kg. Pliegues ligeramente a la baja. Refiere mejor tonificación en piernas. El yoga y pilates contribuyen.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega') AND fecha='2026-03-11')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega'),
'2026-04-09',68.5,166.0,165.0,13.0,22.4,17.4,18.5,19.8,21.5,27.2,15.5,24.5,32.0,31.8,107.0,91.0,77.6,98.5,57.1,56.7,36.6,
'-0.6 kg totales. Cintura -0.8 cm. Recomposición progresando bien. Añade sesión de musculación 1x/semana.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega') AND fecha='2026-04-09')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega'),
'2026-05-08',68.2,166.0,165.0,12.6,21.8,17.0,18.0,19.2,20.8,26.5,15.0,24.4,31.9,31.7,106.8,90.8,77.2,98.1,56.8,56.4,36.4,
'-0.9 kg. Pliegues mejoran. Brazos más firmes desde que introdujo la musculación. Mantener plan actual.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega') AND fecha='2026-05-08')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega'),
'2026-06-05',67.9,166.0,165.0,12.2,21.2,16.5,17.4,18.6,20.1,25.8,14.5,24.4,31.8,31.6,106.5,90.5,76.8,97.8,56.5,56.1,36.2,
'-1.2 kg con muy buena recomposición. Cintura -1.6 cm manteniendo masa muscular. Continuar 3 meses más con el mismo enfoque.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Isabel Torres Vega')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Isabel Torres Vega') AND fecha='2026-06-05')`,

		// ── REVISIONES: Miguel Romero Castro ─────────────────────────────────────

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro'),
'2026-01-20',96.0,170.0,169.0,18.5,28.4,36.8,34.2,38.5,48.2,30.5,18.2,30.5,41.2,41.8,126.4,114.8,112.5,116.2,66.5,65.8,42.5,
'Primera revisión. Diabetes T2 con mal control glucémico. Plan sin azúcares simples, bajo índice glucémico, -600 kcal. Coordinado con endocrino.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro') AND fecha='2026-01-20')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro'),
'2026-02-18',94.5,170.0,169.0,17.8,27.2,35.2,32.8,37.0,46.5,29.2,17.5,30.3,40.8,41.4,125.8,113.9,110.8,115.4,65.8,65.2,42.1,
'-1.5 kg. Glucemia en ayunas baja de 148 a 132 mg/dl. Gran mejora metabólica. Introduce caminar 20 min tras la cena.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro') AND fecha='2026-02-18')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro'),
'2026-03-17',93.2,170.0,169.0,17.0,26.0,33.5,31.2,35.4,44.8,28.0,16.8,30.1,40.4,41.0,125.2,113.0,109.0,114.6,65.1,64.5,41.7,
'-2.8 kg acumulados. HbA1c mejorada (endocrino reduce metformina). Cintura -3.5 cm. Caminar se consolida como hábito.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro') AND fecha='2026-03-17')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro'),
'2026-04-15',92.0,170.0,169.0,16.2,24.8,31.8,29.5,33.8,43.0,26.8,16.0,29.9,40.0,40.6,124.6,112.0,107.2,113.8,64.4,63.8,41.3,
'-4.0 kg. Glucemia en ayunas 118 mg/dl (casi en rango normal). Gran motivación. Aumenta caminata a 30 min/día.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro') AND fecha='2026-04-15')`,

		`INSERT INTO revisiones (paciente_id,fecha,peso,talla,envergadura,pl_bicipital,pl_tricipital,pl_subescapular,pl_supraespinal,pl_supracrestal,pl_abdominal,pl_muslo_int,pl_pierna_med,per_antebrazo,per_brazo_rel,per_brazo_cont,per_hombros,per_pecho,per_cintura,per_caderas,per_muslo,per_muslo_cont,per_gemelo,notas)
SELECT (SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro'),
'2026-05-13',90.8,170.0,169.0,15.4,23.6,30.2,28.0,32.2,41.2,25.5,15.2,29.7,39.6,40.2,124.0,111.0,105.4,113.0,63.7,63.2,40.8,
'-5.2 kg en 4 meses. Cintura -7.1 cm. Excelente control glucémico. Endocrino habla de posible reducción de medicación a medio plazo.'
WHERE EXISTS (SELECT 1 FROM pacientes WHERE nombre='Miguel Romero Castro')
AND NOT EXISTS (SELECT 1 FROM revisiones WHERE paciente_id=(SELECT id FROM pacientes WHERE nombre='Miguel Romero Castro') AND fecha='2026-05-13')`,
	}
}
