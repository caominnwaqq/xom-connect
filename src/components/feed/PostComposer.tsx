"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

type PostComposerProps = {
    session: Session | null;
};

export default function PostComposer({ session }: PostComposerProps) {
    const router = useRouter();

    const avatarUrl = session?.user?.user_metadata?.avatar_url as string | undefined;
    const displayName = (session?.user?.user_metadata?.display_name ??
        "Bạn") as string;
    const initials = displayName
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const goToCreate = () => router.push("/post");

    return (
        <div className="flex items-center gap-3 rounded-[1.75rem] border border-border/70 bg-card px-4 py-3 shadow-sm">
            {/* Avatar */}
            {avatarUrl ? (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
                    <Image src={avatarUrl} alt={displayName} fill sizes="40px" className="object-cover" />
                </div>
            ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-700">
                    {initials}
                </div>
            )}

            {/* Input placeholder */}
            <button
                type="button"
                onClick={goToCreate}
                className="flex-1 rounded-full bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none"
            >
                Có gì mới?
            </button>

            {/* Post button */}
            <button
                type="button"
                onClick={goToCreate}
                className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
                Đăng
            </button>
        </div>
    );
}
