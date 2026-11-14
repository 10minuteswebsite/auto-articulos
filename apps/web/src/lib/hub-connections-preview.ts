/** UI hint only; the Hub independently enforces the administrator session. */
export function canShowHubConnectionsPreview(identity: unknown) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return false;
  const user = identity as Record<string, unknown>;
  return user.isActingAdmin === false && (user.role === "admin" || user.hubConnectionsPilot === true);
}
