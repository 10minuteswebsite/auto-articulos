/** Navigation hint only. Hub always makes the authorization decision. */
export function isHubConnectionsPilot(hubUserId: string | null | undefined, isActingAdmin: boolean) {
  return !isActingAdmin && hubUserId === "a1049d33-ca3a-4519-b67c-9909b35cdee1";
}
