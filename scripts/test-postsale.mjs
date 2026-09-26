import React from "react";
import fs from "node:fs";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { PostSaleReviewEmail } from "../src/emails/PostSaleReview.jsx";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const TEST_TO = "alec@firewireit.co.za";
const reviewUrl =
  env.GOOGLE_REVIEW_URL || "https://www.google.com/search?q=Everest+Motoring+White+River";

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(env.RESEND_API_KEY);

const { data: sales } = await supa
  .from("sales")
  .select("buyer_name, car_id, delivery_photo_url, sale_video_url, sale_video_status");

for (const s of sales) {
  const { data: car } = await supa
    .from("cars")
    .select("make, model, year, main_image_url")
    .eq("id", s.car_id)
    .single();
  const vehicleModel = `${car.year} ${car.make} ${car.model}`;
  const videoUrl =
    s.sale_video_status === "ready" && s.sale_video_url ? s.sale_video_url : undefined;

  const html = await render(
    React.createElement(PostSaleReviewEmail, {
      customerName: s.buyer_name,
      vehicleModel,
      carImageUrl: car.main_image_url,
      deliveryPhotoUrl: s.delivery_photo_url,
      ...(videoUrl ? { videoUrl } : {}),
      reviewUrl,
    })
  );

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: TEST_TO,
    replyTo: env.RESEND_REPLY_TO,
    subject: `[TEST – ${s.buyer_name}] Congratulations on your ${vehicleModel}`,
    html,
  });
  console.log(`${s.buyer_name}: ${error ? "ERROR " + JSON.stringify(error) : "sent " + data?.id}`);
}
