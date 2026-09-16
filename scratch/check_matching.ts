import { prisma } from "../lib/prisma";
import { getAquaWhatsAppConfig, getAquaWhatsAppStatus } from "../lib/aqua-whatsapp";
import { haversineDistanceKm } from "../lib/haversine";
import { INDIAN_CITY_COORDINATES, resolveLocationCoordinates } from "../lib/geocoding";

async function main() {
  // 1. Check Aqua WhatsApp & Resend status
  console.log("Checking WhatsApp status...");
  const waStatus = await getAquaWhatsAppStatus();
  console.log("Aqua WhatsApp Status:", waStatus);

  console.log("\nChecking Resend API Key:", {
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL
  });

  // 2. Check Leads in DB
  console.log("\nSearching for leads near Uttam Nagar / Punjabi Bagh (Class 11, 12, Geography, Pol Sci, Eco, Psychology)...");
  const allActiveLeads = await prisma.lead.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      inquiryNumber: true,
      subjects: true,
      classLevel: true,
      area: true,
      city: true,
      latitude: true,
      longitude: true,
      pincode: true,
      mode: true,
      notes: true,
      budgetMin: true,
      budgetMax: true,
      createdAt: true
    }
  });

  console.log(`Total active leads fetched: ${allActiveLeads.length}`);

  // Sample areas in leads
  const areas = new Set<string>();
  allActiveLeads.forEach(l => {
    if (l.area) areas.add(l.area);
    if (l.city) areas.add(l.city);
  });
  console.log(`Unique areas/cities in active leads (first 30):`, Array.from(areas).slice(0, 30));

  // Check leads mentioning Mustafabad or nearby
  const mustafabadLeads = allActiveLeads.filter(l => {
    const txt = `${l.area} ${l.city} ${l.notes}`.toLowerCase();
    return txt.includes("mustafabad") || txt.includes("yamuna vihar") || txt.includes("bhajanpura") || txt.includes("karawal nagar") || txt.includes("gokalpuri") || txt.includes("gokulpuri") || txt.includes("maujpur") || txt.includes("nand nagri") || txt.includes("shahdara") || txt.includes("seelampur");
  });
  console.log(`Leads with Mustafabad or nearby NE Delhi areas count: ${mustafabadLeads.length}`);
  mustafabadLeads.forEach(l => {
    console.log(` - Lead #${l.inquiryNumber || l.id}: ${l.classLevel} | ${l.subjects.join(", ")} | Area: ${l.area}, ${l.city} (coords: ${l.latitude}, ${l.longitude})`);
  });

  // Check leads mentioning Uttam Nagar / Punjabi Bagh or nearby
  const westDelhiLeads = allActiveLeads.filter(l => {
    const txt = `${l.area} ${l.city} ${l.notes}`.toLowerCase();
    return txt.includes("uttam nagar") || txt.includes("punjabi bagh") || txt.includes("janakpuri") || txt.includes("vikaspuri") || txt.includes("tilak nagar") || txt.includes("paschim vihar") || txt.includes("rajouri garden") || txt.includes("tagore garden") || txt.includes("subhash nagar");
  });
  console.log(`\nLeads in West Delhi (Uttam Nagar / Punjabi Bagh & surrounds) count: ${westDelhiLeads.length}`);
  westDelhiLeads.forEach(l => {
    console.log(` - Lead #${l.inquiryNumber || l.id}: ${l.classLevel} | ${l.subjects.join(", ")} | Area: ${l.area}, ${l.city} (coords: ${l.latitude}, ${l.longitude})`);
  });

  // Check Humanities / 11-12 leads across all active leads
  const humanities1112Leads = allActiveLeads.filter(l => {
    const cl = (l.classLevel || "").toLowerCase();
    const is1112 = cl.includes("11") || cl.includes("12") || cl.includes("xi") || cl.includes("xii");
    const sub = l.subjects.map(s => s.toLowerCase()).join(" ");
    const matchesSubject = sub.includes("geo") || sub.includes("pol") || sub.includes("eco") || sub.includes("psych") || sub.includes("humanities") || sub.includes("arts") || sub.includes("social");
    return matchesSubject;
  });
  console.log(`\nHumanities/Eco/Pol/Geo/Psych leads count: ${humanities1112Leads.length}`);
  humanities1112Leads.slice(0, 15).forEach(l => {
    console.log(` - Lead #${l.inquiryNumber || l.id}: Class: ${l.classLevel} | ${l.subjects.join(", ")} | Area: ${l.area}, ${l.city} (coords: ${l.latitude}, ${l.longitude})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
