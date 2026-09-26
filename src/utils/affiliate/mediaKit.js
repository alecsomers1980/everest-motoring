/**
 * Shared builder used by both the manual test-affiliate-email route and the
 * real approval-triggered send, so the two can't drift apart.
 */
export function buildAffiliateVehiclePayload(car, ref, siteUrl) {
  const hasVideo =
    typeof car.video_url === "string" && car.video_url.startsWith("cf:");

  const numberFormat = new Intl.NumberFormat("en-ZA");

  return {
    make: car.make,
    model: car.model,
    year: car.year,
    price: `R ${numberFormat.format(car.price)}`,
    mileage: car.mileage
      ? `${numberFormat.format(car.mileage)} km`
      : null,
    transmission: car.transmission,
    fuelType: car.fuel_type,
    colour: car.colour,
    features: Array.isArray(car.features) ? car.features : [],
    image: car.main_image_url,
    mediaKitUrl: `${siteUrl}/affiliate/media/${car.id}`,
    trackingLink: `${siteUrl}/inventory/${car.id}?ref=${ref}`,
    flyerUrl: `${siteUrl}/api/affiliate/flyer/${car.id}?ref=${ref}`,
    videoUrl: hasVideo
      ? `${siteUrl}/api/affiliate/video-download/${car.id}?ref=${ref}&redirect=1`
      : null,
  };
}
