import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCellCenterFromId } from "@/lib/geo/cell";

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const cell = searchParams.get("cell")?.trim() ?? "";
  const radius = clampInt(Number(searchParams.get("radius") ?? 1000), 100, 5000);
  const limit = clampInt(Number(searchParams.get("limit") ?? 20), 1, 50);

  // Cursor pagination is TODO; keep signature for now.
  const center = getCellCenterFromId(cell);
  if (!center) {
    return NextResponse.json({ error: "Invalid cell." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_nearby_posts", {
    user_lat: center.lat,
    user_lng: center.lng,
    radius_meters: radius,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as Array<{ id: string; distance_meters: number }>;
  const ids = rows.slice(0, limit).map((row) => row.id);

  if (ids.length === 0) {
    const response = NextResponse.json({ data: [], nextCursor: null }, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
    return response;
  }

  const distanceById = new Map(rows.map((row) => [row.id, row.distance_meters]));

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(
      "id, user_id, type, title, description, image_url, status, created_at, latitude, longitude, users(display_name, avatar_url)"
    )
    .in("id", ids);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 400 });
  }

  const ordered = (posts ?? [])
    .map((post) => ({
      ...post,
      distance_meters: distanceById.get((post as { id: string }).id) ?? 0,
    }))
    .sort((a, b) => ids.indexOf((a as { id: string }).id) - ids.indexOf((b as { id: string }).id));

  const response = NextResponse.json({ data: ordered, nextCursor: null }, { status: 200 });
  response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
  return response;
}

