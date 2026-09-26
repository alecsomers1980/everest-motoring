import PageBanner from "@/components/PageBanner";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us | Everest Motoring",
  description:
    "Get in touch with Everest Motoring in White River, Mpumalanga. Speak to our sales team, visit our showroom, or send us a message online.",
};

/* ─────────── Reusable Sub-components ─────────── */

function SectionHeading({ children }) {
  return (
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
      {children}
    </h2>
  );
}

function InfoRow({ icon, label, value, href }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
    >
      {inner}
    </a>
  ) : (
    <div className="flex items-center gap-3 rounded-xl p-2">{inner}</div>
  );
}

/* ─────────── Main Page ─────────── */

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background-light">
      {/* ── Banner ── */}
      <PageBanner
        title="Contact Us"
        subtitle="We'd love to hear from you — reach out and let's start the conversation."
      />

      {/* ── Content ── */}
      <section className="relative z-10 -mt-8 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top grid: Info cards + Form */}
          <div className="grid gap-8 lg:grid-cols-5">
            {/* ── Left column: Info ── */}
            <div className="lg:col-span-2">
              {/* Dealership details card */}
              <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-900/5 flex flex-col">
                <div className="flex-1">
                  <SectionHeading>Everest Motoring</SectionHeading>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Visit our showroom or get in touch with our dedicated team.
                    We&apos;re here to help you find the perfect vehicle.
                  </p>

                <div className="mt-10 space-y-8">
                  <InfoRow
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                      </svg>
                    }
                    label="Address"
                    value={
                      <>
                        9 Chief Mgiyeni Khumalo Drive, White River<br />
                        Mpumalanga, South Africa, 1240
                      </>
                    }
                  />
                  <InfoRow
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                        />
                      </svg>
                    }
                    label="Phone"
                    value="+27 013 854 0600"
                    href="tel:+270138540600"
                  />
                  <InfoRow
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                        />
                      </svg>
                    }
                    label="Email"
                    value="info@everestmotoring.co.za"
                    href="mailto:info@everestmotoring.co.za"
                  />
                </div>
              </div>

                {/* Social links */}
                <div className="mt-auto border-t border-slate-100 pt-6">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Follow Us
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="https://facebook.com/everestmotoring"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-black hover:text-white"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12Z" />
                      </svg>
                    </a>
                    <a
                      href="https://instagram.com/everestmotoring"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600 hover:text-white"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>


            </div>

            {/* ── Right column: Contact Form ── */}
            <div className="lg:col-span-3">
              <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-900/5">
                <SectionHeading>Send Us a Message</SectionHeading>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Fill out the form below and one of our team members will get
                  back to you as soon as possible.
                </p>

                <ContactForm />
              </div>
            </div>
          </div>

          {/* ── Sales Team block ── */}
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-900/5">
            <SectionHeading>Our Sales Team</SectionHeading>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Reach out directly to one of our experienced consultants for
              personalised service.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Anton */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-black">
                    A
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Anton Thornhill</p>
                    <p className="text-xs text-slate-500">General Manager</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <a
                    href="tel:+27788938881"
                    className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                      />
                    </svg>
                    +27 78 893 8881
                  </a>
                  <a
                    href="mailto:anton@everestmotoring.co.za"
                    className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    anton@everestmotoring.co.za
                  </a>
                </div>
              </div>

              {/* George */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-black">
                    G
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">George Khumalo</p>
                    <p className="text-xs text-slate-500">Sales Executive</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <a
                    href="tel:+27824787676"
                    className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                      />
                    </svg>
                    +27 82 478 7676
                  </a>
                  <a
                    href="mailto:george@everestmotoring.co.za"
                    className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    george@everestmotoring.co.za
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Google Map ── */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
            <div className="p-6 pb-0">
              <SectionHeading>Find Us</SectionHeading>
              <p className="mt-1 text-sm text-slate-500">
                9 Chief Mgiyeni Khumalo Drive, White River, Mpumalanga
              </p>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  title="Everest Motoring Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3051.345940105871!2d31.012587219356693!3d-25.330415356436088!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1ee8310b8edefa2b%3A0xa77f52a401facaf1!2sEverest%20Motoring!5e1!3m2!1sen!2sza!4v1776788965146!5m2!1sen!2sza"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
