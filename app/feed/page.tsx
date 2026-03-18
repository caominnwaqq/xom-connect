"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { LogIn } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import PostComposer from "@/src/components/feed/PostComposer";
import GlobalFeed from "@/src/components/feed/GlobalFeed";
import NearbyFeed from "@/src/components/feed/NearbyFeed";

type FeedMode = "all" | "nearby";

const tabs: Array<{ value: FeedMode; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "nearby", label: "Gần bạn" },
];

export default function FeedPage() {
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setSessionLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const currentUserId = session?.user?.id ?? null;
  const isGuest = !sessionLoading && !session;

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_55%,_rgba(236,253,245,0.7)_100%)] px-4 pb-10 pt-4">
      {/* Post Composer — only for logged-in users */}
      {session ? (
        <PostComposer session={session} />
      ) : !sessionLoading ? (
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="flex w-full items-center gap-3 rounded-[1.75rem] border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          <LogIn className="size-5 shrink-0" />
          <span>
            <span className="font-semibold">Đăng nhập</span> để chia sẻ điều gì đó với Xóm
          </span>
        </button>
      ) : null}

      {/* Feed Mode Selector */}
      <div className="mt-4 flex gap-1 rounded-full border border-border/70 bg-card p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFeedMode(tab.value)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              feedMode === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="mt-4">
        {feedMode === "all" ? (
          <GlobalFeed currentUserId={currentUserId} isGuest={isGuest} />
        ) : (
          <NearbyFeed
            radiusMeters={radiusMeters}
            onRadiusChange={setRadiusMeters}
            currentUserId={currentUserId}
            isGuest={isGuest}
          />
        )}
      </div>
    </div>
  );
}