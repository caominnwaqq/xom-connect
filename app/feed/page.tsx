import { Newspaper } from "lucide-react";

import NearbyPostsExplorer from "@/src/components/posts/NearbyPostsExplorer";

export default function FeedPage() {

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_55%,_rgba(236,253,245,0.7)_100%)] px-4 pb-10 pt-6">
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Feed cộng đồng</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Các bài đăng mới nhất trong Xóm
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Đây là danh sách đọc trực tiếp từ Supabase. Khi bạn bắt đầu tạo bài đăng, feed này sẽ trở thành luồng chính của app.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
            <Newspaper className="size-7" />
          </div>
        </div>
      </section>

      <div className="mt-6">
        <NearbyPostsExplorer
          title="Feed theo bán kính gần bạn"
          description="Trang feed giờ không còn đọc toàn bộ posts một cách mù quáng; nó gọi PostGIS RPC để ưu tiên những gì ở gần bạn nhất."
        />
      </div>
    </div>
  );
}