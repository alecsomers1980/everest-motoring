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

    // Cars.co.za usually requires a specific XML structure.
    // This is a generalized version based on common South African automotive portal requirements.
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<cars_co_za_feed>\n`;
    
    cars.forEach(car => {
        xml += `  <stock_item>\n`;
        xml += `    <stock_id>${car.id}</stock_id>\n`;
        xml += `    <registration_year>${car.year}</registration_year>\n`;
        xml += `    <make><![CDATA[${car.make}]]></make>\n`;
        xml += `    <model><![CDATA[${car.model}]]></model>\n`;
        xml += `    <variant><![CDATA[${car.variant || ''}]]></variant>\n`;
        xml += `    <price>${car.price}</price>\n`;
        xml += `    <mileage>${car.mileage}</mileage>\n`;
        xml += `    <transmission>${car.transmission || ''}</transmission>\n`;
        xml += `    <fuel_type>${car.fuel_type || ''}</fuel_type>\n`;
        xml += `    <drivetrain>${car.drivetrain || ''}</drivetrain>\n`;
        xml += `    <body_style>${car.body_type || ''}</body_style>\n`;
        xml += `    <exterior_color>${car.color || ''}</exterior_color>\n`;
        xml += `    <vin_number>${car.vin || ''}</vin_number>\n`;
        xml += `    <engine_number>${car.engine_number || ''}</engine_number>\n`;
        xml += `    <comments><![CDATA[${car.description || ''}]]></comments>\n`;
        
        xml += `    <images>\n`;
        if (car.main_image_url) {
            xml += `      <image>${car.main_image_url}</image>\n`;
        }
        if (car.images && Array.isArray(car.images)) {
            car.images.forEach(img => {
                xml += `      <image>${img}</image>\n`;
            });
        }
        xml += `    </images>\n`;
        
        xml += `    <features>\n`;
        if (car.features && Array.isArray(car.features)) {
            car.features.forEach(feature => {
                xml += `      <feature><![CDATA[${feature}]]></feature>\n`;
            });
        }
        xml += `    </features>\n`;
        
        xml += `    <dealer_link>https://everestmotoring.co.za/inventory/${car.id}</dealer_link>\n`;
        xml += `  </stock_item>\n`;
    });
    
    xml += `</cars_co_za_feed>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
}
