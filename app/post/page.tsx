import Link from "next/link";
import { ArrowRight, CirclePlus, ImagePlus, MapPinned, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import CreatePostForm from "@/src/components/posts/CreatePostForm";

const checklist = [
  "Đăng nhập bằng Supabase Auth",
  "Lấy tọa độ GPS hoặc dùng fallback Ninh Kiều",
  "Nhập tiêu đề, mô tả và loại bài đăng",
  "Upload hình ảnh lên Supabase Storage",
];

export default function PostPage() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 pb-10 pt-6">
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Tạo bài đăng</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Khung tạo post đã sẵn chỗ
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Tôi chưa nối form CRUD đầy đủ ở bước này, nhưng route `/post` đã sẵn để bottom nav không bị gãy và để chuẩn bị cho Phase tạo bài đăng.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
            <CirclePlus className="size-7" />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {checklist.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-700" />
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPinned className="size-4 text-emerald-700" />
            Vị trí của user sẽ được tái sử dụng từ hồ sơ đã lưu ở Supabase.
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ImagePlus className="size-4 text-emerald-700" />
            Bước upload ảnh sẽ cần thêm bucket Storage và policy tương ứng.
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button asChild className="flex-1 rounded-2xl">
            <Link href="/profile">
              Hoàn thiện hồ sơ trước
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-6">
        <CreatePostForm />
      </div>
    </div>
  );
}