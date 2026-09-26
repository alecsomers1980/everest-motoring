"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function Header({ siteConfig }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-black px-6 py-4 backdrop-blur-md transition-all lg:px-12 shadow-sm">
            <div className="flex items-center gap-2">
                {/* Dealership Logo */}
                <Link href="/" className="h-16 w-auto lg:h-20 overflow-hidden flex items-center justify-center">
                    <img
                        src={siteConfig?.logo || "/images/logo.png"}
                        alt={`${siteConfig?.name || 'Dealership'} Logo`}
                        className="h-full w-auto object-contain mix-blend-screen"
                    />
                </Link>
            </div>
            <nav className="hidden items-center gap-8 md:flex">
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/">Home</Link>
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/inventory">Buy a Car</Link>
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/value-my-car">Value My Car</Link>
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/news">Latest News</Link>
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/about">About</Link>
                <Link className="text-sm font-medium text-slate-300 transition-colors hover:text-white" href="/contact">Contact</Link>
            </nav>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-4">
                    <Link className="text-xs font-bold text-slate-400 uppercase tracking-wider transition-colors hover:text-primary" href="/admin">Admin</Link>
                    <Link className="text-xs font-bold text-slate-400 uppercase tracking-wider transition-colors hover:text-primary" href="/register">Affiliate</Link>
                </div>
                <button
                    className="block md:hidden text-white"
                    onClick={toggleMobileMenu}
                    aria-label="Toggle mobile menu"
                >
                    <Icon name={isMobileMenuOpen ? "close" : "menu"} className="text-3xl" />
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute left-0 top-full w-full border-b border-white/10 bg-black px-6 py-4 shadow-xl md:hidden flex flex-col gap-4">
                    <nav className="flex flex-col gap-4">
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/"
                            onClick={closeMobileMenu}
                        >
                            Home
                        </Link>
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/inventory"
                            onClick={closeMobileMenu}
                        >
                            Buy a Car
                        </Link>
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/value-my-car"
                            onClick={closeMobileMenu}
                        >
                            Value My Car
                        </Link>
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/news"
                            onClick={closeMobileMenu}
                        >
                            Latest News
                        </Link>
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/about"
                            onClick={closeMobileMenu}
                        >
                            About
                        </Link>
                        <Link
                            className="text-base font-medium text-slate-300 transition-colors hover:text-white border-b border-white/10 pb-2"
                            href="/contact"
                            onClick={closeMobileMenu}
                        >
                            Contact
                        </Link>

                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                            <Link className="text-xs font-bold text-slate-400 uppercase tracking-wider transition-colors hover:text-primary bg-white/5 py-2 rounded-md" href="/admin" onClick={closeMobileMenu}>Admin</Link>
                            <Link className="text-xs font-bold text-slate-400 uppercase tracking-wider transition-colors hover:text-primary bg-white/5 py-2 rounded-md" href="/register" onClick={closeMobileMenu}>Affiliate</Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
