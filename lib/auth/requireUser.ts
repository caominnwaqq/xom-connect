import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

export type AuthedUser = {
  id: string;
  email: string | null;
};

export async function requireUser(request: NextRequest): Promise<AuthedUser> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : null;

  if (!token) {
    throw new Error("Missing Authorization header.");
  }

  if (!supabaseConfig.isConfigured) {
    throw new Error(supabaseConfig.errorMessage ?? "Supabase is not configured.");
  }

  const supabase = createClient(supabaseConfig.supabaseUrl!, supabaseConfig.supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Invalid token.");

  return { id: data.user.id, email: data.user.email ?? null };
}

