export const metadata = {
    title: "The Everest Way | About Everest Motoring",
    description: "Learn about the Everest Way. Our 100-point checks, selective vehicle sourcing, and commitment to integrity in the South African used car market.",
};

import PageBanner from "@/components/PageBanner";
import Icon from "@/components/Icon";

const teamMembers = [
    { name: "Anton Thornhill", role: "General Manager", image: "/images/team/Anton.jpg" },
    { name: "George Khumalo", role: "Sales Executive", image: "/images/team/George.jpg" },
    { name: "Moffat Maseko", role: "Driver", image: "/images/team/Moffat.jpg" },
];

export default function AboutPage() {
    return (
        <div className="bg-background-alt min-h-screen">
            {/* Hero Section */}
            <PageBanner
                title="The Everest Way"
                subtitle="Redefining the pre-owned vehicle experience in Mpumalanga and across South Africa through uncompromising quality and integrity."
            />

            {/* Content Section */}
            <section className="py-20 px-4 lg:px-12">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6 border-b-4 border-primary inline-block">Uncompromising Standards</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                        At Everest Motoring, we do not simply buy stock to fill a showroom floor. We operate on a model of <strong>Selective Sourcing</strong>. Every vehicle undergoes a rigorous, independent 100-point technical inspection before it even arrives on our floor.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                        <div className="border-l-4 border-secondary pl-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Accident-Free Guarantee</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">We strictly enforce a zero-tolerance policy for structurally damaged or rebuilt vehicles. You are buying absolute peace of mind.</p>
                        </div>
                        <div className="border-l-4 border-primary pl-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Mileage</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Full franchise service histories are explicitly verified to ensure the mileage on the clock is completely accurate.</p>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-slate-900 mb-6 text-secondary mt-12">Why Choose Us?</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                        Purchasing a vehicle is a massive financial commitment. Our goal is to make the process completely seamless, completely transparent, and ultimately an exciting experience. From offering in-house finance through all major South African banks to delivering vehicles nationwide, we handle the complex logistics so you don't have to.
                    </p>
                </div>
            </section>

            {/* Meet the Director */}
            <section className="py-20 px-4 lg:px-12 bg-slate-50 border-t border-slate-100">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-5 gap-12 items-start">
                        {/* Photo */}
                        <div className="md:col-span-2 flex flex-col items-center">
                            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 flex items-center justify-center">
                                <Icon name="person" className="text-slate-300 text-[140px]" />
                            </div>
                            <div className="mt-6 text-center">
                                <h3 className="text-2xl font-bold text-slate-900">Christo Pieterse</h3>
                                <p className="text-primary-ink font-semibold tracking-wide uppercase text-sm mt-1">Director & Founder</p>
                            </div>
                        </div>

                        {/* Bio / Text */}
                        <div className="md:col-span-3 space-y-6 lg:pl-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1 h-10 bg-primary rounded-full" />
                                <h2 className="text-3xl font-bold text-slate-900">Meet the Director</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p>
                                    Christo Pieterse established Everest Motoring in 2020 after an illustrious 35-year career specializing in the new car industry. Driven by an uncompromising vision to elevate the standard of the local used car market in Mpumalanga, Christo set out to introduce exceptional, specialized service to White River and beyond.
                                </p>
                                <p>
                                    Following the sale of previous business interests to a national motor group, Christo was inspired to fill a critical gap in the market: a demand for absolute quality, transparent vehicle histories, and rigorous aftercare. His deep-rooted product knowledge, proactive risk management, and dedication to aftersales responsibility have made him a trusted pillar in the local automotive community.
                                </p>
                                <p>
                                    Despite navigating the unprecedented challenges of launching during a global pandemic, Christo&apos;s innovative approach to national expansion and steadfast commitment to selective sourcing quickly gained traction, achieving a remarkable milestone of over fifty percent repeat business from satisfied, loyal clients.
                                </p>
                            </div>
                            <div className="bg-white rounded-2xl p-8 mt-8 shadow-sm border border-slate-100 relative">
                                <div className="absolute -top-4 -left-2 text-6xl text-primary-ink/20 font-serif leading-none">"</div>
                                <p className="text-slate-800 font-medium italic text-lg leading-relaxed relative z-10 pl-4 border-l-4 border-primary">
                                    Quality isn&apos;t just a promise; it&apos;s a guaranteed standard. We are changing the way South Africans buy pre-owned vehicles through absolute transparency and an uncompromising commitment to our clients.
                                </p>
                                <p className="text-slate-500 text-sm mt-4 pl-4 font-semibold uppercase tracking-wider">— Christo Pieterse</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Meet the Team Section */}
            <section className="py-20 px-4 lg:px-12 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-black bg-primary px-3 py-1 text-xs font-bold tracking-[0.3em] uppercase rounded">Our People</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">Meet the Team</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
                            Everest Motoring is run by experienced individuals who are well known and trusted by the local community for their product knowledge, risk management, and aftersales responsibility.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {teamMembers.map((member) => (
                            <div key={member.name} className="group cursor-pointer">
                                <div className="relative h-[400px] w-full overflow-hidden rounded-2xl mb-6 bg-slate-100 flex items-center justify-center">
                                    <Icon name="person" className="text-slate-300 text-[120px]" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
                                    <p className="text-black font-bold mt-1 bg-primary/20 inline-block px-2 rounded">{member.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
