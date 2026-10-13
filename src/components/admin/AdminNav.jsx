"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
    Menu, X, Car, BadgeDollarSign, FileText, MessageSquare, Repeat, Newspaper,
    Users, Mail, LayoutDashboard, BarChart3, Network, UserCircle, Globe, LogOut,
} from "lucide-react";
import { cn } from "@/utils/cn";

// Ten flat nav items in one row were unscannable, and the row was `hidden lg:flex`
// with no fallback — below 1024px the admin had no navigation at all.
export const NAV_GROUPS = [
    {
        label: "Stock",
        items: [
            { href: "/admin/inventory", label: "Inventory", icon: Car },
            { href: "/admin/sales", label: "Sales", icon: BadgeDollarSign },
            { href: "/admin/paperwork", label: "Paperwork", icon: FileText },
        ],
    },
    {
        label: "Customers",
        items: [
            { href: "/admin/leads", label: "Car Inquiries", icon: MessageSquare },
            { href: "/admin/trade-ins", label: "Trade-In Requests", icon: Repeat },
        ],
    },
    {
        label: "Marketing",
        items: [
            { href: "/admin/news", label: "News", icon: Newspaper },
            { href: "/admin/subscribers", label: "Subscribers", icon: Users },
            { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
        ],
    },
    {
        label: "Reports",
        items: [
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/reports", label: "Reports", icon: BarChart3 },
            { href: "/admin/affiliates", label: "Affiliate Network", icon: Network },
        ],
    },
];

function useIsActive() {
    const pathname = usePathname();
    // /admin must match exactly, or it would light up on every admin route.
    return (href) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

const sidebarItem =
    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

function SidebarLink({ href, label, icon: Icon, active }) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                sidebarItem,
                active
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
            )}
        >
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                )}
                aria-hidden="true"
            />
            {label}
        </Link>
    );
}

// The top bar outgrew one row; on desktop the nav lives in a fixed left rail.
// The layout offsets its content by the same width (lg:pl-60).
export function AdminSidebar() {
    const isActive = useIsActive();

    return (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col bg-black border-r border-hairline-dark">
            <div className="h-16 shrink-0 flex items-center px-6 border-b border-hairline-dark">
                <Link href="/admin" className="text-lg font-semibold tracking-display text-white">
                    Everest<span className="text-primary">.</span>
                    <span className="ml-2 text-white/50 font-normal">Admin</span>
                </Link>
            </div>

            <nav
                aria-label="Admin"
                className="flex-1 overflow-y-auto px-3 py-6 space-y-7 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]"
            >
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 mb-2 text-label font-semibold uppercase text-white/50">
                            {group.label}
                        </p>
                        <ul className="space-y-0.5">
                            {group.items.map((item) => (
                                <li key={item.href}>
                                    <SidebarLink {...item} active={isActive(item.href)} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="shrink-0 px-3 py-4 space-y-0.5 border-t border-hairline-dark">
                <SidebarLink href="/admin/profile" label="Profile" icon={UserCircle} active={isActive("/admin/profile")} />
                <SidebarLink href="/" label="View site" icon={Globe} active={false} />
                <form action="/auth/logout" method="POST">
                    <button type="submit" className={cn(sidebarItem, "text-slate-400 hover:bg-white/[0.04] hover:text-white")}>
                        <LogOut className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-slate-300" aria-hidden="true" />
                        Sign out
                    </button>
                </form>
            </div>
        </aside>
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
