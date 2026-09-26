import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import Icon from "@/components/Icon";

export default function Footer({ siteConfig }) {
    const name = siteConfig?.name || "Dealership";
    const desc = siteConfig?.description || "Premium Vehicles";

    return (
        <footer 
            className="border-t border-white/10 mt-auto"
            style={{ background: '#000000', backgroundColor: '#000000' }}
        >
            <div className="mx-auto max-w-7xl px-4 py-16 lg:px-12">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">

                    {/* Brand Info */}
                    <div className="lg:col-span-1">
                        <h3 className="text-xl font-display font-medium text-white mb-6 uppercase tracking-wider">{name}</h3>
                        <p className="max-w-xs text-slate-400 text-sm leading-relaxed mb-6">
                            {desc}
                        </p>
                    </div>

                    {/* Contact Us */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Contact Us</h3>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li className="flex items-start gap-3">
                                <Icon name="location_on" className="text-[20px] text-primary" />
                                <span>{siteConfig?.address || "Address"}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Icon name="phone" className="text-[20px] text-primary" />
                                <Link href={`tel:${siteConfig?.phone || ""}`} className="hover:text-primary transition-colors">{siteConfig?.phone || "Phone"}</Link>
                            </li>
                            <li className="flex items-center gap-3">
                                <Icon name="mail" className="text-[20px] text-primary" />
                                <Link href={`mailto:${siteConfig?.email || ""}`} className="hover:text-primary transition-colors">{siteConfig?.email || "Email"}</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company links */}
                    <div>
                        <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-white">Company</h4>
                        <ul className="space-y-3">
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/about">About Us</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/about">Our Team</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/news">Latest News</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/finance-calculator">Finance Calculator</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/portal">Client Portal</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/affiliate">Affiliate Program</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/privacy">Privacy Policy</Link></li>
                            <li><Link className="text-sm text-slate-400 hover:text-primary transition-colors" href="/terms">Terms &amp; Conditions</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-white">Newsletter</h4>
                        <p className="mb-4 text-sm text-slate-400">Subscribe for the latest premium arrivals and exclusive deals.</p>
                        <NewsletterForm />
                    </div>

                </div>

                <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row text-xs">
                    <p className="text-slate-500">
                        &copy; {new Date().getFullYear()} {name}. All rights reserved.
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-slate-600">
                        <span>{siteConfig?.companyName || "Everest Motoring (Pty) Ltd"}</span>
                        <span className="hidden sm:inline">|</span>
                        <span>Reg No: {siteConfig?.registrationNumber || "[Reg No]"}</span>
                        <span className="hidden sm:inline">|</span>
                        <span>VAT: {siteConfig?.vatNumber || "[VAT No]"}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
