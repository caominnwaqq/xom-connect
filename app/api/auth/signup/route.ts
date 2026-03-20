import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function parseCooldownMs(message: string): number | null {
  const normalized = message.toLowerCase();

  const matches = normalized.matchAll(
    /(\d+)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/g
  );

  let totalMs = 0;
  let foundDuration = false;

  for (const match of matches) {
    const value = Number(match[1]);
    const unit = match[2];

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    foundDuration = true;

    if (unit.startsWith("h")) {
      totalMs += value * 60 * 60 * 1000;
      continue;
    }

    if (unit.startsWith("m")) {
      totalMs += value * 60 * 1000;
      continue;
    }

    totalMs += value * 1000;
  }

  if (foundDuration && totalMs > 0) {
    return totalMs;
  }

  return null;
}

function formatCooldown(ms: number) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));

  if (seconds >= 3600) {
    return `${Math.ceil(seconds / 3600)} giờ`;
  }

  if (seconds < 60) {
    return `${seconds} giây`;
  }

  return `${Math.ceil(seconds / 60)} phút`;
}

function formatSignupError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over_email_send_rate_limit") ||
    (normalized.includes("rate limit") && normalized.includes("email"))
  ) {
    const cooldownMs = parseCooldownMs(message);
    const resetAt = typeof cooldownMs === "number" ? Date.now() + cooldownMs : undefined;
    const hint =
      typeof cooldownMs === "number"
        ? `Vui lòng thử lại sau ${formatCooldown(cooldownMs)}.`
        : "Vui lòng đợi thêm một lúc rồi thử lại. Nếu vẫn lỗi, hãy kiểm tra Supabase Dashboard -> Authentication -> Rate Limits.";

    return {
      status: 429,
      body: {
        error: "Đã vượt giới hạn gửi email xác thực.",
        code: "EMAIL_RATE_LIMIT",
        hint,
        ...(resetAt ? { resetAt } : null),
      },
    } as const;
  }

  if (normalized.includes("user already registered")) {
    return {
      status: 409,
      body: {
        error: "Email này đã được đăng ký.",
        code: "USER_ALREADY_REGISTERED",
        hint: "Hãy thử đăng nhập hoặc dùng chức năng quên mật khẩu.",
      },
    } as const;
  }

  return {
    status: 400,
    body: {
      error: message,
      code: "AUTH_SIGNUP_ERROR",
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; displayName?: string; emailRedirectTo?: string }
    | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const displayName = body?.displayName?.trim() ?? "";
  const emailRedirectTo = body?.emailRedirectTo?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : null),
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) {
    const formatted = formatSignupError(error.message);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }

  // If email confirmations are enabled in Supabase, `data.session` will be null until verified.
  return NextResponse.json(
    {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
    },
    { status: 200 }
  );
}

