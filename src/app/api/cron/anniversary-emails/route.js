import { NextResponse } from "next/server";
import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { OneYearEmail } from "@/emails/OneYearEmail";
import { SixMonthFollowupEmail } from "@/emails/6MonthFollowup";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return (request.headers.get("authorization") || "") === "Bearer " + secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await createAdminClient();

    // Compute the calendar month exactly one year ago (UTC)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1));

    // Query sales in that window
    const { data: sales, error } = await admin
      .from("sales")
      .select("id, buyer_name, buyer_email, car_id, sold_at")
      .gte("sold_at", start.toISOString())
      .lt("sold_at", end.toISOString());

    if (error) throw error;

    const recipients = [];

    for (const sale of sales) {
      if (!sale.buyer_email) continue;

      // Look up car (fail silently and fall back to generic)
      let vehicleModel = "your vehicle";
      try {
        const { data: car, error: carError } = await admin
          .from("cars")
          .select("make, model, year")
          .eq("id", sale.car_id)
          .single();

        if (!carError && car) {
          vehicleModel = [car.year, car.make, car.model].filter(Boolean).join(" ") || "your vehicle";
        }
      } catch {
        // ignore car lookup failure, use default
      }

      const customerName = sale.buyer_name || "Valued Client";

      // Send anniversary email with individual error handling
      try {
        await sendEmail({
          to: sale.buyer_email,
          subject: "Happy 1-Year Anniversary from Everest Motoring 🎉",
          react: React.createElement(OneYearEmail, { customerName, vehicleModel }),
        });

        recipients.push({
          name: customerName,
          vehicleModel,
          email: sale.buyer_email,
          soldAt: sale.sold_at,
        });
      } catch (emailError) {
        console.error(`[cron/anniversary-emails] Failed to send to ${sale.buyer_email}:`, emailError);
        // continue with next sale
      }
    }

    // --- 6-month follow-up: sales whose purchase was ~6 months ago this month ---
    const start6 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1));
    const end6 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    let sixMonthSent = 0;
    try {
      const { data: sales6 } = await admin
        .from("sales")
        .select("id, buyer_name, buyer_email, car_id, sold_at")
        .gte("sold_at", start6.toISOString())
        .lt("sold_at", end6.toISOString());

      for (const sale of sales6 || []) {
        if (!sale.buyer_email) continue;
        let vehicleModel = "your vehicle";
        let carImageUrl;
        try {
          const { data: car } = await admin
            .from("cars")
            .select("make, model, year, main_image_url")
            .eq("id", sale.car_id)
            .single();
          if (car) {
            vehicleModel = [car.year, car.make, car.model].filter(Boolean).join(" ") || "your vehicle";
            carImageUrl = car.main_image_url || undefined;
          }
        } catch {
          // ignore car lookup failure
        }

        try {
          await sendEmail({
            to: sale.buyer_email,
            subject: "Six months with your " + vehicleModel + " — how's it going?",
            react: React.createElement(SixMonthFollowupEmail, {
              customerName: sale.buyer_name || "Valued Client",
              vehicleModel,
              ...(carImageUrl ? { carImageUrl } : {}),
            }),
          });
          sixMonthSent++;
        } catch (followupError) {
          console.error(`[cron/anniversary-emails] 6-month send failed for ${sale.buyer_email}:`, followupError);
        }
      }
    } catch (followupQueryError) {
      console.error("[cron/anniversary-emails] 6-month query failed:", followupQueryError);
    }

    // Staff digest
    const monthLabel = start.toLocaleString("en-ZA", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const details = recipients.length
      ? recipients.map((r) => ({
          label: r.name,
          value:
            r.vehicleModel +
            " — bought " +
            new Date(r.soldAt).toLocaleDateString("en-ZA", { timeZone: "UTC" }),
        }))
      : [{ label: "Recipients", value: "No clients reached their 1-year anniversary this month." }];

    await sendEmail({
      to: ["info@everestmotoring.co.za", "anton@everestmotoring.co.za"],
      subject: "1-Year Anniversary Emails — " + monthLabel,
      react: React.createElement(SystemNotificationEmail, {
        subject: "1-Year anniversary emails sent — " + monthLabel,
        details,
        actionLink: "https://everestmotoring.co.za/admin",
        actionLabel: "Open Admin Hub",
      }),
    });

    return NextResponse.json({
      success: true,
      month: monthLabel,
      count: recipients.length,
      sixMonthFollowups: sixMonthSent,
      recipients,
    });
  } catch (err) {
    console.error("[cron/anniversary-emails] failed:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
