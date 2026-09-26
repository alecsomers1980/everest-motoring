import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@/utils/supabase/server";
import Icon from "@/components/Icon";

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

const CATEGORY_LABEL = {
    "buying-guide": "Buying Guide",
    local: "White River",
    "model-review": "Model Review",
};

const CATEGORY_ICON = {
    "buying-guide": "menu_book",
    local: "location_on",
    "model-review": "directions_car",
};

function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function estimateReadTime(bodyMd) {
    if (!bodyMd) return null;
    const words = bodyMd.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 220));
}

async function getPost(slug) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
    return data;
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: "Article not found | Everest Motoring" };

    const title = post.meta_title || `${post.title} | Everest Motoring`;
    const description = post.meta_description || post.excerpt || "";
    const url = `${SITE_URL}/news/${post.slug}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: "article",
            images: post.hero_image_url
                ? [{ url: post.hero_image_url }]
                : undefined,
            publishedTime: post.published_at,
            modifiedTime: post.updated_at,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: post.hero_image_url ? [post.hero_image_url] : undefined,
        },
    };
}

export default async function NewsPostPage({ params }) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    const supabase = await createClient();
    const { data: related } = await supabase
        .from("news_posts")
        .select("id, slug, title, hero_image_url, category, published_at, body_md, reading_minutes, excerpt")
        .eq("status", "published")
        .neq("id", post.id)
        .order("published_at", { ascending: false })
        .limit(3);

    let featuredCar = null;
    if (post.featured_car_id) {
        const { data } = await supabase
            .from("cars")
            .select(
                "id, make, model, year, price, main_image_url, status, mileage"
            )
            .eq("id", post.featured_car_id)
            .maybeSingle();
        featuredCar = data;
    }

    const bodyHtml = marked.parse(post.body_md || "", {
        gfm: true,
        breaks: false,
    });
    const url = `${SITE_URL}/news/${post.slug}`;
    const readTime =
        post.reading_minutes || estimateReadTime(post.body_md);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.meta_description || post.excerpt || "",
        image: post.hero_image_url ? [post.hero_image_url] : undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { "@type": "Organization", name: "Everest Motoring" },
        publisher: {
            "@type": "Organization",
            name: "Everest Motoring",
            logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/logo.png`,
            },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "News",
                item: `${SITE_URL}/news`,
            },
            {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: url,
            },
        ],
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbLd),
                }}
            />

            {/* ── Hero Banner ── */}
            <div className="relative bg-black text-white overflow-hidden">
                {post.hero_image_url ? (
                    <>
                        <Image
                            src={post.hero_image_url}
                            alt={post.title}
                            fill
                            priority
                            sizes="100vw"
                            className="object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900">
                        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[100px]" />
                        <div className="absolute -bottom-1/3 -left-1/4 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[80px]" />
                    </div>
                )}

                <div className="relative z-10 max-w-[900px] mx-auto px-4 lg:px-0 pt-28 pb-24">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-8">
                        <Link
                            href="/"
                            className="hover:text-white transition-colors"
                        >
                            Home
                        </Link>
                        <Icon name="chevron_right" className="text-xs text-slate-600" />
                        <Link
                            href="/news"
                            className="hover:text-white transition-colors"
                        >
                            News
                        </Link>
                        <Icon name="chevron_right" className="text-xs text-slate-600" />
                        <span className="text-slate-500 truncate max-w-[200px]">
                            {post.title}
                        </span>
                    </nav>

                    {/* Category Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-primary/30 mb-6">
                        <Icon name={CATEGORY_ICON[post.category] || "article"} className="text-sm" />
                        {CATEGORY_LABEL[post.category] || "News"}
                    </span>

                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.08] mb-6">
                        {post.title}
                    </h1>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                        <span className="flex items-center gap-1.5">
                            <Icon name="calendar_today" className="text-base text-primary-ink" />
                            {formatDate(post.published_at)}
                        </span>
                        {readTime && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="flex items-center gap-1.5">
                                    <Icon name="schedule" className="text-base text-primary-ink" />
                                    {readTime} min read
                                </span>
                            </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="flex items-center gap-1.5">
                            <Icon name="business" className="text-base text-primary-ink" />
                            Everest Motoring
                        </span>
                    </div>
                </div>

                {/* Bottom curve */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-50 rounded-t-[40px]" />
            </div>

            {/* ── Article Body ── */}
            <article className="relative z-10 max-w-[760px] mx-auto px-4 lg:px-0 -mt-6">
                {/* Excerpt / lead paragraph */}
                {post.excerpt && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-10">
                        <p className="text-lg md:text-xl text-slate-600 leading-relaxed italic">
                            &ldquo;{post.excerpt}&rdquo;
                        </p>
                    </div>
                )}

                {/* Article content */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-10 md:px-12 md:py-14">
                    <div
                        className="prose prose-slate max-w-none
                            prose-headings:font-display prose-headings:text-slate-900
                            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-[16px]
                            prose-a:text-primary-ink prose-a:no-underline hover:prose-a:underline
                            prose-strong:text-slate-900
                            prose-ul:text-slate-700 prose-ol:text-slate-700
                            prose-li:my-1
                            prose-blockquote:border-l-primary prose-blockquote:text-slate-600 prose-blockquote:bg-slate-50 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:pr-4
                            prose-img:rounded-xl prose-img:shadow-md"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                </div>

                {/* Featured vehicle card */}
                {featuredCar && (
                    <div className="mt-10 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-hidden">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                            <Icon name="directions_car" className="text-primary-ink text-base" />
                            Featured Vehicle
                        </div>
                        <Link
                            href={`/inventory/${featuredCar.id}`}
                            className="flex flex-col md:flex-row gap-6 group"
                        >
                            {featuredCar.main_image_url && (
                                <div className="relative w-full md:w-64 aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                    <Image
                                        src={featuredCar.main_image_url}
                                        alt={`${featuredCar.year} ${featuredCar.make} ${featuredCar.model}`}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 256px"
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            )}
                            <div className="flex-1 flex flex-col justify-center">
                                <h3 className="text-xl font-bold text-slate-900 transition-colors">
                                    {featuredCar.year}{" "}
                                    {featuredCar.make}{" "}
                                    {featuredCar.model}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {featuredCar.mileage
                                        ? `${new Intl.NumberFormat(
                                              "en-ZA"
                                          ).format(
                                              featuredCar.mileage
                                          )} km`
                                        : ""}
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-4">
                                    R{" "}
                                    {new Intl.NumberFormat(
                                        "en-ZA"
                                    ).format(featuredCar.price)}
                                </p>
                                <span className="mt-4 inline-flex items-center gap-2 text-primary-ink font-bold text-sm uppercase tracking-wider group-hover:gap-3 transition-all">
                                    View Vehicle{" "}
                                    <Icon name="arrow_forward" className="text-sm" />
                                </span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Inventory CTA */}
                <div className="mt-10 relative overflow-hidden rounded-2xl bg-black text-white p-10 md:p-14 text-center">
                    {/* Background accents */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/20 blur-[60px]" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-secondary/15 blur-[50px]" />
                    <div className="relative z-10">
                        <Icon name="directions_car" className="text-4xl text-primary mb-4 block" />
                        <h3 className="text-2xl md:text-3xl font-display font-bold mb-3">
                            Looking for your next vehicle?
                        </h3>
                        <p className="text-slate-300 mb-8 max-w-md mx-auto">
                            Browse our hand-picked pre-owned fleet at Everest
                            Motoring, White River. Every vehicle is quality
                            inspected and ready to drive.
                        </p>
                        <Link
                            href="/inventory"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/30"
                        >
                            Browse Inventory{" "}
                            <Icon name="arrow_forward" />
                        </Link>
                    </div>
                </div>
            </article>

            {/* ── Related Articles ── */}
            {related && related.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 lg:px-12 py-20">
                    <div className="mb-10 flex items-end justify-between">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-900">
                                Related Articles
                            </h2>
                            <p className="mt-2 text-slate-500">
                                Continue reading from our latest guides and reviews.
                            </p>
                        </div>
                        <Link
                            href="/news"
                            className="hidden md:inline-flex items-center gap-1 text-sm font-bold text-primary-ink hover:underline"
                        >
                            View all articles{" "}
                            <Icon name="arrow_forward" className="text-sm" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {related.map((p) => (
                            <Link
                                key={p.id}
                                href={`/news/${p.slug}`}
                                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 hover:-translate-y-1"
                            >
                                <div className="relative aspect-[16/10] bg-black overflow-hidden">
                                    {p.hero_image_url ? (
                                        <Image
                                            src={p.hero_image_url}
                                            alt={p.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900">
                                            <Icon name="newspaper" className="text-4xl text-slate-700" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    <div className="absolute top-4 left-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/90 backdrop-blur-sm text-black font-bold text-xs uppercase tracking-wider rounded-md shadow-lg">
                                            <Icon name={CATEGORY_ICON[p.category] || "article"} className="text-xs" />
                                            {CATEGORY_LABEL[p.category] ||
                                                "News"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                        <Icon name="calendar_today" className="text-sm" />
                                        {formatDate(p.published_at)}
                                        {(p.reading_minutes || estimateReadTime(p.body_md)) && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span>{p.reading_minutes || estimateReadTime(p.body_md)} min</span>
                                            </>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 transition-colors leading-snug mb-3">
                                        {p.title}
                                    </h3>
                                    {p.excerpt && (
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
                                            {p.excerpt}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-sm font-bold text-primary-ink uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Read more{" "}
                                            <Icon name="arrow_forward" className="text-sm" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-8 text-center md:hidden">
                        <Link
                            href="/news"
                            className="inline-flex items-center gap-2 text-sm font-bold text-primary-ink"
                        >
                            View all articles{" "}
                            <Icon name="arrow_forward" className="text-sm" />
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
