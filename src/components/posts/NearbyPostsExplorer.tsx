"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, MapPinned, Radar, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    formatDistance,
    formatPostType,
    formatTimestamp,
    hasMapCoordinates,
    isSchemaMissing,
} from "@/lib/posts";
import { cn } from "@/lib/utils";
import { useNearbyPosts } from "@/src/hooks/useNearbyPosts";
import { useState } from "react";

const NearbyPostsMap = dynamic(() => import("@/src/components/map/NearbyPostsMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[320px] items-center justify-center rounded-[1.75rem] border border-border/70 bg-muted/50 text-sm text-muted-foreground">
            Đang tải bản đồ Leaflet...
        </div>
    ),
});

const radiusOptions = [500, 1000, 2000];

type NearbyPostsExplorerProps = {
    showMap?: boolean;
    title: string;
    description: string;
};

export default function NearbyPostsExplorer({
    showMap = false,
    title,
    description,
}: NearbyPostsExplorerProps) {
    const [radiusMeters, setRadiusMeters] = useState(1000);
    const { posts, error, loading, location, locationError } = useNearbyPosts(radiusMeters);
    const schemaMissing = isSchemaMissing(error);
    const canRenderMap = Boolean(showMap && location && posts.some(hasMapCoordinates));

    return (
        <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-emerald-700">Hyper-local query</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                    <Radar className="size-7" />
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
                {radiusOptions.map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={radiusMeters === value}
                        onClick={() => setRadiusMeters(value)}
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

            <div className="mt-4 rounded-[1.5rem] bg-muted/60 p-4 text-sm text-muted-foreground">
                {loading ? (
                    <div className="flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang lấy vị trí và truy vấn các bài đăng xung quanh...
                    </div>
                ) : location ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                            <MapPinned className="size-4 text-emerald-700" />
                            Tâm truy vấn: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </div>
                        <p>
                            {locationError
                                ? `Đang dùng fallback Ninh Kiều vì GPS báo lỗi: ${locationError}`
                                : `Đang tìm bài đăng trong bán kính ${radiusMeters < 1000 ? `${radiusMeters} m` : `${radiusMeters / 1000} km`}.`}
                        </p>
                    </div>
                ) : (
                    <p>Chưa lấy được vị trí để chạy truy vấn nearby.</p>
                )}
            </div>

            {canRenderMap && location ? (
                <div className="mt-6">
                    <NearbyPostsMap center={location} posts={posts} />
                </div>
            ) : showMap && !loading ? (
                <div className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
                    {schemaMissing
                        ? "Map đang chờ version mới của RPC `get_nearby_posts`. Hãy chạy lại `supabase/schema.sql` để trả thêm lat/lng cho marker."
                        : "Map sẽ hiện marker khi nearby query trả về bài đăng có tọa độ."}
                </div>
            ) : null}

            <div className="mt-6 space-y-3">
                {error ? (
                    <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                        <div className="flex items-center gap-2 font-medium">
                            <TriangleAlert className="size-4" />
                            Nearby query chưa chạy sạch.
                        </div>
                        <p className="mt-2">{error}</p>
                        {schemaMissing ? (
                            <p className="mt-2">Hãy chạy lại file `supabase/schema.sql` trong Supabase SQL Editor rồi reload trang.</p>
                        ) : null}
                    </div>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                        <article key={post.id} className="rounded-[1.75rem] border border-border/70 bg-card p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
                                        {formatPostType(post.type)}
                                    </p>
                                    <h3 className="mt-2 text-lg font-semibold text-foreground">{post.title}</h3>
                                </div>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                    {formatDistance(post.distance_meters)}
                                </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.description}</p>

                            {post.image_url ? (
                                <div className="relative mt-4 h-44 overflow-hidden rounded-[1.25rem]">
                                    <Image
                                        src={post.image_url}
                                        alt={post.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 420px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : null}

                            <p className="mt-4 text-xs text-muted-foreground">
                                Tạo lúc {formatTimestamp(post.created_at)}
                            </p>
                        </article>
                    ))
                ) : !loading ? (
                    <div className="rounded-[1.75rem] border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
                        Chưa có bài đăng nào trong phạm vi này. Bạn có thể thử tăng bán kính hoặc tạo bài đăng đầu tiên.
                    </div>
                ) : null}
            </div>

            <div className="mt-6 flex gap-3">
                <Button asChild className="flex-1 rounded-2xl">
                    <Link href="/post">Tạo bài đăng mới</Link>
                </Button>
            </div>
        </section>
    );
}