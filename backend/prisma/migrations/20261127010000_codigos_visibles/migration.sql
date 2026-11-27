ALTER TABLE pacientes ADD COLUMN codigo text;
WITH numerados AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS numero FROM pacientes
)
UPDATE pacientes p SET codigo = 'PAC-' || lpad(numerados.numero::text, 4, '0')
FROM numerados WHERE numerados.id = p.id;
ALTER TABLE pacientes ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX pacientes_codigo_key ON pacientes(codigo);

ALTER TABLE citas ADD COLUMN codigo text;
WITH numerados AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS numero FROM citas
)
UPDATE citas c SET codigo = 'CIT-' || lpad(numerados.numero::text, 4, '0')
FROM numerados WHERE numerados.id = c.id;
ALTER TABLE citas ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX citas_codigo_key ON citas(codigo);
