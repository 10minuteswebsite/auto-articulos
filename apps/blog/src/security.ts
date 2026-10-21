// Seguridad HTTP y rate limit local. En Cloudflare, el límite distribuido
// debe sustituirse por WAF/Rate Limiting Rules; este límite protege el modo
// local y evita que una instancia aislada reciba tormentas de eventos.

export interface RateLimit { allow(key: string, nowMs?: number): boolean; retryAfterSeconds(nowMs?: number): number; }

export class FixedWindowRateLimit implements RateLimit {
  private readonly windows = new Map<string, { started: number; count: number }>();
  constructor(private readonly max: number, private readonly windowMs: number) {}
  allow(key: string, nowMs = Date.now()): boolean {
    const current = this.windows.get(key);
    if (!current || nowMs - current.started >= this.windowMs) {
      this.windows.set(key, { started: nowMs, count: 1 });
      return true;
    }
    if (current.count >= this.max) return false;
    current.count++;
    return true;
  }
  retryAfterSeconds(nowMs = Date.now()): number {
    const oldest = [...this.windows.values()].sort((a, b) => a.started - b.started)[0];
    return oldest ? Math.max(1, Math.ceil((this.windowMs - (nowMs - oldest.started)) / 1000)) : 1;
  }
}

export const CSP = "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; font-src 'self'; script-src 'none'; connect-src 'self'; object-src 'none'";

export function securityHeaders(): Record<string, string> {
  return { "content-security-policy": CSP, "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" };
}
