import { prisma } from "../lib/prisma";
import { haversineDistanceKm } from "../lib/haversine";

async function main() {
  const allLeads = await prisma.lead.findMany({ where: { status: "ACTIVE" } });

  const uttamNagar = { lat: 28.6219, lng: 77.0588 };
  const punjabiBagh = { lat: 28.6692, lng: 77.1314 };
  const targetSubjectsLalit = ["geography", "political science", "pol science", "economics", "eco", "psychology", "phsycholgy", "humanities", "social"];
  
  console.log("=== LALIT MATCHING (Uttam Nagar / Punjabi Bagh <= 10km AND Subjects) ===");
  const lalitExact = allLeads.filter(l => {
    if (!l.latitude || !l.longitude) return false;
    const dUttam = haversineDistanceKm(uttamNagar.lat, uttamNagar.lng, l.latitude, l.longitude);
    const dPB = haversineDistanceKm(punjabiBagh.lat, punjabiBagh.lng, l.latitude, l.longitude);
    if (dUttam > 10 && dPB > 10) return false;
    const subs = l.subjects.map(s => s.toLowerCase()).join(" ");
    const notes = (l.notes || "").toLowerCase();
    return targetSubjectsLalit.some(s => subs.includes(s) || notes.includes(s));
  });

  console.log(`Lalit Matching Leads Count: ${lalitExact.length}`);
  lalitExact.forEach(l => {
    const dUttam = haversineDistanceKm(uttamNagar.lat, uttamNagar.lng, l.latitude!, l.longitude!);
    const dPB = haversineDistanceKm(punjabiBagh.lat, punjabiBagh.lng, l.latitude!, l.longitude!);
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist Uttam: ${dUttam.toFixed(1)}km, PB: ${dPB.toFixed(1)}km | Mode: ${l.mode} | Budget: ${l.budgetMin}-${l.budgetMax}`);
  });

  console.log("\n=== LALIT OTHER NEARBY 11-12 LEADS (<10km) ===");
  const lalit1112 = allLeads.filter(l => {
    if (!l.latitude || !l.longitude) return false;
    const dUttam = haversineDistanceKm(uttamNagar.lat, uttamNagar.lng, l.latitude, l.longitude);
    const dPB = haversineDistanceKm(punjabiBagh.lat, punjabiBagh.lng, l.latitude, l.longitude);
    if (dUttam > 10 && dPB > 10) return false;
    const cl = (l.classLevel || "").toLowerCase();
    return cl.includes("11") || cl.includes("12") || cl.includes("xi") || cl.includes("xii");
  });
  console.log(`Lalit 11-12 Nearby Leads Count: ${lalit1112.length}`);
  lalit1112.forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area}`);
  });

  console.log("\n=== RIHAN MATCHING (Mustafabad Delhi <= 10km) ===");
  const mustafabadDelhi = { lat: 28.7118, lng: 77.2758 };
  const rihanNear = allLeads.filter(l => {
    if (!l.latitude || !l.longitude) return false;
    const dist = haversineDistanceKm(mustafabadDelhi.lat, mustafabadDelhi.lng, l.latitude, l.longitude);
    return dist <= 10;
  }).map(l => ({
    ...l,
    dist: haversineDistanceKm(mustafabadDelhi.lat, mustafabadDelhi.lng, l.latitude!, l.longitude!)
  })).sort((a, b) => a.dist - b.dist);

  console.log(`Rihan leads <= 10km count: ${rihanNear.length}`);
  rihanNear.forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.dist.toFixed(1)}km`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
