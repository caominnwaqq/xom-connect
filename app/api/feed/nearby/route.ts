import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/requireUser";

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parsePointFromWkt(value: string): { lat: number; lng: number } | null {
  const trimmed = value.trim();
  // Accept "POINT(lng lat)" or "SRID=4326;POINT(lng lat)"
  const wkt = trimmed.startsWith("SRID=") ? trimmed.split(";", 2)[1] ?? "" : trimmed;
  const match = /^POINT\s*\(\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s*\)$/i.exec(wkt.trim());
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function hexToBytes(hex: string): Uint8Array | null {
  const normalized = hex.trim().toLowerCase().replace(/^\\x/, "");
  if (normalized.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/.test(normalized)) return null;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function readUint32(view: DataView, offset: number, littleEndian: boolean) {
  return view.getUint32(offset, littleEndian);
}

function readFloat64(view: DataView, offset: number, littleEndian: boolean) {
  return view.getFloat64(offset, littleEndian);
}

function parsePointFromEwkbHex(hex: string): { lat: number; lng: number } | null {
  const bytes = hexToBytes(hex);
  if (!bytes || bytes.length < 1 + 4 + 8 + 8) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = view.getUint8(0) === 1;

  const typeWithFlags = readUint32(view, 1, littleEndian);
  const hasSrid = (typeWithFlags & 0x20000000) !== 0;
  const baseType = typeWithFlags & 0x000000ff ? (typeWithFlags & 0x000000ff) : (typeWithFlags & 0x0000ffff);
  if (baseType !== 1) return null; // 1 = POINT

  let offset = 1 + 4;
  if (hasSrid) {
    if (bytes.length < offset + 4 + 16) return null;
    offset += 4; // skip SRID
  }

  const lng = readFloat64(view, offset, littleEndian);
  const lat = readFloat64(view, offset + 8, littleEndian);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parsePoint(value: unknown): { lat: number; lng: number } | null {
  // 1) PostgREST may return GeoJSON-ish object for PostGIS types.
  if (typeof value === "object" && value !== null) {
    const v = value as { type?: unknown; coordinates?: unknown };
    if (v.type === "Point" && Array.isArray(v.coordinates) && v.coordinates.length >= 2) {
      const lng = Number(v.coordinates[0]);
      const lat = Number(v.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  if (typeof value !== "string") return null;

  // 2) WKT variants
  const wktPoint = parsePointFromWkt(value);
  if (wktPoint) return wktPoint;

  // 3) EWKB hex (common for geography/geometry)
  const ewkbPoint = parsePointFromEwkbHex(value);
  if (ewkbPoint) return ewkbPoint;

  return null;
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);

  if (!supabaseConfig.isConfigured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const radius = clampInt(Number(searchParams.get("radius") ?? 1000), 100, 5000);
  const limit = clampInt(Number(searchParams.get("limit") ?? 20), 1, 50);

  // Use the user's JWT for DB access so RLS applies.
  const authHeader = request.headers.get("authorization")!;
  const supabase = createClient(supabaseConfig.supabaseUrl!, supabaseConfig.supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("location")
    .eq("id", user.id)
    .maybeSingle<{ location: unknown }>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const point = parsePoint(profile?.location);
  if (!point) {
    return NextResponse.json(
      {
        error:
          "Missing user location. Please save your profile location before using nearby feed.",
      },
      { status: 400 }
    );
  }

  const { data: nearby, error: nearbyError } = await supabase.rpc("get_nearby_posts", {
    user_lat: point.lat,
    user_lng: point.lng,
    radius_meters: radius,
  });

  if (nearbyError) {
    return NextResponse.json({ error: nearbyError.message }, { status: 400 });
  }

  const rows = (nearby ?? []) as Array<{ id: string; distance_meters: number }>;
  const ids = rows.slice(0, limit).map((r) => r.id);

  if (ids.length === 0) {
    const response = NextResponse.json({ data: [], nextCursor: null }, { status: 200 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const distanceById = new Map(rows.map((r) => [r.id, r.distance_meters]));

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
    .map((p) => ({
      ...p,
      distance_meters: distanceById.get((p as { id: string }).id) ?? 0,
    }))
    .sort((a, b) => ids.indexOf((a as { id: string }).id) - ids.indexOf((b as { id: string }).id));

  const response = NextResponse.json({ data: ordered, nextCursor: null }, { status: 200 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

