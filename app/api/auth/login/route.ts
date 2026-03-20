import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/auth/getClientIp";
import { checkRateLimit } from "@/lib/auth/rateLimit";

function formatLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return {
      error: "Email hoặc mật khẩu không đúng.",
      code: "INVALID_CREDENTIALS",
      hint: "Nếu bạn vừa đăng ký, hãy kiểm tra email để xác thực tài khoản trước khi đăng nhập.",
    };
  }

  if (normalized.includes("email not confirmed")) {
    return {
      error: "Email của bạn chưa được xác thực.",
      code: "EMAIL_NOT_CONFIRMED",
      hint: "Hãy mở email xác thực Supabase và thử đăng nhập lại sau khi xác nhận.",
    };
  }

  return {
    error: message,
    code: "AUTH_LOGIN_ERROR",
  };
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const key = `login:${ip}:${email.toLowerCase()}`;
  const limit = checkRateLimit(key, { windowMs: 10 * 60 * 1000, max: 5 });

  if (limit.limited) {
    return NextResponse.json(
      {
        error: "Too many login attempts. Please try again later.",
        resetAt: limit.resetAt,
      },
      { status: 429 }
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json(formatLoginError(error.message), { status: 401 });
  }

  return NextResponse.json(
    {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
    },
    { status: 200 }
  );
}

