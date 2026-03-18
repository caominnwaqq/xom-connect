"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
    ArrowLeft,
    ImagePlus,
    LoaderCircle,
    MapPin,
    MapPinned,
    X,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

import { getSetupHelpText, postTypeOptions, type PostType } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
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

function extractSubmitErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null) {
        const errorLike = error as {
            message?: unknown;
            details?: unknown;
            hint?: unknown;
        };

        const message = typeof errorLike.message === "string" ? errorLike.message : null;
        const details = typeof errorLike.details === "string" ? errorLike.details : null;
        const hint = typeof errorLike.hint === "string" ? errorLike.hint : null;

        if (message) {
            const extras = [details, hint].filter(
                (value): value is string => Boolean(value && value.trim().length > 0)
            );

            return extras.length > 0 ? `${message} ${extras.join(" ")}` : message;
        }
    }

    return "Không thể tạo bài đăng ở thời điểm này.";
}

function UserAvatar({ url, name }: { url?: string | null; name: string }) {
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (url) {
        return (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
                <Image src={url} alt={name} fill sizes="40px" className="object-cover" />
            </div>
        );
    }

    return (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-700">
            {initials}
        </div>
    );
}

export default function CreatePostForm() {
    const router = useRouter();
    const { location, error: locationError, loading: locationLoading } = useGeolocation();
    const [session, setSession] = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(Boolean(supabase));
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<PostFormState>(initialFormState);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const setupHelpText = getSetupHelpText(supabaseConfig.errorMessage);

    const handleDescInput = () => {
        const el = descRef.current;
        if (!el) {
            return;
        }

        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        let active = true;

        if (!supabase) {
            setError(supabaseConfig.errorMessage);
            setLoadingSession(false);

            return () => {
                active = false;
            };
        }

        const client = supabase;

        const loadSession = async () => {
            const { data, error: sessionError } = await client.auth.getSession();

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
        } = client.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoadingSession(false);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setImageFile(file);

        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (file) {
            setImagePreview(URL.createObjectURL(file));
            return;
        }

        setImagePreview(null);
    };

    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        setImageFile(null);
        setImagePreview(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setMessage(null);
        setError(null);

        try {
            const client = supabase;

            if (!client) {
                throw new Error(supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình.");
            }

            if (!session?.user) {
                throw new Error("Bạn cần đăng nhập trước khi tạo bài đăng.");
            }

            if (!location) {
                throw new Error("Chưa lấy được vị trí để gắn vào bài đăng.");
            }

            const metadataDisplayName =
                typeof session.user.user_metadata?.display_name === "string"
                    ? session.user.user_metadata.display_name.trim()
                    : "";

            const upsertUserPayload: { id: string; display_name?: string } = {
                id: session.user.id,
            };

            if (metadataDisplayName) {
                upsertUserPayload.display_name = metadataDisplayName;
            }

            const { error: ensureUserError } = await client
                .from("users")
                .upsert(upsertUserPayload, { onConflict: "id" });

            if (ensureUserError) {
                throw ensureUserError;
            }

            let imageUrl: string | null = null;

            if (imageFile) {
                const filePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${getFileExtension(imageFile)}`;

                const { error: uploadError } = await client.storage
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
                } = client.storage.from("post-images").getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const { error: createError } = await client.rpc("create_post_with_location", {
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

            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }

            setImagePreview(null);
            setMessage(
                locationError
                    ? "Đã đăng bài với tọa độ fallback Ninh Kiều."
                    : "Bài đăng đã được gửi thành công!"
            );

            router.refresh();
            window.setTimeout(() => {
                router.push("/feed");
            }, 900);
        } catch (submitError) {
            const rawMessageText = extractSubmitErrorMessage(submitError);
            const messageText = rawMessageText.includes("posts_user_id_fkey")
                ? "Không tìm thấy hồ sơ người dùng trong hệ thống. Hãy mở trang Hồ sơ một lần rồi thử đăng lại."
                : rawMessageText.includes("type_legacy_text") || rawMessageText.includes("status_legacy_text")
                    ? "Schema bảng posts đang ở trạng thái legacy (cột *_legacy_text bị NOT NULL). Hãy chạy lại supabase/schema.sql rồi thử đăng lại."
                    : rawMessageText;
            const nextSetupHelpText = getSetupHelpText(messageText);

            setError(
                messageText.includes("Bucket not found")
                    ? `${messageText} Hãy chạy lại supabase/schema.sql để tạo bucket Storage.`
                    : nextSetupHelpText
                        ? `${messageText} ${nextSetupHelpText}`
                        : messageText
            );
        } finally {
            setSubmitting(false);
        }
    };

    const displayName =
        (session?.user?.user_metadata?.display_name ??
            "Bạn") as string;
    const avatarUrl = session?.user?.user_metadata?.avatar_url as string | undefined;
    const canSubmit =
        form.title.trim().length > 0 &&
        form.description.trim().length > 0 &&
        !!location &&
        !submitting;

    if (!supabase || loadingSession) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                {!supabase
                    ? supabaseConfig.errorMessage ?? "Supabase chưa được cấu hình."
                    : "Đang tải..."}
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                    <MapPin className="size-7" />
                </div>

                <div>
                    <h2 className="text-xl font-bold text-foreground">Đăng nhập để tạo bài</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Chỉ thành viên đã đăng nhập mới có thể đăng lên Xóm.
                    </p>
                </div>

                <Link
                    href="/profile"
                    className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                    Đăng nhập ngay
                </Link>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                    aria-label="Quay lại"
                >
                    <ArrowLeft className="size-5" />
                </button>

                <span className="text-base font-semibold text-foreground">Bài đăng mới</span>

                <button
                    type="submit"
                    form="create-post-form"
                    disabled={!canSubmit}
                    className={cn(
                        "rounded-full px-5 py-2 text-sm font-bold transition-colors",
                        canSubmit
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "cursor-not-allowed bg-muted text-muted-foreground"
                    )}
                >
                    {submitting ? <LoaderCircle className="size-4 animate-spin" /> : "Đăng"}
                </button>
            </div>

            <form id="create-post-form" onSubmit={handleSubmit} className="flex flex-1 flex-col px-4 pb-8 pt-4">
                <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                        <UserAvatar url={avatarUrl} name={displayName} />
                        <div className="mt-2 w-px flex-1 bg-border/60" />
                    </div>

                    <div className="min-w-0 flex-1 pb-4">
                        <p className="mb-2 text-sm font-semibold text-foreground">{displayName}</p>

                        <div className="mb-3 flex flex-wrap gap-1.5">
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

                        <input
                            value={form.title}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, title: event.target.value }))
                            }
                            placeholder="Tiêu đề bài đăng..."
                            required
                            className="mb-2 w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                        />

                        <textarea
                            ref={descRef}
                            value={form.description}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, description: event.target.value }))
                            }
                            onInput={handleDescInput}
                            placeholder="Chia sẻ điều gì đó với hàng xóm của bạn..."
                            required
                            rows={3}
                            className="w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
                        />

                        {imagePreview ? (
                            <div className="relative mt-3 overflow-hidden rounded-2xl border border-border/60">
                                <div className="relative h-52 w-full">
                                    <Image
                                        src={imagePreview}
                                        alt="Ảnh xem trước"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 520px"
                                        className="object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    aria-label="Xóa ảnh"
                                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        ) : null}

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {locationLoading ? (
                                <>
                                    <LoaderCircle className="size-3 animate-spin" />
                                    Đang lấy vị trí...
                                </>
                            ) : location ? (
                                <>
                                    <MapPinned className="size-3 text-emerald-600" />
                                    <span className={cn(locationError && "text-amber-600")}>
                                        {locationError
                                            ? `Fallback: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                                            : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="size-3 text-destructive" />
                                    Chưa có vị trí
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-1 flex items-center gap-3 border-t border-border/40 pt-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                    />
                    <label
                        htmlFor="image-upload"
                        title="Thêm ảnh"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ImagePlus className="size-5" />
                    </label>
                    <span className="text-xs text-muted-foreground">
                        {imageFile ? imageFile.name : "Thêm ảnh minh họa"}
                    </span>
                </div>

                {message ? (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {message}
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                {setupHelpText && !error ? (
                    <p className="mt-3 rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                        {setupHelpText}
                    </p>
                ) : null}
            </form>
        </div>
    );
}
