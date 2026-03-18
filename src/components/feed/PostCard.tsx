"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, LoaderCircle, X } from "lucide-react";

import { formatPostType, formatRelativeTime, formatDistance } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import PostActions from "@/src/components/posts/PostActions";
import LoginPromptModal from "@/src/components/auth/LoginPromptModal";

export type FeedPost = {
    id: string;
    user_id: string;
    type: string;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
    distance_meters?: number | null;
    users?: { display_name: string | null; avatar_url: string | null } | null;
};

type PostComment = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    users?: { display_name: string | null; avatar_url: string | null } | null;
};

type PostCardProps = {
    post: FeedPost;
    currentUserId?: string | null;
    isGuest?: boolean;
};

function UserAvatar({ url, name }: { url: string | null | undefined; name: string | null | undefined }) {
    const initials = (name ?? "U")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (url) {
        return (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
                <Image src={url} alt={name ?? "avatar"} fill sizes="40px" className="object-cover" />
            </div>
        );
    }

    return (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-700">
            {initials}
        </div>
    );
}

export default function PostCard({ post, currentUserId, isGuest }: PostCardProps) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [loginPrompt, setLoginPrompt] = useState<string | null>(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState<string | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [commentDraft, setCommentDraft] = useState("");
    const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);

    const displayName = post.users?.display_name ?? "Người dùng";
    const avatarUrl = post.users?.avatar_url ?? null;

    const requireAuth = (action: string, fn: () => void) => {
        if (isGuest) {
            setLoginPrompt(action);
        } else {
            fn();
        }
    };

    const handleLike = () => requireAuth("thích bài đăng", () => {
        setLiked((prev) => {
            const next = !prev;
            setLikeCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
            return next;
        });
    });

    const loadComments = async () => {
        setCommentsLoading(true);
        setCommentsError(null);

        try {
            const response = await fetch(`/api/comments?postId=${encodeURIComponent(post.id)}&limit=100`, {
                method: "GET",
            });
            const payload = (await response.json().catch(() => null)) as
                | { error: string }
                | { data: PostComment[] }
                | null;

            if (!response.ok || !payload || "error" in payload) {
                setCommentsError(payload && "error" in payload ? payload.error : "Không thể tải bình luận.");
                setComments([]);
                return;
            }

            setComments(payload.data ?? []);
            setCommentsLoaded(true);
        } catch {
            setCommentsError("Không thể tải bình luận.");
            setComments([]);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleCommentToggle = () => {
        const opening = !commentsOpen;
        setCommentsOpen(opening);

        if (opening && !commentsLoaded && !commentsLoading) {
            void loadComments();
        }
    };

    const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCommentSubmitError(null);

        if (isGuest) {
            setLoginPrompt("bình luận");
            return;
        }

        const content = commentDraft.trim();
        if (!content) {
            setCommentSubmitError("Nội dung bình luận không được để trống.");
            return;
        }

        if (!supabase) {
            setCommentSubmitError("Supabase chưa được cấu hình.");
            return;
        }

        setSubmittingComment(true);

        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (!token) {
                setLoginPrompt("bình luận");
                return;
            }

            const response = await fetch("/api/comments", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    postId: post.id,
                    content,
                }),
            });

            const payload = (await response.json().catch(() => null)) as
                | { error: string }
                | { data: PostComment }
                | null;

            if (!response.ok || !payload || "error" in payload) {
                setCommentSubmitError(payload && "error" in payload ? payload.error : "Không thể gửi bình luận.");
                return;
            }

            setComments((prev) => [...prev, payload.data]);
            setCommentDraft("");
            setCommentsLoaded(true);
            setCommentsError(null);
        } catch {
            setCommentSubmitError("Không thể gửi bình luận.");
        } finally {
            setSubmittingComment(false);
        }
    };

    return (
        <>
            <LoginPromptModal
                open={loginPrompt !== null}
                onClose={() => setLoginPrompt(null)}
                action={loginPrompt ?? undefined}
            />

            <article className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-3">
                        <UserAvatar url={avatarUrl} name={displayName} />
                        <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                    {formatRelativeTime(post.created_at)}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                                    {formatPostType(post.type)}
                                </span>
                                {post.distance_meters != null && (
                                    <>
                                        <span className="text-xs text-muted-foreground">·</span>
                                        <span className="text-xs font-medium text-primary">
                                            {formatDistance(post.distance_meters)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {currentUserId && currentUserId === post.user_id && (
                        <div className="shrink-0">
                            <PostActions
                                postId={post.id}
                                currentUserId={currentUserId}
                                postOwnerId={post.user_id}
                            />
                        </div>
                    )}
                    {(!currentUserId || currentUserId !== post.user_id) && (
                        <button
                            type="button"
                            aria-label="Thêm tùy chọn"
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <MoreHorizontal className="size-4" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="px-4">
                    <h3 className="text-base font-semibold text-foreground leading-snug">{post.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{post.description}</p>
                </div>

                {/* Image */}
                {post.image_url && (
                    <div className="relative mt-3 h-52 w-full overflow-hidden">
                        <Image
                            src={post.image_url}
                            alt={post.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 520px"
                            className="object-cover"
                        />
                    </div>
                )}

                {/* Footer actions */}
                {isGuest ? (
                    /* Guest: show locked action bar */
                    <div className="flex items-center gap-1 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setLoginPrompt("thích bài đăng")}
                            aria-label="Thích"
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
                        >
                            <Heart className="size-4" />
                            <span className="hidden sm:inline">Thích</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleCommentToggle}
                            aria-label="Bình luận"
                            className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                                commentsOpen
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
                            )}
                        >
                            <MessageCircle className="size-4" />
                            <span className="hidden sm:inline">
                                Bình luận{commentsLoaded && comments.length > 0 ? ` (${comments.length})` : ""}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setLoginPrompt("repost")}
                            aria-label="Repost"
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
                        >
                            <Repeat2 className="size-4" />
                            <span className="hidden sm:inline">Repost</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleLike}
                                aria-label="Thích"
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                                    liked
                                        ? "text-rose-500"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Heart className={cn("size-4", liked && "fill-rose-500")} />
                                {likeCount > 0 && <span>{likeCount}</span>}
                                <span className="hidden sm:inline">Thích</span>
                            </button>

                            <button
                                type="button"
                                aria-label="Bình luận"
                                onClick={handleCommentToggle}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                                    commentsOpen
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <MessageCircle className="size-4" />
                                <span className="hidden sm:inline">
                                    Bình luận{commentsLoaded && comments.length > 0 ? ` (${comments.length})` : ""}
                                </span>
                            </button>

                            <button
                                type="button"
                                aria-label="Chia sẻ lại"
                                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Repeat2 className="size-4" />
                                <span className="hidden sm:inline">Repost</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            aria-label="Chia sẻ"
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Share2 className="size-4" />
                            <span className="hidden sm:inline">Chia sẻ</span>
                        </button>
                    </div>
                )}
            </article>

            {commentsOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Bình luận"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setCommentsOpen(false);
                        }
                    }}
                >
                    <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {formatPostType(post.type)} · {formatRelativeTime(post.created_at)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCommentsOpen(false)}
                                aria-label="Đóng bình luận"
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            <div className="mb-3 rounded-2xl bg-muted/40 px-3 py-2.5">
                                <h4 className="text-sm font-semibold text-foreground">{post.title}</h4>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{post.description}</p>
                            </div>

                            {commentsLoading ? (
                                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                                    <LoaderCircle className="size-4 animate-spin" />
                                    Đang tải bình luận...
                                </div>
                            ) : commentsError ? (
                                <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    <p>{commentsError}</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void loadComments();
                                        }}
                                        className="mt-2 text-xs font-semibold underline underline-offset-2"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : comments.length > 0 ? (
                                <ul className="space-y-2.5">
                                    {comments.map((comment) => (
                                        <li key={comment.id} className="rounded-2xl bg-muted/40 px-3 py-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-foreground">
                                                    {comment.users?.display_name ?? "Người dùng"}
                                                </p>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {formatRelativeTime(comment.created_at)}
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-sm leading-6 text-foreground/90">{comment.content}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="py-2 text-sm text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên.</p>
                            )}
                        </div>

                        <div className="border-t border-border/60 px-4 py-3">
                            <form onSubmit={handleCommentSubmit} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={commentDraft}
                                        onChange={(event) => setCommentDraft(event.target.value)}
                                        placeholder={isGuest ? "Đăng nhập để bình luận" : "Viết bình luận..."}
                                        disabled={Boolean(isGuest) || submittingComment}
                                        className="h-10 flex-1 rounded-full border border-border/70 bg-background px-4 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                                    />

                                    {isGuest ? (
                                        <button
                                            type="button"
                                            onClick={() => setLoginPrompt("bình luận")}
                                            className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/80"
                                        >
                                            Đăng nhập
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={submittingComment}
                                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {submittingComment ? "Đang gửi..." : "Gửi"}
                                        </button>
                                    )}
                                </div>

                                {commentSubmitError && (
                                    <p className="text-sm text-destructive">{commentSubmitError}</p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

