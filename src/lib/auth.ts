import { getSession } from "@/lib/auth/server";

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session.user.id;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}
