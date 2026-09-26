import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();

    const { data: cars, error } = await supabase
        .from("cars")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }

    // Autotrader South Africa often accepts a CSV format via SFTP, 
    // but for an API feed, we'll provide a standard XML structure 
    // that can be easily mapped by their technical team.
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<inventory>\n`;
    
    cars.forEach(car => {
        xml += `  <vehicle>\n`;
        xml += `    <id>${car.id}</id>\n`;
        xml += `    <vin>${car.vin || ''}</vin>\n`;
        xml += `    <make><![CDATA[${car.make}]]></make>\n`;
        xml += `    <model><![CDATA[${car.model}]]></model>\n`;
        xml += `    <year>${car.year}</year>\n`;
        xml += `    <price>${car.price}</price>\n`;
        xml += `    <mileage>${car.mileage}</mileage>\n`;
        xml += `    <transmission>${car.transmission || ''}</transmission>\n`;
        xml += `    <fuel_type>${car.fuel_type || ''}</fuel_type>\n`;
        xml += `    <drivetrain>${car.drivetrain || ''}</drivetrain>\n`;
        xml += `    <body_type>${car.body_type || ''}</body_type>\n`;
        xml += `    <color>${car.color || ''}</color>\n`;
        xml += `    <description><![CDATA[${car.description || ''}]]></description>\n`;
        xml += `    <main_image>${car.main_image_url || ''}</main_image>\n`;
        if (car.images && Array.isArray(car.images)) {
            xml += `    <additional_images>\n`;
            car.images.forEach(img => {
                xml += `      <image>${img}</image>\n`;
            });
            xml += `    </additional_images>\n`;
        }
        if (car.features && Array.isArray(car.features)) {
            xml += `    <features>\n`;
            car.features.forEach(feature => {
                xml += `      <feature><![CDATA[${feature}]]></feature>\n`;
            });
            xml += `    </features>\n`;
        }
        xml += `    <url>https://everestmotoring.co.za/inventory/${car.id}</url>\n`;
        xml += `  </vehicle>\n`;
    });
    
    xml += `</inventory>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
}
