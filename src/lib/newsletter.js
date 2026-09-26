import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { NewsletterEmail } from "@/emails/Newsletter";

function money(v) {
  return "R " + Number(v || 0).toLocaleString("en-ZA");
}

export async function sendNewsletterToSubscribers() {
  const admin = await createAdminClient();

  const { data: subs } = await admin
    .from("newsletter_subscribers")
    .select("email");
  const emails = (subs || []).map((s) => s.email).filter(Boolean);
  if (!emails.length) return { sent: 0, total: 0 };

  const { data: cars } = await admin
    .from("cars")
    .select("id, make, model, year, price, main_image_url, is_featured, created_at")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(6);
  const list = cars || [];
  const featured = list.find((c) => c.is_featured) || list[0] || null;
  const arrivals = list
    .filter((c) => !featured || c.id !== featured.id)
    .slice(0, 3);

  const props = {};
  if (featured) {
    props.featuredVehicle = {
      make: featured.make,
      model: featured.model,
      year: String(featured.year || ""),
      price: money(featured.price),
      image: featured.main_image_url,
    };
  }
  if (arrivals.length) {
    props.newArrivals = arrivals.map((c) => ({
      id: c.id,
      name: `${c.make} ${c.model}`,
      price: money(c.price),
      image: c.main_image_url,
    }));
  }

  let sent = 0;
  for (const email of emails) {
    const r = await sendEmail({
      to: email,
      subject: "Everest Motoring — Our Latest Arrivals",
      react: React.createElement(NewsletterEmail, props),
    });
    if (r && r.success) sent++;
  }

  return { sent, total: emails.length };
}
