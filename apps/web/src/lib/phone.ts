const E164_PHONE = /^\+[1-9][0-9]{7,14}$/;

// These are the NANP area codes currently present in the legacy database.
// A local 10-digit value is only promoted when its area code is unambiguous.
const KNOWN_NANP_AREA_CODES = new Set([
  "305", "352", "561", "754", "786", "809", "954",
]);

/** Converts an explicitly international value to canonical E.164. */
export function normalizeE164Phone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const input = value.trim();
  if (!input) return null;

  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let candidate: string | null = null;
  if (input.startsWith("+")) {
    candidate = `+${digits}`;
  } else if (input.startsWith("00")) {
    candidate = `+${digits.slice(2)}`;
  }

  return candidate && E164_PHONE.test(candidate) ? candidate : null;
}

/**
 * Canonicalizes legacy values only when the country code is already present
 * or the current value is an unambiguous NANP number. Unknown local numbers
 * remain null so we never guess a customer's country or WhatsApp destination.
 */
export function normalizeLegacyPhone(value: unknown): string | null {
  const canonical = normalizeE164Phone(value);
  if (canonical) return canonical;
  if (typeof value !== "string") return null;

  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (/^1[2-9][0-9]{9}$/.test(digits)) return `+${digits}`;
  if (/^[2-9][0-9]{9}$/.test(digits) && KNOWN_NANP_AREA_CODES.has(digits.slice(0, 3))) {
    return `+1${digits}`;
  }
  if (/^(?:34|246|504|519)[0-9]{8,9}$/.test(digits)) return `+${digits}`;
  if (/^(?:52|58|59)[0-9]{10}$/.test(digits)) return `+${digits}`;
  if (/^55[0-9]{11}$/.test(digits)) return `+${digits}`;

  return null;
}
