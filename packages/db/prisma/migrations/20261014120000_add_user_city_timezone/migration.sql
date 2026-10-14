-- Ciudad y zona horaria declaradas por el usuario (nulas: sin cambio para nadie hasta que respondan).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
