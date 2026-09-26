import fs from "fs";
fetch("https://everestmotoring.co.za").then(r => r.text()).then(t => {
    const imgs = [...t.matchAll(/<img[^>]+src=["']([^"']+(?:logo|image)[^"']+)["'][^>]*>/gi)];
    console.log(imgs.map(m => m[1]).join("\n"));
});
