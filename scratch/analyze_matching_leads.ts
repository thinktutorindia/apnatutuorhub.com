import { prisma } from "../lib/prisma";
import { haversineDistanceKm } from "../lib/haversine";

async function main() {
  const allLeads = await prisma.lead.findMany({
    where: { status: "ACTIVE" },
  });

  console.log(`Total active leads: ${allLeads.length}`);

  // Point A: Uttam Nagar
  const uttamNagar = { lat: 28.6219, lng: 77.0588 };
  // Point B: Punjabi Bagh
  const punjabiBagh = { lat: 28.6692, lng: 77.1314 };
  // Point C: Mustafabad, Delhi
  const mustafabadDelhi = { lat: 28.7118, lng: 77.2758 };
  // Point D: Mustafabad, Haryana
  const mustafabadHaryana = { lat: 29.6436, lng: 77.1079 };

  console.log("\n=================== 1. LEADS NEAR LALIT (Uttam Nagar / Punjabi Bagh) ===================");
  // Distance to Uttam Nagar <= 10 OR Punjabi Bagh <= 10
  const lalitGeoLeads = allLeads.map(lead => {
    let distUttam = 9999;
    let distPB = 9999;
    if (lead.latitude && lead.longitude) {
      distUttam = haversineDistanceKm(uttamNagar.lat, uttamNagar.lng, lead.latitude, lead.longitude);
      distPB = haversineDistanceKm(punjabiBagh.lat, punjabiBagh.lng, lead.latitude, lead.longitude);
    }
    const minDist = Math.min(distUttam, distPB);
    return { ...lead, distUttam, distPB, minDist };
  }).filter(l => l.minDist <= 10);

  console.log(`Leads within 10km of Uttam Nagar or Punjabi Bagh: ${lalitGeoLeads.length}`);

  // Now filter by subjects Lalit teaches: Geography, Political Science, Economics, Psychology (Class 11, 12)
  const targetSubjectsLalit = ["geography", "political science", "pol science", "economics", "eco", "psychology", "phsycholgy", "humanities", "social"];
  
  const lalitMatchingLeads = lalitGeoLeads.filter(lead => {
    const subjectsJoined = lead.subjects.map(s => s.toLowerCase()).join(" ");
    const notesLower = (lead.notes || "").toLowerCase();
    const classLower = (lead.classLevel || "").toLowerCase();

    const matchesSubject = targetSubjectsLalit.some(sub => subjectsJoined.includes(sub) || notesLower.includes(sub));
    return matchesSubject;
  });

  console.log(`Leads matching subjects & within 10km for Lalit: ${lalitMatchingLeads.length}`);
  lalitMatchingLeads.forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.minDist.toFixed(1)}km (PB: ${l.distPB.toFixed(1)}km, Uttam: ${l.distUttam.toFixed(1)}km)`);
  });

  // What about any Class 11/12 leads in West Delhi?
  const lalitClass11_12_Leads = lalitGeoLeads.filter(lead => {
    const classLower = (lead.classLevel || "").toLowerCase();
    return classLower.includes("11") || classLower.includes("12") || classLower.includes("xi") || classLower.includes("xii");
  });
  console.log(`\nAll Class 11/12 leads within 10km of Uttam Nagar / Punjabi Bagh: ${lalitClass11_12_Leads.length}`);
  lalitClass11_12_Leads.forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.minDist.toFixed(1)}km`);
  });

  console.log("\n=================== 2. LEADS NEAR RIHAN (Mustafabad) ===================");
  // Check Mustafabad Delhi (28.7118, 77.2758)
  const rihanDelhiLeads = allLeads.map(lead => {
    let dist = 9999;
    if (lead.latitude && lead.longitude) {
      dist = haversineDistanceKm(mustafabadDelhi.lat, mustafabadDelhi.lng, lead.latitude, lead.longitude);
    }
    return { ...lead, dist };
  }).filter(l => l.dist <= 10);

  console.log(`Leads within 10km of Mustafabad Delhi (28.7118, 77.2758): ${rihanDelhiLeads.length}`);
  rihanDelhiLeads.forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.dist.toFixed(1)}km`);
  });

  // Check Mustafabad Haryana (29.6436, 77.1079)
  const rihanHaryanaLeads = allLeads.map(lead => {
    let dist = 9999;
    if (lead.latitude && lead.longitude) {
      dist = haversineDistanceKm(mustafabadHaryana.lat, mustafabadHaryana.lng, lead.latitude, lead.longitude);
    }
    return { ...lead, dist };
  }).filter(l => l.dist <= 10);
  console.log(`Leads within 10km of Mustafabad Haryana: ${rihanHaryanaLeads.length}`);

  // What are the closest leads to Mustafabad Delhi overall?
  const sortedByDelhiMustafabad = allLeads.map(lead => {
    let dist = 9999;
    if (lead.latitude && lead.longitude) {
      dist = haversineDistanceKm(mustafabadDelhi.lat, mustafabadDelhi.lng, lead.latitude, lead.longitude);
    }
    return { ...lead, dist };
  }).sort((a, b) => a.dist - b.dist);

  console.log(`\nTop 10 closest leads to Mustafabad Delhi:`);
  sortedByDelhiMustafabad.slice(0, 10).forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.dist.toFixed(1)}km`);
  });

  // What leads match Rihan's subjects (Maths, Science, English, Class 6-12) among nearby leads?
  const rihanSubjects = ["math", "science", "english"];
  const rihanSubjectMatchesInDelhi = sortedByDelhiMustafabad.filter(lead => {
    const subJoined = lead.subjects.map(s => s.toLowerCase()).join(" ");
    return rihanSubjects.some(s => subJoined.includes(s));
  });

  console.log(`\nTop 10 closest leads matching Rihan's subjects (Maths, Science, English):`);
  rihanSubjectMatchesInDelhi.slice(0, 10).forEach(l => {
    console.log(`- Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | Subjects: ${l.subjects.join(", ")} | Area: ${l.area} | Dist: ${l.dist.toFixed(1)}km`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
