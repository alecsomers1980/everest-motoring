import { createAdminClient } from "@/utils/supabase/server";
import { verifyApproval } from "@/utils/video/approvalToken";
import ConfirmClient from "./ConfirmClient";

export const metadata = { title: "Video approval | Everest Motoring" };
export const dynamic = "force-dynamic";

function Shell({ title, tone = "default", children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className={`text-lg font-semibold ${tone === "error" ? "text-red-600" : "text-slate-800"}`}>
          {title}
        </h1>
        <div className="mt-2">{children}</div>
      </section>
    </main>
  );
}

export default async function VideoApprovalPage({ searchParams }) {
  const { car, action, sig } = await searchParams;

  if (!car || !action || !sig || !["approve", "reject"].includes(action)) {
    return (
      <Shell title="This link is incomplete." tone="error">
        <p className="text-sm text-slate-600">Check that the full link was copied into your browser.</p>
      </Shell>
    );
  }

  let valid = false;
  try {
    valid = verifyApproval(car, action, sig);
  } catch (error) {
    return (
      <Shell title="Approval links are not configured." tone="error">
        <p className="text-sm text-slate-600">Please contact support before using this link.</p>
      </Shell>
    );
  }

  if (!valid) {
    return (
      <Shell title="This link is not valid." tone="error">
        <p className="text-sm text-slate-600">The link may have been corrupted or expired.</p>
      </Shell>
    );
  }

  const supabase = await createAdminClient();
  const { data: carRow, error } = await supabase
    .from("cars")
    .select("id, year, make, model, price, video_url, main_image_url, video_approval_status")
    .eq("id", car)
    .single();

  if (error || !carRow) {
    return (
      <Shell title="That vehicle no longer exists." tone="error">
        <p className="text-sm text-slate-600">It may have been removed from inventory.</p>
      </Shell>
    );
  }

  if (carRow.video_approval_status !== "pending") {
    return (
      <Shell title="This video has already been reviewed." tone="neutral">
        <p className="text-sm text-slate-600">
          Current status:{" "}
          <span className="font-medium text-slate-800">{carRow.video_approval_status}</span>
        </p>
      </Shell>
    );
  }

  const carLabel = `${carRow.year} ${carRow.make} ${carRow.model}`.trim();
  const formattedPrice = carRow.price
    ? `R ${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(carRow.price)}`
    : null;
  const explanation =
    action === "approve"
      ? "The reel and full walkthrough are scheduled for tomorrow at 11:00 and 16:00."
      : "Nothing will be posted.";

  return (
    <Shell title="Confirm your video decision" tone="default">
      {carRow.main_image_url ? (
        <img
          src={carRow.main_image_url}
          alt={carLabel}
          className="mx-auto mb-4 h-48 w-full rounded-xl object-cover"
        />
      ) : null}
      <p className="text-2xl font-semibold text-slate-900">{carLabel}</p>
      {formattedPrice && <p className="mt-1 text-sm font-medium text-slate-500">{formattedPrice}</p>}
      <p className="mt-4 text-sm text-slate-600">{explanation}</p>
      <div className="mt-6">
        <ConfirmClient
          carId={carRow.id}
          action={action}
          signature={sig}
          carLabel={carLabel}
        />
      </div>
    </Shell>
  );
}