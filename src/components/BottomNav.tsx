"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CirclePlus,
    MapPinned,
    Newspaper,
    type LucideIcon,
    UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Map", icon: MapPinned },
    { href: "/feed", label: "Feed", icon: Newspaper },
    { href: "/post", label: "Add", icon: CirclePlus },
    { href: "/profile", label: "Profile", icon: UserRound },
] satisfies Array<{
    href: string;
    label: string;
    icon: LucideIcon;
}>;

function isActivePath(pathname: string, href: string) {
    if (href === "/") {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <nav
                aria-label="Bottom navigation"
                className="pointer-events-auto w-full max-w-md rounded-[1.75rem] border border-border/70 bg-background/95 p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] backdrop-blur"
            >
                <ul className="grid grid-cols-4 gap-1">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const active = isActivePath(pathname, href);

                        return (
                            <li key={href} className="flex">
                                <Button
                                    asChild
                                    variant="ghost"
                                    className={cn(
                                        "h-auto flex-1 rounded-2xl px-3 py-2.5 text-muted-foreground",
                                        active &&
                                        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                                    )}
                                >
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className="flex w-full flex-col items-center gap-1 text-[11px] font-medium"
                                    >
                                        <Icon className="size-5" />
                                        <span>{label}</span>
                                    </Link>
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}