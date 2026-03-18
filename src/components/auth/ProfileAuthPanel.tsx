"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { LoaderCircle, LogOut, MapPinned, Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSetupHelpText } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { useGeolocation } from "@/src/hooks/useGeolocation";

type AuthMode = "sign-in" | "sign-up";

type UserProfile = {
  display_name: string | null;
  phone: string | null;
};

type UserWithPendingEmail = User & {
  new_email?: string | null;
};

type ProfileSignedInPanelProps = {
  user: User;
  authMessage: string | null;
  authError: string | null;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
};

type AuthApiResponse =
  | { error: string; resetAt?: number }
  | {
    user: { id: string; email: string | null } | null;
    session: Session | null;
  };

const pendingEmailChangeStorageKey = "xom-connect:pending-email-change";
const emailChangeRateLimitUntilStorageKey = "xom-connect:email-change-rate-limit-until";
const defaultEmailChangeCooldownMs = 60 * 1000;

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPendingEmailChange() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(pendingEmailChangeStorageKey);
  return value ? normalizeEmail(value) : null;
}

function clearPendingEmailChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(pendingEmailChangeStorageKey);
}

function storePendingEmailChange(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(pendingEmailChangeStorageKey, value);
}

function getStoredEmailChangeRateLimitUntil() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = Number(window.localStorage.getItem(emailChangeRateLimitUntilStorageKey));

  if (!Number.isFinite(value) || value <= Date.now()) {
    window.localStorage.removeItem(emailChangeRateLimitUntilStorageKey);
    return null;
  }

  return value;
}

function storeEmailChangeRateLimitUntil(value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(emailChangeRateLimitUntilStorageKey, String(value));
}

function clearEmailChangeRateLimitUntil() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(emailChangeRateLimitUntilStorageKey);
}

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

function getPendingEmailChangeForUser(user: User) {
  const pendingEmail = normalizeEmail((user as UserWithPendingEmail).new_email);

  if (pendingEmail) {
    return pendingEmail;
  }

  const storedPendingEmail = getPendingEmailChange();
  const currentEmail = normalizeEmail(user.email);

  if (!storedPendingEmail || storedPendingEmail === currentEmail) {
    return null;
  }

  return storedPendingEmail;
}

function isEmailRateLimitError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many requests");
}

function parseEmailRateLimitCooldownMs(message: string) {
  const normalizedMessage = message.toLowerCase();

  const secondMatch = normalizedMessage.match(/(\d+)\s*(seconds?|secs?|sec|s)\b/);
  if (secondMatch) {
    const seconds = Number(secondMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  const minuteMatch = normalizedMessage.match(/(\d+)\s*(minutes?|mins?|min|m)\b/);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) {
      return minutes * 60 * 1000;
    }
  }

  return defaultEmailChangeCooldownMs;
}

function formatEmailRateLimitDuration(until: number) {
  const secondsLeft = Math.max(1, Math.ceil((until - Date.now()) / 1000));

  if (secondsLeft < 60) {
    return `${secondsLeft} giây`;
  }

  const minutesLeft = Math.ceil(secondsLeft / 60);
  return `${minutesLeft} phút`;
}

function getEmailRateLimitMessage(until: number) {
  return `Đang tạm giới hạn gửi email xác thực. Hồ sơ vẫn đã được lưu, hãy thử đổi email lại sau ${formatEmailRateLimitDuration(until)}.`;
}

function getEmailUpdateErrorMessage(message: string) {
  return `${message} Tên hiển thị, số điện thoại và vị trí đã được lưu, nhưng email chưa được cập nhật.`;
}

function mergeSessionUser(baseSession: Session, user: User) {
  return {
    ...baseSession,
    user,
  } satisfies Session;
}

function ProfileSignedInPanel({
  user,
  authMessage,
  authError,
  onSignOut,
  signingOut,
}: ProfileSignedInPanelProps) {
  const { location, error: locationError } = useGeolocation();
  const currentUserEmail = normalizeEmail(user.email);
  const userNewEmail = normalizeEmail((user as UserWithPendingEmail).new_email);
  const [displayName, setDisplayName] = useState(getDefaultDisplayName(user));
  const [email, setEmail] = useState(userNewEmail || user.email || "");
  const [pendingEmail, setPendingEmail] = useState<string | null>(userNewEmail || null);
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visiblePendingEmail = pendingEmail && pendingEmail !== currentUserEmail ? pendingEmail : null;

  useEffect(() => {
    const nextPendingEmail = getPendingEmailChangeForUser(user);

    if (nextPendingEmail && nextPendingEmail === currentUserEmail) {
      clearPendingEmailChange();
      setPendingEmail(null);
      setEmail(user.email ?? "");
      return;
    }

    setPendingEmail(nextPendingEmail);
    setEmail(nextPendingEmail || user.email || "");
  }, [currentUserEmail, user, user.email, userNewEmail]);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setError(supabaseConfig.errorMessage);
      setProfileLoading(false);

      return () => {
        active = false;
      };
    }

    const client = supabase;
    setProfileLoading(true);
    setDisplayName(getDefaultDisplayName(user));

    const loadProfile = async () => {
      const { data, error: profileError } = await client
        .from("users")
        .select("display_name, phone")
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
      setProfileLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const submitProfile = async (resendRequested = false) => {
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      const client = supabase;

      if (!client) {
        throw new Error(supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình.");
      }

      const trimmedDisplayName = displayName.trim() || getDefaultDisplayName(user);
      const trimmedEmail = normalizeEmail(email);
      const trimmedPhone = phone.trim();
      const emailChanged = trimmedEmail !== currentUserEmail;
      const emailAlreadyPending = visiblePendingEmail === trimmedEmail && emailChanged;
      const shouldResendPendingEmail = emailAlreadyPending && resendRequested;
      const shouldRequestEmailChange = emailChanged && (!emailAlreadyPending || resendRequested);
      let emailFeedback: string | null = null;
      const avatarUrl =
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null;

      if (!trimmedEmail) {
        throw new Error("Email không được để trống.");
      }

      if (!resendRequested) {
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

        const { error: saveError } = await client
          .from("users")
          .upsert(payload, { onConflict: "id" });

        if (saveError) {
          throw saveError;
        }
      }

      if (shouldRequestEmailChange) {
        const rateLimitUntil = getStoredEmailChangeRateLimitUntil();

        if (rateLimitUntil && !resendRequested) {
          emailFeedback = getEmailRateLimitMessage(rateLimitUntil);
        } else {
          const emailRedirectTo =
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/auth/confirm?next=/profile`;

          const { error: emailUpdateError } = shouldResendPendingEmail
            ? await client.auth.resend({
              type: "email_change",
              email: trimmedEmail,
              options: emailRedirectTo ? { emailRedirectTo } : undefined,
            })
            : await client.auth.updateUser(
              { email: trimmedEmail },
              emailRedirectTo ? { emailRedirectTo } : undefined
            );

          if (emailUpdateError) {
            if (isEmailRateLimitError(emailUpdateError.message)) {
              const cooldownMs = parseEmailRateLimitCooldownMs(emailUpdateError.message);
              const nextRateLimitUntil = Date.now() + cooldownMs;
              storeEmailChangeRateLimitUntil(nextRateLimitUntil);
              emailFeedback = getEmailRateLimitMessage(nextRateLimitUntil);
            } else {
              throw new Error(getEmailUpdateErrorMessage(emailUpdateError.message));
            }
          } else {
            clearEmailChangeRateLimitUntil();
            setPendingEmail(trimmedEmail);
            storePendingEmailChange(trimmedEmail);
            emailFeedback = shouldResendPendingEmail
              ? `Đã gửi lại email xác thực đến ${trimmedEmail} !`
              : `Chúng tôi đã gửi email xác thực đến ${trimmedEmail} !`;
          }
        }
      } else if (emailAlreadyPending) {
        emailFeedback = `Email ${trimmedEmail} vẫn đang chờ xác thực từ lần gửi trước. Nếu bạn chưa nhận được thư, hãy bấm Gửi lại email xác thực.`;
      }

      if (!resendRequested) {
        setDisplayName(trimmedDisplayName);
        setPhone(trimmedPhone);
      }

      setEmail(trimmedEmail);
      setMessage(
        [
          resendRequested
            ? null
            : location
              ? locationError
                ? "Đã lưu hồ sơ cùng tọa độ fallback Ninh Kiều để test."
                : "Đã lưu hồ sơ !"
              : "Đã lưu hồ sơ !",
          emailFeedback,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật hồ sơ !"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitProfile(false);
  };

  const handleResendEmail = async () => {
    await submitProfile(true);
  };

  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinned className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {user.user_metadata.display_name || user.email}
          </h2>
        </div>
      </div>
      {authMessage ? (
        <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {authMessage}
        </p>
      ) : null}

      {authError ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {authError}
        </p>
      ) : null}

      {profileLoading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải hồ sơ người dùng...
        </div>
      ) : null}

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
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@xom.vn"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
            required
          />
          {visiblePendingEmail ? (
            <div className="space-y-2">
              <p className="text-xs font-normal leading-5 text-muted-foreground">
                Đang chờ xác thực email mới: {visiblePendingEmail}.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleResendEmail();
                }}
                disabled={submitting || signingOut || profileLoading}
                className="h-8 rounded-full px-3 text-xs"
              >
                Gửi lại email xác thực
              </Button>
            </div>
          ) : null}
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

        <Button
          type="submit"
          disabled={submitting || signingOut || profileLoading}
          className="w-full rounded-2xl"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu hồ sơ
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void onSignOut();
          }}
          disabled={submitting || signingOut}
          className="w-full rounded-2xl"
        >
          {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Đăng xuất
        </Button>
      </form>
    </section>
  );
}

export default function ProfileAuthPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setupHelpText = getSetupHelpText(supabaseConfig.errorMessage);
  const emailChangeStatus = searchParams.get("emailChange");
  const emailChangeMessage = searchParams.get("emailChangeMessage")?.trim() ?? null;

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setError(supabaseConfig.errorMessage);
      setLoadingSession(false);

      return () => {
        mounted = false;
      };
    }

    const client = supabase;

    const syncLatestUser = async (baseSession: Session | null) => {
      if (!baseSession) {
        return baseSession;
      }

      const { data: userData, error: userError } = await client.auth.getUser();

      if (!mounted) {
        return baseSession;
      }

      if (userError || !userData.user) {
        return baseSession;
      }

      const nextSession = mergeSessionUser(baseSession, userData.user);
      const pendingEmail = getPendingEmailChange();

      if (
        pendingEmail &&
        normalizeEmail(userData.user.email) === pendingEmail
      ) {
        clearPendingEmailChange();
      }

      setSession(nextSession);
      return nextSession;
    };

    const loadSession = async () => {
      const { data, error: sessionError } = await client.auth.getSession();

      if (!mounted) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
      }

      const pendingEmail = getPendingEmailChange();
      if (
        pendingEmail &&
        normalizeEmail(data.session?.user?.email) === pendingEmail
      ) {
        clearPendingEmailChange();
      }

      const nextSession = data.session ?? null;

      setSession(nextSession);
      setLoadingSession(false);

      if (nextSession) {
        void syncLatestUser(nextSession);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      const pendingEmail = getPendingEmailChange();
      if (
        pendingEmail &&
        normalizeEmail(nextSession?.user?.email) === pendingEmail
      ) {
        clearPendingEmailChange();
      }

      setSession(nextSession);
      setLoadingSession(false);

      if (nextSession) {
        window.setTimeout(() => {
          void syncLatestUser(nextSession);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!emailChangeStatus) {
      return;
    }

    let active = true;

    const clearEmailChangeQuery = () => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("emailChange");
      nextParams.delete("emailChangeMessage");
      nextParams.delete("error");
      nextParams.delete("error_code");
      nextParams.delete("error_description");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    };

    const applyEmailChangeFeedback = async () => {
      if (emailChangeStatus === "confirmed") {
        const pendingEmail = getPendingEmailChange();
        let refreshedSession: Session | null = null;
        let latestUser: User | null = null;

        if (supabase) {
          try {
            const { data, error: refreshError } = await supabase.auth.refreshSession();

            if (!active) {
              return;
            }

            if (!refreshError) {
              refreshedSession = data.session ?? null;
              setSession(refreshedSession);
            }

            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (!active) {
              return;
            }

            if (!userError && userData.user) {
              latestUser = userData.user;

              if (refreshedSession) {
                refreshedSession = mergeSessionUser(refreshedSession, userData.user);
                setSession(refreshedSession);
              } else if (session) {
                refreshedSession = mergeSessionUser(session, userData.user);
                setSession(refreshedSession);
              }
            }
          } catch {
            // Keep existing session if refresh fails; user may still need second confirmation.
          }
        }

        const activeEmail = normalizeEmail(latestUser?.email ?? refreshedSession?.user?.email ?? session?.user?.email);

        if (pendingEmail && activeEmail === pendingEmail) {
          clearPendingEmailChange();
          setMessage("Email mới đã được xác thực và cập nhật thành công.");
          setError(null);
        } else if (pendingEmail) {
          setMessage(
            `Liên kết xác thực đã được chấp nhận. Nếu email mới chưa hiện ngay, hãy kiểm tra và xác nhận thêm trong hộp thư email cũ để hoàn tất đổi sang ${pendingEmail}.`
          );
          setError(null);
        } else {
          setMessage("Liên kết xác thực email đã được chấp nhận.");
          setError(null);
        }
      } else if (emailChangeStatus === "error") {
        setError(
          emailChangeMessage ||
          "Không thể hoàn tất xác thực email. Hãy mở lại link mới nhất trong hộp thư và thử lại."
        );
        setMessage(null);
      }

      clearEmailChangeQuery();
    };

    void applyEmailChangeFeedback();

    return () => {
      active = false;
    };
  }, [emailChangeMessage, emailChangeStatus, pathname, router, searchParams, session]);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setSubmitting(true);

    try {
      const client = supabase;

      if (!client) {
        throw new Error(supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình.");
      }

      if (mode === "sign-up") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            displayName: displayName.trim(),
          }),
        });

        const payload = (await response.json().catch(() => null)) as AuthApiResponse | null;
        if (!response.ok || !payload || "error" in payload) {
          throw new Error(payload && "error" in payload ? payload.error : "Không thể đăng ký lúc này.");
        }

        if (payload.session?.access_token && payload.session.refresh_token) {
          const { error: setSessionError } = await client.auth.setSession({
            access_token: payload.session.access_token,
            refresh_token: payload.session.refresh_token,
          });
          if (setSessionError) throw new Error(setSessionError.message);
        }

        setMessage(
          payload.session
            ? "Tài khoản đã được tạo và đăng nhập ngay trên thiết bị này."
            : "Đăng ký thành công."
        );
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const payload = (await response.json().catch(() => null)) as AuthApiResponse | null;
        if (!response.ok || !payload || "error" in payload) {
          throw new Error(payload && "error" in payload ? payload.error : "Email hoặc mật khẩu không đúng.");
        }

        if (payload.session?.access_token && payload.session.refresh_token) {
          const { error: setSessionError } = await client.auth.setSession({
            access_token: payload.session.access_token,
            refresh_token: payload.session.refresh_token,
          });
          if (setSessionError) throw new Error(setSessionError.message);
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
      const client = supabase;

      if (!client) {
        throw new Error(supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình.");
      }

      const currentAccessToken = session?.access_token;
      if (currentAccessToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ access_token: currentAccessToken }),
        }).catch(() => null);
      }

      const { error: signOutError } = await client.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setMessage("Bạn đã đăng xuất thành công.");
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

  if (!supabase) {
    return (
      <section className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Supabase chưa sẵn sàng</p>
            <h2 className="text-lg font-semibold text-foreground">App cần env để bật đăng nhập và dữ liệu</h2>
          </div>
        </div>

        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {supabaseConfig.errorMessage}
        </p>

        {setupHelpText ? (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {setupHelpText}
          </p>
        ) : null}
      </section>
    );
  }

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
      <ProfileSignedInPanel
        key={session.user.id}
        user={session.user}
        authMessage={message}
        authError={error}
        onSignOut={handleSignOut}
        signingOut={submitting}
      />
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