import Image from "next/image";
import Link from "next/link";
import HomeSearchWidget from "@/components/HomeSearchWidget";
import NewsletterForm from "@/components/NewsletterForm";
import TrackedLink from "@/components/TrackedLink";
import { createClient } from "@/utils/supabase/server";
import { getVehiclePath } from "@/utils/url/vehicleUrl";
import { calculateMonthly, formatRand } from "@/utils/finance/calculator";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/Icon";

export default async function Home() {
  const supabase = await createClient();
  const { data: cars } = await supabase
    .from("cars")
    .select("make")
    .eq("status", "available");

  const uniqueMakes = cars
    ? Array.from(new Set(cars.map(c => c.make).filter(Boolean))).sort()
    : undefined;

  const { data: featuredCars } = await supabase
    .from("cars")
    .select("*")
    .eq("status", "available")
    .order("is_featured", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>

      {/* Hero Section */}
      <section className="relative flex min-h-[600px] w-full items-center justify-center bg-black px-4 py-20 lg:min-h-[700px]">
        <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
          <Image
            alt="Premium pre-owned vehicles"
            src="/images/banner.png"
            fill
            priority
            className="object-cover object-center opacity-80"
            sizes="100vw"
          />
          {/* Single scrim: dark enough on the left for headline contrast, clear on the right. */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black via-black/70 to-black/20"></div>
        </div>
        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-4 lg:px-8">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="mb-4 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
              Premium Pre-Owned Specialists
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-white lg:text-6xl">
              We sell cars with <br />
              <span className="text-primary font-black">Integrity & Expertise.</span>
            </h1>
            <p className="mt-6 text-lg font-normal leading-relaxed text-slate-300 lg:text-xl">
              At Everest Motoring, we proudly do things the Everest way. We are highly selective, buying only the absolute best quality pre-loved cars to make your dream vehicle a reality.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/inventory" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-bold text-black shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5 hover:bg-primary-dark">
                View Latest Deals
                <Icon name="arrow_forward" className="text-sm" />
              </Link>
              <Link href="/value-my-car" className="flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3.5 text-base font-bold text-black shadow-md transition-transform hover:-translate-y-0.5 hover:bg-slate-100">
                Value my car
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Search Widget */}
      <div className="relative z-30 -mt-16 w-full px-4 lg:px-12">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
          <HomeSearchWidget makes={uniqueMakes && uniqueMakes.length > 0 ? uniqueMakes : undefined} />
        </div>
      </div>

      {/* Featured Vehicles */}
      <section className="bg-white py-24 px-4 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-end justify-between">
            <Reveal>
              <h2 className="text-display-sm font-semibold text-slate-900">Featured Vehicles</h2>
              <p className="mt-2 text-slate-500">Hand-picked premium cars just for you.</p>
            </Reveal>
            <a className="hidden items-center gap-1 font-bold text-black hover:underline md:flex" href="/inventory">
              View Inventory <Icon name="arrow_forward" className="text-sm" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

            {featuredCars && featuredCars.map((car, idx) => (
              <TrackedLink
                key={car.id}
                href={getVehiclePath(car)}
                event="select_item"
                params={{
                  item_list_id: "featured_vehicles",
                  item_list_name: "Featured Vehicles",
                  items: [{
                    item_id: car.id,
                    item_name: `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim(),
                    item_brand: car.make || undefined,
                    item_category: car.fuel_type || undefined,
                    price: Number(car.price) || 0,
                    index: idx,
                    quantity: 1,
                  }],
                }}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <div className="absolute right-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-bold uppercase text-slate-900 backdrop-blur-sm">
                    {car.is_featured ? 'Featured' : 'Used'}
                  </div>
                  {car.status !== 'available' && (
                    <div className="absolute top-3 left-3 z-10 rounded-md bg-red-500 px-2 py-1 text-xs font-bold uppercase text-white shadow-lg">
                      {car.status.toUpperCase()}
                    </div>
                  )}
                  {car.main_image_url ? (
                    <Image
                      src={car.main_image_url}
                      alt={`${car.make} ${car.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <Icon name="directions_car" className="text-4xl" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{car.year} {car.make} • {car.transmission}</div>
                  <h3 className="mb-2 text-lg font-bold leading-snug text-slate-900">{car.model}</h3>
                  <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <span className="block text-xs font-medium text-slate-500">{new Intl.NumberFormat('en-ZA').format(car.mileage)} km</span>
                      <span className="block text-xs font-medium text-slate-500">{car.fuel_type || 'Fuel'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-black border-b-2 border-primary">R {new Intl.NumberFormat('en-ZA').format(car.price)}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">
                        from {formatRand(calculateMonthly({ price: Number(car.price) || 0 }).monthly)} p/m
                      </div>
                    </div>
                  </div>
                </div>
              </TrackedLink>
            ))}

          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/inventory" className="flex w-full items-center justify-center rounded-lg border border-slate-200 px-6 py-3 font-bold text-slate-900">
              View All Inventory
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-background-alt py-24 px-4 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 text-center">
            <h2 className="text-display-sm md:text-display-md font-semibold text-slate-900">The Everest Advantage</h2>
            <p className="mt-4 text-lg text-slate-500">We&apos;re fundamentally changing the way people view and buy used cars across South Africa.</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md border-t-4 border-primary">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-black">
                <Icon name="verified" className="text-4xl" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Selective Sourcing</h3>
              <p className="text-slate-500 leading-relaxed text-sm">We don&apos;t just buy any vehicle. We are incredibly selective, purchasing only the highest quality, accident-free pre-loved cars for our clients.</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md border-t-4 border-secondary">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-black">
                <Icon name="account_balance" className="text-4xl" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Seamless Bank Finance</h3>
              <p className="text-slate-500 leading-relaxed text-sm">We are approved by and offer direct vehicle finance through all top South African banks. Comprehensive insurance options are also managed in-house.</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md border-t-4 border-primary">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-black">
                <Icon name="workspace_premium" className="text-4xl" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">Integrity First</h3>
              <p className="text-slate-500 leading-relaxed text-sm">Doing things the &apos;Everest Way&apos; means complete transparency. From your first digital inquiry to handing over the keys, we prioritize honesty and expertise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value My Car Lead Magnet */}
      <section className="bg-slate-50 py-24 px-4 lg:px-12">
        <Reveal className="mx-auto max-w-5xl rounded-2xl bg-white p-8 md:p-14 border border-hairline text-center">
          <h2 className="mb-4 text-display-sm md:text-display-md font-semibold text-slate-900">Trade in or sell your car today</h2>
          <p className="mb-8 text-lg text-slate-600">Get an instant, obligation-free valuation for your vehicle. We pay top market rates.</p>
          <div className="mx-auto flex justify-center mt-6">
            <Link href="/value-my-car" className="rounded-lg bg-primary px-12 py-5 text-lg font-bold text-black transition-all hover:bg-primary-dark hover:-translate-y-1 shadow-lg shadow-primary/30 flex items-center gap-3">
              Get Valuation
              <Icon name="arrow_forward" className="text-xl" />
            </Link>
          </div>
          <p className="mt-8 text-label font-semibold uppercase text-slate-400">Safe · Secure · Instant cash</p>
        </Reveal>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-primary px-4 py-16 text-black">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold uppercase tracking-tight">Don&apos;t miss the perfect deal.</h2>
          <p className="mb-8 text-black/70">Subscribe to our weekly alerts and be the first to know about new arrivals.</p>
          <NewsletterForm variant="home" />
        </div>
      </section>

    </>
  );
}
