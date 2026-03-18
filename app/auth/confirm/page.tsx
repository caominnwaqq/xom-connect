"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";

function getSafeNextPath(value: string | null) {
  return value && value.startsWith("/") ? value : "/profile";
}

function buildRedirectPath(nextPath: string, status: "confirmed" | "error", message?: string) {
  const params = new URLSearchParams();
  params.set("emailChange", status);

  if (message) {
    params.set("emailChangeMessage", message);
  }

  return params.toString() ? `${nextPath}?${params.toString()}` : nextPath;
}

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams.get("next")?.trim() ?? null);

    if (!supabase) {
      router.replace(
        buildRedirectPath(
          nextPath,
          "error",
          supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình để hoàn tất xác thực email."
        )
      );
      return;
    }

    const client = supabase;

    let finished = false;

    const finish = (status: "confirmed" | "error", message?: string) => {
      if (finished) {
        return;
      }

      finished = true;
      router.replace(buildRedirectPath(nextPath, status, message));
    };

    const initialError =
      searchParams.get("error_description")?.trim() ||
      searchParams.get("error")?.trim() ||
      null;

    if (initialError) {
      finish("error", initialError);
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
        session?.user
      ) {
        finish("confirmed");
      }
    });

    const timeoutId = window.setTimeout(() => {
      void client.auth.getSession().then(({ data, error }) => {
        if (error) {
          finish("error", error.message);
          return;
        }

        if (data.session?.user) {
          finish("confirmed");
          return;
        }

        finish("error", "Không thể hoàn tất xác thực email từ link này.");
      });
    }, 400);

    return () => {
      finished = true;
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang hoàn tất xác thực email...
        </div>
      </div>
    </div>
  );
}

function AuthConfirmFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang hoàn tất xác thực email...
        </div>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<AuthConfirmFallback />}>
      <AuthConfirmContent />
    </Suspense>
  );
}