import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  if (!supabaseConfig.isConfigured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { access_token?: string } | null;
  const accessToken = body?.access_token?.trim() ?? "";

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access_token." }, { status: 400 });
  }

  const supabase = createClient(supabaseConfig.supabaseUrl!, supabaseConfig.supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

