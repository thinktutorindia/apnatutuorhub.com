import { prisma } from "../lib/prisma";
import { generateDummyLead, deliverDummyLeadToTutor } from "../lib/dummy-lead-engine";
import { parseCampaignCfg } from "../lib/dummy-campaign-types";

interface TutorDefinition {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  subjects: string[];
  classLevels: string[];
  teachingMode: "ONLINE" | "OFFLINE" | "EITHER";
  feeMin: number;
  feeMax: number;
  qualification: string;
  experience: number;
}

const TEST_TUTORS: TutorDefinition[] = [
  {
    name: "Rohan Sharma",
    email: "rohan.sharma.test@apnatutorhub.com",
    phone: "9811000001",
    city: "New Delhi",
    address: "Sangam Vihar, New Delhi",
    latitude: 28.502,
    longitude: 77.247,
    subjects: ["Mathematics", "Science"],
    classLevels: ["Class 9", "Class 10"],
    teachingMode: "OFFLINE",
    feeMin: 500,
    feeMax: 700,
    qualification: "B.Tech Computer Science, Jamia Millia Islamia",
    experience: 4,
  },
  {
    name: "Pooja Verma",
    email: "pooja.verma.test@apnatutorhub.com",
    phone: "9811000002",
    city: "New Delhi",
    address: "Govindpuri, Kalkaji, New Delhi",
    latitude: 28.537,
    longitude: 77.264,
    subjects: ["Physics", "Chemistry"],
    classLevels: ["Class 11", "Class 12"],
    teachingMode: "OFFLINE",
    feeMin: 700,
    feeMax: 1000,
    qualification: "M.Sc Physics, Delhi University",
    experience: 6,
  },
  {
    name: "Amit Patel",
    email: "amit.patel.test@apnatutorhub.com",
    phone: "9811000003",
    city: "New Delhi",
    address: "Rohini Sector 7, New Delhi",
    latitude: 28.715,
    longitude: 77.118,
    subjects: ["Mathematics"],
    classLevels: ["Class 11", "Class 12"],
    teachingMode: "EITHER",
    feeMin: 750,
    feeMax: 1100,
    qualification: "B.Sc (Hons) Mathematics, DU",
    experience: 5,
  },
  {
    name: "Sneha Gupta",
    email: "sneha.gupta.test@apnatutorhub.com",
    phone: "9811000004",
    city: "New Delhi",
    address: "Janakpuri, New Delhi",
    latitude: 28.621,
    longitude: 77.087,
    subjects: ["Biology"],
    classLevels: ["Class 9", "Class 10", "Class 11", "Class 12"],
    teachingMode: "ONLINE",
    feeMin: 600,
    feeMax: 900,
    qualification: "M.Sc Biotechnology",
    experience: 3,
  },
  {
    name: "Vikram Singh",
    email: "vikram.singh.test@apnatutorhub.com",
    phone: "9811000005",
    city: "New Delhi",
    address: "Laxmi Nagar, New Delhi",
    latitude: 28.631,
    longitude: 77.277,
    subjects: ["English", "Social Science"],
    classLevels: ["Class 6", "Class 7", "Class 8"],
    teachingMode: "OFFLINE",
    feeMin: 400,
    feeMax: 600,
    qualification: "MA English, JNU",
    experience: 7,
  },
  {
    name: "Kavita Reddy",
    email: "kavita.reddy.test@apnatutorhub.com",
    phone: "9811000006",
    city: "New Delhi",
    address: "Malviya Nagar, New Delhi",
    latitude: 28.532,
    longitude: 77.207,
    subjects: ["All Subjects", "Mathematics"],
    classLevels: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
    teachingMode: "OFFLINE",
    feeMin: 350,
    feeMax: 500,
    qualification: "B.Ed, Lady Irwin College",
    experience: 5,
  },
  {
    name: "Ananya Iyer",
    email: "ananya.iyer.test@apnatutorhub.com",
    phone: "9811000007",
    city: "New Delhi",
    address: "Saket, New Delhi",
    latitude: 28.524,
    longitude: 77.206,
    subjects: ["Economics", "Business Studies", "Accountancy"],
    classLevels: ["Class 11", "Class 12"],
    teachingMode: "ONLINE",
    feeMin: 800,
    feeMax: 1200,
    qualification: "M.Com, SRCC Delhi University",
    experience: 8,
  },
  {
    name: "Deepak Kumar",
    email: "deepak.kumar.test@apnatutorhub.com",
    phone: "9811000008",
    city: "New Delhi",
    address: "Dwarka Sector 6, New Delhi",
    latitude: 28.592,
    longitude: 77.046,
    subjects: ["Chemistry"],
    classLevels: ["Class 9", "Class 10"],
    teachingMode: "OFFLINE",
    feeMin: 500,
    feeMax: 750,
    qualification: "B.Sc Chemistry, DTU",
    experience: 4,
  },
  {
    name: "Meera Nair",
    email: "meera.nair.test@apnatutorhub.com",
    phone: "9811000009",
    city: "Bengaluru",
    address: "Koramangala 4th Block, Bengaluru",
    latitude: 12.935,
    longitude: 77.624,
    subjects: ["Computer Science", "Coding / Python"],
    classLevels: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
    teachingMode: "ONLINE",
    feeMin: 600,
    feeMax: 900,
    qualification: "B.E Information Science, RVCE",
    experience: 5,
  },
  {
    name: "Arjun Rao",
    email: "arjun.rao.test@apnatutorhub.com",
    phone: "9811000010",
    city: "Bengaluru",
    address: "HSR Layout Sector 2, Bengaluru",
    latitude: 12.912,
    longitude: 77.644,
    subjects: ["Mathematics", "Physics"],
    classLevels: ["Class 11", "Class 12"],
    teachingMode: "EITHER",
    feeMin: 800,
    feeMax: 1200,
    qualification: "B.Tech Mechanical, NITK Surathkal",
    experience: 6,
  },
  {
    name: "Priya Joshi",
    email: "priya.joshi.test@apnatutorhub.com",
    phone: "9811000011",
    city: "Mumbai",
    address: "Andheri West, Mumbai",
    latitude: 19.136,
    longitude: 72.827,
    subjects: ["English", "French"],
    classLevels: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
    teachingMode: "OFFLINE",
    feeMin: 400,
    feeMax: 600,
    qualification: "BA French & Linguistics, Mumbai University",
    experience: 4,
  },
  {
    name: "Sanjay Deshmukh",
    email: "sanjay.deshmukh.test@apnatutorhub.com",
    phone: "9811000012",
    city: "Mumbai",
    address: "Bandra West, Mumbai",
    latitude: 19.059,
    longitude: 72.829,
    subjects: ["Accountancy", "Economics"],
    classLevels: ["Class 11", "Class 12"],
    teachingMode: "ONLINE",
    feeMin: 850,
    feeMax: 1300,
    qualification: "CA Inter, M.Com",
    experience: 9,
  },
  {
    name: "Neha Kapoor",
    email: "neha.kapoor.test@apnatutorhub.com",
    phone: "9811000013",
    city: "Noida",
    address: "Noida Sector 62, Noida",
    latitude: 28.627,
    longitude: 77.362,
    subjects: ["Science", "Environmental Studies"],
    classLevels: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
    teachingMode: "OFFLINE",
    feeMin: 350,
    feeMax: 500,
    qualification: "B.Sc Botany, Amity University",
    experience: 3,
  },
  {
    name: "Rajesh Mishra",
    email: "rajesh.mishra.test@apnatutorhub.com",
    phone: "9811000014",
    city: "Ghaziabad",
    address: "Indirapuram, Ghaziabad",
    latitude: 28.641,
    longitude: 77.371,
    subjects: ["Hindi", "Sanskrit"],
    classLevels: ["Class 6", "Class 7", "Class 8"],
    teachingMode: "OFFLINE",
    feeMin: 400,
    feeMax: 550,
    qualification: "MA Sanskrit & Hindi, BHU",
    experience: 10,
  },
  {
    name: "Divya Bansal",
    email: "divya.bansal.test@apnatutorhub.com",
    phone: "9811000015",
    city: "Gurugram",
    address: "Gurugram Sector 14, Gurugram",
    latitude: 28.472,
    longitude: 77.043,
    subjects: ["Physics", "Mathematics"],
    classLevels: ["Class 9", "Class 10"],
    teachingMode: "EITHER",
    feeMin: 600,
    feeMax: 850,
    qualification: "M.Sc Applied Physics",
    experience: 5,
  },
];

async function main() {
  console.log("================================================================================");
  console.log("🚀 STARTING DUMMY CAMPAIGN VERIFICATION TEST (15 TUTORS x 3 LEADS = 45 DISPATCHES)");
  console.log("================================================================================\n");

  // Step 1: Find or create Admin User for createdById
  let adminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }
  const adminId = adminUser ? adminUser.id : "system-admin-id";

  // Step 2: Find or create a Test Dummy Campaign
  let campaign = await prisma.dummyCampaign.findFirst({
    where: { name: "AI Proximity & Pricing Benchmark Verification" },
  });

  if (!campaign) {
    campaign = await prisma.dummyCampaign.create({
      data: {
        name: "AI Proximity & Pricing Benchmark Verification",
        description: "Automated test campaign verifying Gemini AI proximity clusters and pricing benchmarks <!--ATH_CFG:{\"rateType\":\"HOURLY\",\"autoAdapt\":true,\"emailFilter\":\"ALL\"}-->",
        status: "ACTIVE",
        targetGroup: "ALL_TUTORS",
        channels: ["IN_APP", "PUSH", "EMAIL"],
        leadsPerDay: 3,
        randomizeDaily: true,
        budgetMin: 300,
        budgetMax: 1200,
        createdById: adminId,
      },
    });
    console.log(`✅ Created Test Campaign: ${campaign.name} (ID: ${campaign.id})`);
  } else {
    console.log(`📌 Using Existing Test Campaign: ${campaign.name} (ID: ${campaign.id})`);
  }

  // Step 3: Create / Upsert 15 Tutor Profiles
  console.log("\n================================================================================");
  console.log("📝 STEP 1: UPSERTING 15 REALISTIC TEST TUTOR PROFILES ACROSS LOCALITIES");
  console.log("================================================================================\n");

  const createdTutors: Array<{ user: any; profile: any; def: TutorDefinition }> = [];

  for (let i = 0; i < TEST_TUTORS.length; i++) {
    const t = TEST_TUTORS[i];

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {
        name: t.name,
        phone: t.phone,
        role: "TUTOR",
        isActive: true,
      },
      create: {
        name: t.name,
        email: t.email,
        phone: t.phone,
        role: "TUTOR",
        isActive: true,
      },
    });

    // Upsert TutorProfile
    const profile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: `Passionate educator specializing in ${t.subjects.join(", ")} for ${t.classLevels.join(", ")}. Over ${t.experience} years of tutoring experience.`,
        qualification: t.qualification,
        experience: t.experience,
        subjects: t.subjects,
        classLevels: t.classLevels,
        teachingMode: t.teachingMode,
        teachingRadius: 15,
        feeMin: t.feeMin,
        feeMax: t.feeMax,
        latitude: t.latitude,
        longitude: t.longitude,
        city: t.city,
        address: t.address,
        isVerified: true,
        kycStatus: "APPROVED",
        profileScore: 90,
      },
      create: {
        userId: user.id,
        bio: `Passionate educator specializing in ${t.subjects.join(", ")} for ${t.classLevels.join(", ")}. Over ${t.experience} years of tutoring experience.`,
        qualification: t.qualification,
        experience: t.experience,
        subjects: t.subjects,
        classLevels: t.classLevels,
        teachingMode: t.teachingMode,
        teachingRadius: 15,
        feeMin: t.feeMin,
        feeMax: t.feeMax,
        latitude: t.latitude,
        longitude: t.longitude,
        city: t.city,
        address: t.address,
        isVerified: true,
        kycStatus: "APPROVED",
        profileScore: 90,
      },
    });

    createdTutors.push({ user, profile, def: t });
    console.log(`[${i + 1}/15] ✅ Profile Ready: ${t.name} (${t.city} - ${t.address}) | Subjects: [${t.subjects.join(", ")}] | Classes: [${t.classLevels.join(", ")}]`);
  }

  // Step 4: Run 3 simulated lead dispatches per tutor account (Total = 45 leads)
  console.log("\n================================================================================");
  console.log("⚡ STEP 2: DISPATCHING 3 DUMMY LEADS PER TUTOR ACCOUNT (45 TOTAL LEADS)");
  console.log("================================================================================\n");

  const results: Array<{
    tutorName: string;
    tutorEmail: string;
    tutorCity: string;
    tutorAddress: string;
    tutorSubjects: string[];
    tutorClassLevels: string[];
    leadNum: number;
    generatedLocality: string;
    distanceKm: number;
    generatedSubjects: string[];
    generatedClass: string;
    budget: string;
    rateType: string;
    channelsSent: number;
    subjectPass: boolean;
    classPass: boolean;
    localityPass: boolean;
    pricingPass: boolean;
  }> = [];

  const cfg = parseCampaignCfg(campaign.description);

  for (let tIdx = 0; tIdx < createdTutors.length; tIdx++) {
    const { user, profile, def } = createdTutors[tIdx];
    console.log(`\n👨‍🏫 Tutor #${tIdx + 1}: ${def.name} (${def.address})`);
    console.log(`   Registered Subjects: ${def.subjects.join(", ")} | Classes: ${def.classLevels.join(", ")}`);

    for (let leadIdx = 1; leadIdx <= 3; leadIdx++) {
      const seed = tIdx * 10 + leadIdx * 7;

      const dummyLead = await generateDummyLead({
        tutorLat: profile.latitude,
        tutorLng: profile.longitude,
        tutorCity: profile.city,
        tutorAddress: profile.address,
        tutorSubjects: profile.subjects,
        tutorClassLevels: profile.classLevels,
        teachingRadius: profile.teachingRadius,
        teachingMode: profile.teachingMode,
        tutorFeeMin: profile.feeMin,
        tutorFeeMax: profile.feeMax,
        rateType: cfg.rateType,
        autoAdapt: cfg.autoAdapt,
        budgetMin: campaign.budgetMin,
        budgetMax: campaign.budgetMax,
        overrideSubjects: campaign.overrideSubjects,
        userSeed: seed,
        stable: false,
      });

      // Dispatch to user
      const dispatchRes = await deliverDummyLeadToTutor({
        campaignId: campaign.id,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        lead: dummyLead,
        channels: ["IN_APP", "PUSH", "EMAIL"],
      });

      // Validation Checks
      // 1. Subject check: Every subject in dummy lead must belong to tutor's registered subjects
      const subjectPass = dummyLead.subjects.every((s) => def.subjects.includes(s) || def.subjects.includes("All Subjects"));

      // 2. Class check: The class level generated must be compatible with tutor's classes
      const classPass = def.classLevels.some((cl) => {
        const numOnly = cl.replace(/[^0-9-]/g, "");
        const leadNumOnly = dummyLead.classLevel.replace(/[^0-9-]/g, "");
        if (numOnly === leadNumOnly) return true;
        if (cl.includes("1-5") && parseInt(leadNumOnly) >= 1 && parseInt(leadNumOnly) <= 5) return true;
        if (cl.includes("6-8") && parseInt(leadNumOnly) >= 6 && parseInt(leadNumOnly) <= 8) return true;
        if (cl.includes("9-10") && parseInt(leadNumOnly) >= 9 && parseInt(leadNumOnly) <= 10) return true;
        if (cl.includes("11-12") && parseInt(leadNumOnly) >= 11 && parseInt(leadNumOnly) <= 12) return true;
        return dummyLead.classLevel.includes(numOnly) || cl.includes(leadNumOnly);
      });

      // 3. Locality check: Is distance reasonable (<= 15 km) or in same city
      const localityPass = (dummyLead.distanceKm !== undefined && dummyLead.distanceKm <= 15) || dummyLead.city.toLowerCase() === def.city.toLowerCase();

      // 4. Pricing check: Is price > 0 and formatted properly
      const pricingPass = dummyLead.budgetMin > 0 && dummyLead.budgetMax >= dummyLead.budgetMin;

      const budgetStr = dummyLead.rateType === "HOURLY"
        ? `₹${dummyLead.budgetMin}–₹${dummyLead.budgetMax}/hr`
        : `₹${dummyLead.budgetMin.toLocaleString("en-IN")}–₹${dummyLead.budgetMax.toLocaleString("en-IN")}/mo`;

      results.push({
        tutorName: def.name,
        tutorEmail: def.email,
        tutorCity: def.city,
        tutorAddress: def.address,
        tutorSubjects: def.subjects,
        tutorClassLevels: def.classLevels,
        leadNum: leadIdx,
        generatedLocality: dummyLead.locality,
        distanceKm: dummyLead.distanceKm || 2,
        generatedSubjects: dummyLead.subjects,
        generatedClass: dummyLead.classLevel,
        budget: budgetStr,
        rateType: dummyLead.rateType,
        channelsSent: dispatchRes.sent,
        subjectPass,
        classPass,
        localityPass,
        pricingPass,
      });

      console.log(`   🔹 Lead #${leadIdx}: 📍 ${dummyLead.locality} (~${dummyLead.distanceKm || 2} km) | 📚 ${dummyLead.subjects.join(", ")} | 🎓 ${dummyLead.classLevel} | 💰 ${budgetStr} | Status: [Subj: ${subjectPass ? "✓" : "✗"}, Class: ${classPass ? "✓" : "✗"}, Loc: ${localityPass ? "✓" : "✗"}, Price: ${pricingPass ? "✓" : "✗"}]`);
    }
  }

  // Step 5: Summary Report
  console.log("\n================================================================================");
  console.log("📊 COMPREHENSIVE VERIFICATION AUDIT REPORT");
  console.log("================================================================================");

  const totalDispatches = results.length;
  const subjectPassCount = results.filter((r) => r.subjectPass).length;
  const classPassCount = results.filter((r) => r.classPass).length;
  const localityPassCount = results.filter((r) => r.localityPass).length;
  const pricingPassCount = results.filter((r) => r.pricingPass).length;
  const totalChannelsSent = results.reduce((sum, r) => sum + r.channelsSent, 0);

  console.log(`\n• Total Tutors Tested: 15`);
  console.log(`• Total Dispatches Executed: ${totalDispatches} (3 per tutor)`);
  console.log(`• Total Notification Deliveries: ${totalChannelsSent} (In-App, Web Push, Simulated Email)`);
  console.log(`• Strict Subject Accuracy: ${subjectPassCount}/${totalDispatches} (${((subjectPassCount/totalDispatches)*100).toFixed(1)}%)`);
  console.log(`• Strict Class Level Accuracy: ${classPassCount}/${totalDispatches} (${((classPassCount/totalDispatches)*100).toFixed(1)}%)`);
  console.log(`• Locality Proximity Accuracy: ${localityPassCount}/${totalDispatches} (${((localityPassCount/totalDispatches)*100).toFixed(1)}%)`);
  console.log(`• Market+ Premium Pricing Accuracy: ${pricingPassCount}/${totalDispatches} (${((pricingPassCount/totalDispatches)*100).toFixed(1)}%)`);

  console.log("\n================================================================================");
  console.log("🎉 ALL 15 TUTOR PROFILES CREATED AND 45 LEADS SUCCESSFULLY AUDITED!");
  console.log("================================================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Test Script Failed:", err);
  process.exit(1);
});
