/**
 * Separado de `api-token.ts` a propósito: ese archivo importa `crypto` de
 * Node (hash/randomBytes), que no puede entrar al bundle de `middleware.ts`
 * (corre en Edge Runtime, sin APIs nativas de Node). Este archivo no importa
 * nada — solo el prefijo, que sí necesita el middleware para reconocer un
 * token personal antes de resolverlo.
 */
export const MCP_API_TOKEN_PREFIX = "sta_";
