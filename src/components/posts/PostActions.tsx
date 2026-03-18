"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, XCircle, CheckCircle } from "lucide-react";
import { deletePost } from "@/lib/supabase/posts";
import { cn } from "@/lib/utils";
import { isUuid } from "@/lib/validation";

type PostActionsProps = {
    postId: string;
    currentUserId?: string;
    postOwnerId: string;
    onDeleteSuccess?: () => void;
};

export default function PostActions({
    postId,
    currentUserId,
    postOwnerId,
    onDeleteSuccess,
}: PostActionsProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Only show actions if user owns the post
    const isOwner = currentUserId && currentUserId === postOwnerId;

    if (!isOwner) {
        return null;
    }

    const handleDeleteClick = () => {
        setDeleteError(null);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!isUuid(postId)) {
            setDeleteError("ID bài đăng không hợp lệ.");
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        const result = await deletePost(postId);

        if (result.success) {
            setShowDeleteConfirm(false);
            onDeleteSuccess?.();
            router.refresh();
        } else {
            setDeleteError(result.error);
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteError(null);
    };

    const handleEditClick = () => {
        if (!isUuid(postId)) {
            setDeleteError("ID bài đăng không hợp lệ.");
            return;
        }

        router.push(`/post/${postId}/edit`);
    };

    if (showDeleteConfirm) {
        return (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex-1">
                    <p className="text-xs font-medium text-destructive">
                        Xác nhận xóa bài đăng này?
                    </p>
                    {deleteError && (
                        <p className="mt-1 text-xs text-destructive/80">{deleteError}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCancelDelete}
                        disabled={isDeleting}
                        className={cn(
                            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            "bg-muted text-muted-foreground hover:bg-muted/80",
                            isDeleting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <XCircle className="size-3.5" />
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className={cn(
                            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                            isDeleting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <CheckCircle className="size-3.5" />
                        {isDeleting ? "Đang xóa..." : "Xóa"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 space-y-1.5">
            <div className="flex gap-2">
                <button
                    onClick={handleEditClick}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                    <Edit2 className="size-3.5" />
                    Chỉnh sửa
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                    <Trash2 className="size-3.5" />
                    Xóa
                </button>
            </div>
            {deleteError ? <p className="text-xs text-destructive/80">{deleteError}</p> : null}
        </div>
    );
}
