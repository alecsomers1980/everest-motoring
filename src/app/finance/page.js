export const metadata = {
    title: "Vehicle Finance Guide South Africa | Everest Motoring",
    description: "Learn how to easily finance your next pre-owned vehicle through major South African banks like WesBank, Absa, Standard Bank, and Nedbank.",
};

import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import Icon from "@/components/Icon";

export default function FinancePage() {
    return (
        <div className="bg-background-light min-h-screen">
            <PageBanner
                title="Seamless Vehicle Finance"
                subtitle="We partner with all major South African banks to secure you the most competitive interest rates possible. Approvals within 24 hours."
            />

            <section className="py-20 px-4 lg:px-12">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Approved by the Best</h2>
                            <p className="text-slate-600 mb-6 leading-relaxed text-lg">
                                Everest Motoring is an approved dealership with WesBank, Absa Vehicle Finance, Standard Bank, MFC (Nedbank), and more. Because we are a highly trusted dealer, we have direct lines to the banks to negotiate on your behalf.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <Icon name="check_circle" className="text-green-500" />
                                    <span className="text-slate-700 font-medium">No hidden admin fees</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Icon name="check_circle" className="text-green-500" />
                                    <span className="text-slate-700 font-medium">Fast pre-approvals without affecting your credit score</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Icon name="check_circle" className="text-green-500" />
                                    <span className="text-slate-700 font-medium">Trade-ins accepted to lower your deposit</span>
                                </li>
                            </ul>
                            <div className="flex flex-wrap gap-4">
                                <Link href="/contact" className="inline-block bg-secondary hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all">
                                    Apply for Pre-Approval
                                </Link>
                                <Link href="/finance-calculator" className="inline-block bg-primary hover:bg-primary/90 text-black font-bold py-3 px-8 rounded-lg shadow-md transition-all">
                                    Estimate My Repayment
                                </Link>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">Required Documents</h3>
                            <ul className="space-y-4 text-slate-600 text-sm">
                                <li className="flex items-start gap-3">
                                    <span className="bg-primary text-black w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0">1</span>
                                    <span>Clear copy of your South African ID Document (or Passport with Traffic Register)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-primary text-black w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0">2</span>
                                    <span>Copy of a valid South African Driver's License</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-primary text-black w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0">3</span>
                                    <span>3 Months latest stamped bank statements</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-primary text-black w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0">4</span>
                                    <span>Latest payslip (or 3 months if commission earner)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-primary text-black w-6 h-6 rounded flex items-center justify-center font-bold flex-shrink-0">5</span>
                                    <span>Proof of Residence (not older than 3 months)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
