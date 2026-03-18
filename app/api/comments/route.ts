import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/requireUser";
import { supabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

type CommentRecord = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    users: {
        display_name: string | null;
        avatar_url: string | null;
    } | null;
};

type SupabaseCommentRow = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    users:
    | {
        display_name: string | null;
        avatar_url: string | null;
    }
    | Array<{
        display_name: string | null;
        avatar_url: string | null;
    }>
    | null;
};

function clampInt(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function normalizeUserRelation(value: SupabaseCommentRow["users"]): CommentRecord["users"] {
    if (!value) {
        return null;
    }

    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value;
}

function normalizeCommentRow(row: SupabaseCommentRow): CommentRecord {
    return {
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        users: normalizeUserRelation(row.users),
    };
}

export async function GET(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId")?.trim() ?? "";
    const limit = clampInt(Number(searchParams.get("limit") ?? 50), 1, 100);

    if (!isUuid(postId)) {
        return NextResponse.json({ error: "Invalid postId." }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("comments")
        .select("id, post_id, user_id, content, created_at, users(display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const normalizedData = (data ?? []).map((row) => normalizeCommentRow(row as SupabaseCommentRow));

    const response = NextResponse.json({ data: normalizedData }, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    return response;
}

export async function POST(request: NextRequest) {
    if (!supabaseConfig.isConfigured) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    let user;
    try {
        user = await requireUser(request);
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unauthorized.",
            },
            { status: 401 }
        );
    }

    const body = (await request.json().catch(() => null)) as
        | {
            postId?: unknown;
            content?: unknown;
        }
        | null;

    const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!isUuid(postId)) {
        return NextResponse.json({ error: "Invalid postId." }, { status: 400 });
    }

    if (!content) {
        return NextResponse.json({ error: "Comment content cannot be empty." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
        return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
    }

    const supabase = createClient(supabaseConfig.supabaseUrl!, supabaseConfig.supabaseKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await supabase
        .from("comments")
        .insert({
            post_id: postId,
            user_id: user.id,
            content,
        })
        .select("id, post_id, user_id, content, created_at, users(display_name, avatar_url)")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: normalizeCommentRow(data as SupabaseCommentRow) }, { status: 201 });
}
