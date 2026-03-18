import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        token?: string;
        token_hash?: string;
        type?: "signup" | "recovery" | "email_change" | "magiclink";
      }
    | null;

  const type = body?.type ?? "signup";

  const hasTokenHash = Boolean(body?.token_hash?.trim());
  const hasEmailToken = Boolean(body?.email?.trim() && body?.token?.trim());

  if (!hasTokenHash && !hasEmailToken) {
    return NextResponse.json(
      { error: "Provide either token_hash or (email + token)." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    ...(hasTokenHash
      ? { token_hash: body!.token_hash!.trim() }
      : { email: body!.email!.trim(), token: body!.token!.trim() }),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
    },
    { status: 200 }
  );
}

