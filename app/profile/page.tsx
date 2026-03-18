import { Suspense } from "react";

import ProfileAuthPanel from "@/src/components/auth/ProfileAuthPanel";

export default function ProfilePage() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_50%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 pb-10 pt-6">
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="rounded-[1.75rem] border border-border/70 bg-card p-4 text-sm text-muted-foreground">
              Đang tải hồ sơ...
            </div>
          }
        >
          <ProfileAuthPanel />
        </Suspense>
      </div>
    </div>
  );
}