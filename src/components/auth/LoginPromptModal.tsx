"use client";

import { useRouter } from "next/navigation";
import { X, LogIn, UserPlus } from "lucide-react";

type LoginPromptModalProps = {
    open: boolean;
    onClose: () => void;
    action?: string;
};

export default function LoginPromptModal({ open, onClose, action }: LoginPromptModalProps) {
    const router = useRouter();

    if (!open) return null;

    const goToProfile = () => {
        onClose();
        router.push("/profile");
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Yêu cầu đăng nhập"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-t-[2rem] bg-background p-6 shadow-xl sm:rounded-[2rem]">
                {/* Close */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">
                        Xóm Connect
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <h2 className="mt-4 text-xl font-bold text-foreground">
                    Đăng nhập để tiếp tục
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {action
                        ? `Bạn cần đăng nhập để ${action}.`
                        : "Bạn cần đăng nhập để thực hiện hành động này."}
                    {" "}Việc xem feed không yêu cầu tài khoản.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={goToProfile}
                        className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                        <LogIn className="size-4" />
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        onClick={goToProfile}
                        className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border"
                    >
                        <UserPlus className="size-4" />
                        Tạo tài khoản mới
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Tiếp tục xem không cần đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
}
