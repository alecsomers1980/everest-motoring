export default function PageBanner({ title, subtitle, bgImageUrl, overlayOpacity = "opacity-40" }) {
    return (
        <section className="bg-black py-16 px-4 text-center lg:px-12 relative overflow-hidden flex items-center justify-center min-h-[240px]">
            {/* Background Image / Gradient */}
            {bgImageUrl ? (
                <div className="absolute inset-0 z-0">
                    <div
                        className={`absolute inset-0 bg-cover bg-center ${overlayOpacity}`}
                        style={{ backgroundImage: `url('${bgImageUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                </div>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-black to-slate-950 z-0">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffff01 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                </div>
            )}

            {/* Single yellow accent: a hairline along the top edge. */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

            <div className="relative z-10 max-w-4xl mx-auto animate-fade-in-up flex flex-col items-center">
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 uppercase tracking-tight leading-none drop-shadow-2xl">
                    {title}
                </h1>
                
                {subtitle && (
                    <p className="text-lg text-slate-300 md:text-xl font-medium max-w-2xl leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
            
        </section>
    );
}

