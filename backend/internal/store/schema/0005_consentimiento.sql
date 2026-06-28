-- Consentimiento informado (RGPD, Art. 9.2.a): tratamiento de datos de salud.
-- Se guarda el estado y la fecha en que se otorgó.

ALTER TABLE pacientes ADD COLUMN consentimiento       INTEGER DEFAULT 0;
ALTER TABLE pacientes ADD COLUMN consentimiento_fecha TEXT;
