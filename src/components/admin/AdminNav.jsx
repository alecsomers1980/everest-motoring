"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";

// Ten flat nav items in one row were unscannable, and the row was `hidden lg:flex`
// with no fallback — below 1024px the admin had no navigation at all.
export const NAV_GROUPS = [
    {
        label: "Stock",
        items: [
            { href: "/admin/inventory", label: "Inventory" },
            { href: "/admin/sales", label: "Sales" },
        ],
    },
    {
        label: "Customers",
        items: [
            { href: "/admin/leads", label: "Car Inquiries" },
            { href: "/admin/trade-ins", label: "Trade-In Requests" },
        ],
    },
    {
        label: "Marketing",
        items: [
            { href: "/admin/news", label: "News" },
            { href: "/admin/subscribers", label: "Subscribers" },
            { href: "/admin/email-templates", label: "Email Templates" },
        ],
    },
    {
        label: "Reports",
        items: [
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/reports", label: "Reports" },
            { href: "/admin/affiliates", label: "Affiliate Network" },
        ],
    },
];

function useIsActive() {
    const pathname = usePathname();
    // /admin must match exactly, or it would light up on every admin route.
    return (href) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

export function AdminNavDesktop() {
    const isActive = useIsActive();

    return (
        <nav className="hidden lg:flex items-center gap-8">
            {NAV_GROUPS.map((group) => (
                <div key={group.label} className="flex items-center gap-4">
                    {group.items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-sm transition-colors",
                                isActive(item.href)
                                    ? "text-white font-medium"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            ))}
        </nav>
    );
}

export function AdminNavMobile() {
    const [open, setOpen] = useState(false);
    const isActive = useIsActive();

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button
                    className="lg:hidden text-white p-2 -mr-2"
                    aria-label="Open admin navigation"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto bg-black p-6 shadow-xl focus:outline-none">
                    <div className="mb-8 flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-white">
                            Menu
                        </Dialog.Title>
                        <Dialog.Close
                            className="text-slate-400 hover:text-white p-2 -mr-2"
                            aria-label="Close navigation"
                        >
                            <X className="h-5 w-5" />
                        </Dialog.Close>
                    </div>

                    <div className="space-y-8">
                        {NAV_GROUPS.map((group) => (
                            <div key={group.label}>
                                <p className="text-label font-semibold uppercase text-slate-500 mb-3">
                                    {group.label}
                                </p>
                                <div className="flex flex-col gap-1">
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "rounded-lg px-3 py-2.5 text-base transition-colors",
                                                isActive(item.href)
                                                    ? "bg-white/10 text-white font-medium"
                                                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-8 space-y-1 border-t border-hairline-dark">
                        <Link
                            href="/admin/profile"
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-3 py-2.5 text-base text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                            My Profile
                        </Link>
                        <Link
                            href="/"
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-3 py-2.5 text-base text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                            View Site
                        </Link>
                        <form action="/auth/logout" method="POST">
                            <button
                                type="submit"
                                className="w-full rounded-lg px-3 py-2.5 text-left text-base text-slate-300 hover:bg-white/5 hover:text-white"
                            >
                                Sign Out
                            </button>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
