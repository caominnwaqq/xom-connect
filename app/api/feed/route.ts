import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/requireUser";

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  // Validate JWT and get user context (also guarantees Authorization header exists).
  await requireUser(request);

  if (!supabaseConfig.isConfigured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = clampInt(Number(searchParams.get("limit") ?? 20), 1, 50);
  // Cursor pagination is TODO; keep signature for now.

  // Use the user's JWT for DB access so RLS applies.
  const authHeader = request.headers.get("authorization")!;
  const supabase = createClient(supabaseConfig.supabaseUrl!, supabaseConfig.supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, user_id, type, title, description, image_url, status, created_at, users(display_name, avatar_url)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const response = NextResponse.json({ data: data ?? [], nextCursor: null }, { status: 200 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

