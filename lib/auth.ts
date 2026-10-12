/** Connect a server-verified session provider before enabling account features. */
export type AppUser = { userId: string; email: string; fullName?: string };
export async function getAppUser(_request: Request): Promise<AppUser | null> {
  // Deliberately fail closed. Never trust a client-supplied user ID.
  return null;
}
