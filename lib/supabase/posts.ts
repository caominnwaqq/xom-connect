import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";
import { type PostPreview } from "@/lib/posts";
import { supabaseConfig } from "@/lib/supabase/config";

export async function getLatestPosts(limit = 3) {
  try {
    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return {
        count: 0,
        errorMessage: supabaseConfig.errorMessage,
        posts: [] as PostPreview[],
      };
    }

    const { data, error, count } = await supabase
      .from("posts")
      .select("id, title, type, status, description, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    return {
      count: count ?? 0,
      errorMessage: error?.message ?? null,
      posts: (data ?? []) as PostPreview[],
    };
  } catch (error) {
    return {
      count: 0,
      errorMessage:
        error instanceof Error ? error.message : "Không thể kết nối Supabase.",
      posts: [] as PostPreview[],
    };
  }
}

/**
 * Update an existing post (client-side)
 * User can only update their own posts due to RLS policy
 */
export async function updatePost(
  postId: string,
  updates: {
    title?: string;
    description?: string;
    type?: "borrow" | "giveaway" | "sos" | "service";
    status?: "active" | "completed" | "cancelled";
    image_url?: string | null;
  }
) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: supabaseConfig.errorMessage ?? "Supabase không được cấu hình.",
      };
    }

    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể cập nhật bài đăng.",
    };
  }
}

/**
 * Delete a post (client-side)
 * User can only delete their own posts due to RLS policy
 */
export async function deletePost(postId: string) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: supabaseConfig.errorMessage ?? "Supabase không được cấu hình.",
      };
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Không thể xóa bài đăng.",
    };
  }
}
