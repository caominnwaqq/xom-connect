import Link from "next/link";
import {
  ArrowRight,
  DatabaseZap,
  Radar,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { isSchemaMissing } from "@/lib/posts";
import { getLatestPosts } from "@/lib/supabase/posts";
import NearbyPostsExplorer from "@/src/components/posts/NearbyPostsExplorer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { count, errorMessage } = await getLatestPosts(1);
  const schemaMissing = isSchemaMissing(errorMessage);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 pb-10 pt-6">
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Xóm · Hyper-local MVP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              App đã nói chuyện được với Supabase
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Trang này đang chạy một truy vấn thật vào bảng `posts` để kiểm tra kết nối database trước khi vào Phase CRUD và bản đồ.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
            <Radar className="size-7" />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <DatabaseZap className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Database probe</p>
                <p className="text-lg font-semibold text-foreground">
                  {errorMessage ? "Có phản hồi từ Supabase nhưng truy vấn chưa sạch" : `${count} bài đăng khả dụng`}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              {errorMessage ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <TriangleAlert className="size-4 text-amber-600" />
                    Truy vấn `select * from posts` đã chạm tới Supabase nhưng trả về lỗi.
                  </div>
                  <p>{errorMessage}</p>
                  {schemaMissing ? (
                    <p>
                      Hãy mở Supabase SQL Editor và chạy file `supabase/schema.sql`, sau đó reload lại trang này.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="size-4 text-emerald-700" />
                    Truy vấn `posts` đã thành công.
                  </div>
                  <p>
                    Nếu chưa có dữ liệu, đó là bình thường. Chỉ cần bảng đã tồn tại và query không lỗi là phần kết nối database đã ổn.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                <Radar className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next step</p>
                <p className="text-lg font-semibold text-foreground">Bật GPS, tạo post, rồi xem nearby feed trên map</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button asChild className="flex-1 rounded-2xl">
                <Link href="/profile">
                  Mở hồ sơ
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 rounded-2xl">
                <Link href="/post">Tạo post</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <NearbyPostsExplorer
          showMap
          title="Bài đăng quanh bạn"
          description="Home screen giờ đã dùng GPS hiện tại để gọi RPC `get_nearby_posts` và dựng map bằng Leaflet."
        />
      </div>

      <div className="mt-6 rounded-[2rem] border border-border/70 bg-background/90 p-5 text-sm text-muted-foreground shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span>Tổng số bài đăng trong database</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}
