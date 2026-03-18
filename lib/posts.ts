export type PostType = "borrow" | "giveaway" | "sos" | "service";

export type PostPreview = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
};

export type GlobalPost = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  users: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type NearbyPost = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_meters: number;
  users?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export const postTypeOptions: Array<{ value: PostType; label: string }> = [
  { value: "borrow", label: "Mượn" },
  { value: "giveaway", label: "Cho" },
  { value: "sos", label: "SOS" },
  { value: "service", label: "Dịch vụ" },
];

export function isSupabaseConfigMissing(errorMessage: string | null) {
  return (
    errorMessage?.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    errorMessage?.includes("Supabase client key") ||
    false
  );
}

export function isSchemaMissing(errorMessage: string | null) {
  return (
    errorMessage?.includes("Could not find the table") ||
    errorMessage?.includes("does not exist") ||
    errorMessage?.includes("schema cache") ||
    errorMessage?.includes("function public.get_nearby_posts") ||
    errorMessage?.includes("function public.create_post_with_location") ||
    false
  );
}

export function getSetupHelpText(errorMessage: string | null) {
  if (isSupabaseConfigMissing(errorMessage)) {
    return "Hãy thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY vào .env.local hoặc Vercel Project Settings → Environment Variables.";
  }

  if (isSchemaMissing(errorMessage)) {
    return "Hãy chạy lại file supabase/schema.sql trong Supabase SQL Editor rồi reload trang.";
  }

  return null;
}

export function formatPostType(type: string) {
  switch (type) {
    case "borrow":
      return "Mượn";
    case "giveaway":
      return "Cho";
    case "sos":
      return "SOS";
    case "service":
      return "Dịch vụ";
    default:
      return type;
  }
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function hasMapCoordinates(post: NearbyPost) {
  return typeof post.latitude === "number" && typeof post.longitude === "number";
}

export function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}