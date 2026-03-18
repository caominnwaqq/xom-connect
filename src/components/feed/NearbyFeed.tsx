"use client";

import { LoaderCircle, MapPinned, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import {
    getSetupHelpText,
    isSchemaMissing,
    isSupabaseConfigMissing,
} from "@/lib/posts";
import { cn } from "@/lib/utils";
import { useNearbyPosts } from "@/src/hooks/useNearbyPosts";
import PostCard from "@/src/components/feed/PostCard";
import type { FeedPost } from "@/src/components/feed/PostCard";

const radiusOptions = [500, 1000, 2000];

type NearbyFeedProps = {
    radiusMeters: number;
    onRadiusChange: (value: number) => void;
    currentUserId?: string | null;
    isGuest?: boolean;
};

export default function NearbyFeed({ radiusMeters, onRadiusChange, currentUserId, isGuest }: NearbyFeedProps) {
    const router = useRouter();
    const { posts, error, loading, locationError } = useNearbyPosts(radiusMeters);
    const schemaMissing = isSchemaMissing(error);
    const configMissing = isSupabaseConfigMissing(error);
    const setupHelpText = getSetupHelpText(error);
    const missingProfileLocation =
        typeof error === "string" &&
        error.toLowerCase().includes("missing user location");

    const feedPosts: FeedPost[] = posts.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        title: p.title,
        description: p.description,
        image_url: p.image_url,
        created_at: p.created_at,
        distance_meters: p.distance_meters,
        users: p.users ?? null,
    }));

    return (
        <div className="space-y-3">
            {/* Radius selector */}
            <div className="flex flex-wrap gap-2">
                {radiusOptions.map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={radiusMeters === value}
                        onClick={() => onRadiusChange(value)}
                        className={cn(
                            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                            radiusMeters === value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        {value < 1000 ? `${value} m` : `${value / 1000} km`}
                    </button>
                ))}
            </div>

            {/* Location status */}
            {loading ? (
                <div className="rounded-[1.5rem] bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang lấy vị trí và truy vấn các bài đăng xung quanh...
                    </div>
                </div>
            ) : locationError ? (
                <div className="rounded-[1.5rem] bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                        <MapPinned className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                        <p>Đang dùng vị trí fallback để tìm bài gần bạn.</p>
                    </div>
                </div>
            ) : null}

            {/* Error */}
            {error && (
                <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                    <div className="flex items-center gap-2 font-medium">
                        <TriangleAlert className="size-4" />
                        {configMissing
                            ? "Nearby query chưa có cấu hình Supabase."
                            : schemaMissing
                                ? "Nearby query cần RPC `get_nearby_posts`."
                                : missingProfileLocation
                                    ? "Cần lưu vị trí trước khi xem feed gần bạn."
                                    : "Nearby query chưa chạy sạch."}
                    </div>
                    <p className="mt-2">{error}</p>
                    {setupHelpText && <p className="mt-2">{setupHelpText}</p>}
                    {missingProfileLocation ? (
                        <button
                            type="button"
                            onClick={() => router.push("/profile")}
                            className="mt-4 w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                            Mở hồ sơ để lưu vị trí
                        </button>
                    ) : null}
                </div>
            )}

            {/* Posts */}
            {!error && !loading && feedPosts.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-border bg-muted/40 p-6 text-center text-sm leading-6 text-muted-foreground">
                    Chưa có bài đăng nào trong phạm vi này.
                    <br />
                    Bạn có thể thử tăng bán kính hoặc tạo bài đăng đầu tiên.
                </div>
            )}

            {!error && feedPosts.length > 0 && (
                <div className="space-y-3">
                    {feedPosts.map((post) => (
                        <PostCard key={post.id} post={post} currentUserId={currentUserId} isGuest={isGuest} />
                    ))}
                </div>
            )}
        </div>
    );
}
