"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LoaderCircle, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import ProfileDetailsCard from "@/src/components/auth/ProfileDetailsCard";

type AuthMode = "sign-in" | "sign-up";

export default function ProfileAuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) {
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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage(
          data.session
            ? "Tài khoản đã được tạo và đăng nhập ngay trên thiết bị này."
            : "Đăng ký thành công. Nếu Supabase bật xác thực email, hãy kiểm tra hộp thư để xác nhận tài khoản."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        setMessage("Đăng nhập thành công.");
      }

      setPassword("");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Đã có lỗi xảy ra khi làm việc với Supabase Auth."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    resetFeedback();
    setSubmitting(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setMessage("Bạn đã đăng xuất khỏi phiên hiện tại.");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Không thể đăng xuất ở thời điểm này."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải phiên đăng nhập từ Supabase...
        </div>
      </section>
    );
  }

  if (session?.user) {
    return (
      <div className="space-y-4">
        <section className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Đang đăng nhập</p>
              <h2 className="text-lg font-semibold text-foreground">
                {session.user.user_metadata.display_name || session.user.email}
              </h2>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{session.user.email}</p>
            <p className="mt-1">UID: {session.user.id}</p>
          </div>

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

          <Button onClick={handleSignOut} disabled={submitting} className="w-full rounded-2xl">
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Đăng xuất
          </Button>
        </section>

        <ProfileDetailsCard key={session.user.id} user={session.user} />
      </div>
    );
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Supabase Auth</p>
          <h2 className="text-lg font-semibold text-foreground">Đăng nhập hoặc tạo tài khoản</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            resetFeedback();
            setMode("sign-in");
          }}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            mode === "sign-in"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => {
            resetFeedback();
            setMode("sign-up");
          }}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            mode === "sign-up"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Đăng ký
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <label className="block space-y-2 text-sm font-medium text-foreground">
            <span>Tên hiển thị</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ví dụ: Hàng xóm tốt bụng"
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </label>
        ) : null}

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@xom.vn"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            required
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            minLength={6}
            required
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

        <Button type="submit" disabled={submitting} className="w-full rounded-2xl">
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {mode === "sign-up" ? "Tạo tài khoản" : "Đăng nhập"}
        </Button>
      </form>
    </section>
  );
}