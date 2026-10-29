-- 1) Región confirmada. Las altas desde el Hub no traen ubicación: quedan en NULL y el asistente
--    inicial la pide una sola vez. Todas las cuentas que YA existen se marcan como confirmadas para
--    no preguntarles nada. Idempotente: si la columna ya existe NO se vuelve a marcar (no se
--    confirmarían por error las cuentas nuevas creadas después).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'User' AND column_name = 'platformDomainConfirmedAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "platformDomainConfirmedAt" TIMESTAMP(3);
        UPDATE "User" SET "platformDomainConfirmedAt" = NOW();
    END IF;
END $$;

-- 2) Estilo predeterminado para cuentas creadas DESPUÉS del lote del 19/10/2026
--    (20261019190000), que solo cubrió las cuentas existentes ese día. STANDARD es
--    defaultPromptId = NULL. Si el prompt no existe no se falla el despliegue.
DO $$
DECLARE
    problem_solution_prompt_id TEXT;
BEGIN
    SELECT "id"
      INTO problem_solution_prompt_id
      FROM "Prompt"
     WHERE "name" = 'GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION';

    IF problem_solution_prompt_id IS NULL THEN
        RAISE NOTICE 'No existe el prompt GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION; no se corrigen cuentas.';
    ELSE
        UPDATE "User"
           SET "defaultPromptId" = problem_solution_prompt_id
         WHERE "defaultPromptId" IS NULL
           AND "createdAt" >= TIMESTAMP '2026-10-19 19:00:00';
    END IF;
END $$;
