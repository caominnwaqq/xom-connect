"use client";

import { useParams } from "next/navigation";

import EditPostForm from "@/src/components/posts/EditPostForm";

export default function EditPostPage() {
    const params = useParams<{ postId?: string | string[] }>();
    const rawPostId = params?.postId;
    const postId = Array.isArray(rawPostId) ? (rawPostId[0] ?? null) : (rawPostId ?? null);

    return (
        <div className="min-h-full bg-background">
            <EditPostForm postId={postId} />
        </div>
    );
}
