"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  ImagePlus,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { isSchemaMissing, postTypeOptions, type PostType } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/src/hooks/useGeolocation";

type PostFormState = {
  type: PostType;
  title: string;
  description: string;
};

const initialFormState: PostFormState = {
  type: "borrow",
  title: "",
  description: "",
};

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension || "jpg";
}

export default function CreatePostForm() {
  const router = useRouter();
  const { location, error: locationError, loading: locationLoading } = useGeolocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PostFormState>(initialFormState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
      }

      setSession(data.session ?? null);
      setLoadingSession(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleChange = <K extends keyof PostFormState>(field: K, value: PostFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (!session?.user) {
        throw new Error("Bạn cần đăng nhập trước khi tạo bài đăng.");
      }

      if (!location) {
        throw new Error("Chưa lấy được vị trí để gắn vào bài đăng.");
      }

      let imageUrl: string | null = null;

      if (imageFile) {
        const filePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${getFileExtension(imageFile)}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error: createError } = await supabase.rpc("create_post_with_location", {
        post_type: form.type,
        post_title: form.title.trim(),
        post_description: form.description.trim(),
        post_image_url: imageUrl,
        post_lat: location.lat,
        post_lng: location.lng,
      });

      if (createError) {
        throw createError;
      }

      setForm(initialFormState);
      setImageFile(null);
      setMessage(
        locationError
          ? "Đã tạo bài đăng với tọa độ fallback Ninh Kiều để test."
          : "Đã tạo bài đăng mới và lưu đúng vị trí hiện tại."
      );

      router.refresh();
      window.setTimeout(() => {
        router.push("/feed");
      }, 700);
    } catch (submitError) {
      const messageText =
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo bài đăng ở thời điểm này.";

      setError(
        isSchemaMissing(messageText) || messageText.includes("Bucket not found")
          ? `${messageText} Hãy chạy lại file supabase/schema.sql để tạo RPC và bucket Storage.`
          : messageText
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải phiên đăng nhập từ Supabase...
        </div>
      </section>
    );
  }

  if (!session?.user) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Cần xác thực</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Bạn cần đăng nhập trước khi tạo bài đăng
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Route này đã sẵn logic upload ảnh và lưu post vào Supabase, nhưng chỉ mở cho user đã đăng nhập.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
            <ShieldCheck className="size-7" />
          </div>
        </div>

        <div className="mt-6">
          <Button asChild className="w-full rounded-2xl">
            <Link href="/profile">Mở hồ sơ để đăng nhập</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Tạo bài đăng thật</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Lưu post mới vào Supabase
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Ảnh sẽ được upload lên Storage bucket `post-images`, còn bài đăng sẽ được tạo qua RPC để gắn đúng tọa độ địa lý.
          </p>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
          <ImagePlus className="size-7" />
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-muted/60 p-4 text-sm text-muted-foreground">
        {locationLoading ? (
          <div className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Đang lấy GPS để gắn vào bài đăng...
          </div>
        ) : location ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <MapPinned className="size-4 text-emerald-700" />
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </div>
            <p>
              {locationError
                ? `Đang dùng fallback vì GPS báo lỗi: ${locationError}`
                : "Bài đăng mới sẽ dùng đúng vị trí hiện tại của bạn."}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-600" />
            Chưa có vị trí để tạo post.
          </div>
        )}
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2">
          {postTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange("type", option.value)}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                form.type === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Tiêu đề</span>
          <input
            value={form.title}
            onChange={(event) => handleChange("title", event.target.value)}
            placeholder="Ví dụ: Cần mượn khoan bê tông trong chiều nay"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            required
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Mô tả</span>
          <textarea
            value={form.description}
            onChange={(event) => handleChange("description", event.target.value)}
            placeholder="Mô tả chi tiết để hàng xóm biết bạn đang cần gì hoặc muốn chia sẻ gì."
            className="min-h-32 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            required
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Ảnh minh họa</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {imageFile ? `Đã chọn: ${imageFile.name}` : "Có thể bỏ qua ảnh nếu bạn chỉ muốn test flow tạo post."}
          </p>
        </label>

        {message ? (
          <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={submitting || loadingSession || locationLoading || !location}
          className="w-full rounded-2xl"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Tạo bài đăng
        </Button>
      </form>
    </section>
  );
}