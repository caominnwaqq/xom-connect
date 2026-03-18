"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";

import { postTypeOptions, type PostType } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { updatePost } from "@/lib/supabase/posts";
import { cn } from "@/lib/utils";
import { isUuid } from "@/lib/validation";

type EditablePostRow = {
    id: string;
    user_id: string;
    type: string;
    title: string;
    description: string;
};

type EditPostFormProps = {
    postId: string | null;
};

const initialFormState: {
    type: PostType;
    title: string;
    description: string;
} = {
    type: "borrow",
    title: "",
    description: "",
};

export default function EditPostForm({ postId }: EditPostFormProps) {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [postLoaded, setPostLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!supabase) {
                if (!active) return;
                setError(supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình.");
                setLoading(false);
                return;
            }

            const safePostId = postId?.trim() ?? "";
            if (!isUuid(safePostId)) {
                if (!active) return;
                setError("ID bài đăng không hợp lệ.");
                setLoading(false);
                return;
            }

            const client = supabase;
            const { data: sessionData, error: sessionError } = await client.auth.getSession();

            if (!active) {
                return;
            }

            if (sessionError) {
                setError(sessionError.message);
                setLoading(false);
                return;
            }

            const currentSession = sessionData.session ?? null;
            setSession(currentSession);

            if (!currentSession?.user) {
                setError("Bạn cần đăng nhập để chỉnh sửa bài đăng.");
                setLoading(false);
                return;
            }

            const { data: post, error: postError } = await client
                .from("posts")
                .select("id, user_id, type, title, description")
                .eq("id", safePostId)
                .maybeSingle<EditablePostRow>();

            if (!active) {
                return;
            }

            if (postError) {
                setError(postError.message);
                setLoading(false);
                return;
            }

            if (!post) {
                setError("Không tìm thấy bài đăng cần chỉnh sửa.");
                setLoading(false);
                return;
            }

            if (post.user_id !== currentSession.user.id) {
                setError("Bạn không có quyền chỉnh sửa bài đăng này.");
                setLoading(false);
                return;
            }

            const nextType = postTypeOptions.some((option) => option.value === post.type)
                ? (post.type as PostType)
                : "borrow";

            setForm({
                type: nextType,
                title: post.title,
                description: post.description,
            });
            setPostLoaded(true);
            setLoading(false);
        };

        void load();

        return () => {
            active = false;
        };
    }, [postId]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);
        setError(null);

        const safePostId = postId?.trim() ?? "";
        if (!isUuid(safePostId)) {
            setError("ID bài đăng không hợp lệ.");
            return;
        }

        const title = form.title.trim();
        const description = form.description.trim();

        if (!title || !description) {
            setError("Tiêu đề và nội dung không được để trống.");
            return;
        }

        setSaving(true);

        const result = await updatePost(safePostId, {
            type: form.type,
            title,
            description,
        });

        if (!result.success) {
            setError(result.error);
            setSaving(false);
            return;
        }

        setMessage("Đã cập nhật bài đăng thành công.");
        setSaving(false);
        router.refresh();

        window.setTimeout(() => {
            router.push("/feed");
        }, 800);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Đang tải bài đăng...
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
                    <AlertCircle className="size-7" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Cần đăng nhập để chỉnh sửa</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {error ?? "Bạn cần đăng nhập để tiếp tục thao tác này."}
                    </p>
                </div>
                <Link
                    href="/profile"
                    className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                    Mở trang hồ sơ
                </Link>
            </div>
        );
    }

    if (!postLoaded) {
        return (
            <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6">
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div>
                            <p className="font-medium">Không thể mở trang chỉnh sửa.</p>
                            <p className="mt-1">{error ?? "ID bài đăng không hợp lệ hoặc bài đăng không tồn tại."}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/feed")}
                        className="mt-4 rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/80"
                    >
                        Quay lại feed
                    </button>
                </div>
            </div>
        );
    }

    const canSubmit = form.title.trim().length > 0 && form.description.trim().length > 0 && !saving;

    return (
        <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
            <div className="rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Quay lại"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <h1 className="text-base font-semibold text-foreground">Chỉnh sửa bài đăng</h1>
                    <div className="size-9" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                        {postTypeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setForm((current) => ({ ...current, type: option.value }))}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                                    form.type === option.value
                                        ? "bg-emerald-600 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-foreground">Tiêu đề</span>
                        <input
                            value={form.title}
                            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Tiêu đề bài đăng"
                            maxLength={180}
                            required
                            className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-foreground">Nội dung</span>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Mô tả chi tiết bài đăng"
                            rows={5}
                            maxLength={3000}
                            required
                            className="w-full resize-y rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors focus:border-primary"
                        />
                    </label>

                    {message ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                            <CheckCircle2 className="size-4 shrink-0" />
                            {message}
                        </div>
                    ) : null}

                    {error ? (
                        <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={cn(
                            "w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                            canSubmit
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "cursor-not-allowed bg-muted text-muted-foreground"
                        )}
                    >
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </form>
            </div>
        </div>
    );
}
