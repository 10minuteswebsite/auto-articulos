-- Cambia el estilo editorial predeterminado de todas las cuentas existentes.
-- STANDARD se representa con defaultPromptId = NULL; este lote lo reemplaza
-- por el prompt editorial de problema-solución.
DO $$
DECLARE
    problem_solution_prompt_id TEXT;
BEGIN
    SELECT "id"
      INTO problem_solution_prompt_id
      FROM "Prompt"
     WHERE "name" = 'GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION';

    IF problem_solution_prompt_id IS NULL THEN
        RAISE EXCEPTION 'No existe el prompt requerido: GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION';
    END IF;

    UPDATE "User"
       SET "defaultPromptId" = problem_solution_prompt_id;
END $$;
