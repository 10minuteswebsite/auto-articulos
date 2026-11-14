import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('the exact GSC legacy endpoint reaches its own backend authentication', () => {
  const middleware = readFileSync('apps/web/src/middleware.ts', 'utf8')
  const handler = readFileSync('apps/web/src/app/api/integrations/hub/gsc-legacy-read/route.ts', 'utf8')
  const guard = readFileSync('apps/web/src/lib/hub-legacy-gsc-read.ts', 'utf8')
  const paths = middleware.slice(middleware.indexOf('const PUBLIC_PATHS = ['), middleware.indexOf('];', middleware.indexOf('const PUBLIC_PATHS = [')))
  assert.match(paths, /"\/api\/integrations\/hub\/gsc-legacy-read"/)
  assert.match(middleware, /PUBLIC_PATHS\.some\(\(path\) => pathname === path\)/)
  assert.match(handler, /authenticate:\s*validHubBackend/)
  assert.match(guard, /if\s*\(!\(await deps\.authenticate\(request\)\)\)\s*return reply\(\{ error: "unauthorized" \}, 401\)/)
})
