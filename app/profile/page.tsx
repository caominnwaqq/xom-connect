import { MapPinned, ShieldCheck } from "lucide-react";

import ProfileAuthPanel from "@/src/components/auth/ProfileAuthPanel";

export default function ProfilePage() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_50%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 pb-10 pt-6">
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Hồ sơ & xác thực</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Kết nối với Supabase Auth</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Đăng nhập để chuẩn bị cho các bước tiếp theo như lưu tọa độ GPS, tạo bài đăng và chat real-time.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
            <ShieldCheck className="size-7" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          <MapPinned className="size-4 text-emerald-700" />
          Hook GPS đã có sẵn, bước tiếp theo chỉ còn nối nó vào hồ sơ người dùng sau khi đăng nhập.
        </div>
      </section>

      <div className="mt-6">
        <ProfileAuthPanel />
      </div>
    </div>
  );
}