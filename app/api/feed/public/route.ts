import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = clampInt(Number(searchParams.get("limit") ?? 20), 1, 50);
  // Cursor pagination is TODO; keep signature for now.

  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, type, title, description, image_url, status, created_at, users(display_name, avatar_url)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const response = NextResponse.json({ data: data ?? [], nextCursor: null }, { status: 200 });
  response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
  return response;
}

