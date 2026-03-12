"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LoaderCircle, MapPinned, Save, Sparkles, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useGeolocation } from "@/src/hooks/useGeolocation";

type UserProfile = {
  display_name: string | null;
  phone: string | null;
  karma_score: number | null;
};

function getDefaultDisplayName(user: User) {
  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  if (metadataName) {
    return metadataName;
  }

  return user.email?.split("@")[0] ?? "Hàng xóm";
}

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export default function ProfileDetailsCard({ user }: { user: User }) {
  const { location, error: locationError, loading: locationLoading } = useGeolocation();
  const [displayName, setDisplayName] = useState(getDefaultDisplayName(user));
  const [phone, setPhone] = useState("");
  const [karmaScore, setKarmaScore] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from("users")
        .select("display_name, phone, karma_score")
        .eq("id", user.id)
        .maybeSingle<UserProfile>();

      if (!active) {
        return;
      }

      if (profileError) {
        setError(profileError.message);
        setProfileLoading(false);
        return;
      }

      setDisplayName(data?.display_name || getDefaultDisplayName(user));
      setPhone(data?.phone ?? "");
      setKarmaScore(data?.karma_score ?? 0);
      setProfileLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      const trimmedDisplayName = displayName.trim() || getDefaultDisplayName(user);
      const trimmedPhone = phone.trim();
      const avatarUrl =
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null;

      const payload: {
        id: string;
        display_name: string;
        phone: string | null;
        avatar_url: string | null;
        location?: string;
      } = {
        id: user.id,
        display_name: trimmedDisplayName,
        phone: trimmedPhone || null,
        avatar_url: avatarUrl,
      };

      if (location) {
        payload.location = `POINT(${location.lng} ${location.lat})`;
      }

      const { error: saveError } = await supabase
        .from("users")
        .upsert(payload, { onConflict: "id" });

      if (saveError) {
        throw saveError;
      }

      setDisplayName(trimmedDisplayName);
      setPhone(trimmedPhone);
      setMessage(
        location
          ? locationError
            ? "Đã lưu hồ sơ cùng tọa độ fallback Ninh Kiều để test."
            : "Đã lưu hồ sơ cùng tọa độ GPS hiện tại lên Supabase."
          : "Đã lưu hồ sơ. Tọa độ sẽ được thêm sau khi GPS sẵn sàng."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật hồ sơ vào Supabase."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
          <MapPinned className="size-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Hồ sơ cư dân</p>
          <h3 className="text-lg font-semibold text-foreground">Lưu tên, số điện thoại và vị trí</h3>
        </div>
      </div>

      {profileLoading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải hồ sơ từ bảng `users`...
        </div>
      ) : null}

      <div className="grid gap-3 rounded-[1.5rem] bg-muted/50 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Điểm karma</span>
          <span className="rounded-full bg-background px-3 py-1 font-medium text-foreground">
            {karmaScore}
          </span>
        </div>

        <div className="rounded-2xl bg-background px-4 py-3">
          {locationLoading ? (
            <div className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              Đang lấy tọa độ GPS từ trình duyệt...
            </div>
          ) : location ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {formatCoordinate(location.lat)}, {formatCoordinate(location.lng)}
              </p>
              <p>
                {locationError
                  ? `Đang dùng fallback Ninh Kiều vì GPS báo lỗi: ${locationError}`
                  : "Đây là tọa độ GPS hiện tại sẽ được lưu vào hồ sơ."}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-600" />
              Chưa lấy được tọa độ ở thiết bị này.
            </div>
          )}
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSaveProfile}>
        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Tên hiển thị</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Tên bạn muốn hàng xóm nhìn thấy"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            required
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Số điện thoại</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0327 000 000"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
          />
        </label>

        {message ? (
          <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting || profileLoading} className="w-full rounded-2xl">
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu hồ sơ và vị trí
        </Button>
      </form>

      <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/8 px-4 py-3 text-sm text-emerald-800">
        <Sparkles className="size-4" />
        Sau bước này, app đã có người dùng + tọa độ để chạy các truy vấn hyper-local quanh bán kính nhỏ.
      </div>
    </section>
  );
}