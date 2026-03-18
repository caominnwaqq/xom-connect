"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import type { GlobalPost } from "@/lib/posts";
import { getSetupHelpText } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import PostCard from "@/src/components/feed/PostCard";

type GlobalFeedProps = {
    currentUserId?: string | null;
    isGuest?: boolean;
};

export default function GlobalFeed({ currentUserId, isGuest }: GlobalFeedProps) {
    const [posts, setPosts] = useState<GlobalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const fetchPosts = async () => {
            const isAuthed = Boolean(currentUserId) && !isGuest;

            const headers = new Headers();
            if (isAuthed && supabase) {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) headers.set("authorization", `Bearer ${token}`);
            }

            const response = await fetch(isAuthed ? "/api/feed?limit=50" : "/api/feed/public?limit=50", {
                method: "GET",
                headers,
            });
            const payload = (await response.json().catch(() => null)) as
                | { error: string }
                | { data: GlobalPost[] }
                | null;

            if (!active) return;

            if (!response.ok || !payload || "error" in payload) {
                setError(payload && "error" in payload ? payload.error : "Không thể tải feed.");
                setPosts([]);
            } else {
                const data = payload.data ?? [];
                setPosts(data as GlobalPost[]);
                setError(null);
            }
            setLoading(false);
        };

        void fetchPosts();

        return () => { active = false; };
    }, [currentUserId, isGuest]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-[1.75rem] border border-border/70 bg-card p-8 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải bài đăng...
            </div>
        );
    }

    if (error) {
        const helpText = getSetupHelpText(error);
        return (
            <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                <div className="flex items-center gap-2 font-medium">
                    <TriangleAlert className="size-4" />
                    Không thể tải feed.
                </div>
                <p className="mt-2">{error}</p>
                {helpText && <p className="mt-2">{helpText}</p>}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-muted/40 p-6 text-center text-sm leading-6 text-muted-foreground">
                Chưa có bài đăng nào.
                <br />
                Hãy là người đầu tiên chia sẻ điều gì đó trong Xóm!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={currentUserId} isGuest={isGuest} />
            ))}
        </div>
    );
}
