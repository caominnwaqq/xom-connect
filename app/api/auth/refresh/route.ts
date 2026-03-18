import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null;
  const refresh_token = body?.refresh_token?.trim() ?? "";

  if (!refresh_token) {
    return NextResponse.json({ error: "Missing refresh_token." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json(
    {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
    },
    { status: 200 }
  );
}

