import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { prisma } from "../lib/prisma";

export type MatchingLeadCard = {
  inquiryNumber: number;
  classLevel: string;
  subjects: string[];
  area: string;
  city: string;
  budget: string;
  mode: string;
};

export async function getChatbotMatchingLeads(
  area?: string,
  city?: string,
  classLevel?: string,
  subjects?: string[]
): Promise<MatchingLeadCard[]> {
  try {
    const rawLeads = await prisma.lead.findMany({
      where: {
        status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        inquiryNumber: true,
        classLevel: true,
        subjects: true,
        area: true,
        city: true,
        budgetMin: true,
        budgetMax: true,
        mode: true,
      },
    });

    const searchArea = (area || "").toLowerCase().trim();
    const isSouthDelhi = /sangam|saket|kalkaji|malviya|hauz|mehrauli|khanpur|nehru|lajpat|south/i.test(searchArea);

    const scored = rawLeads.map((lead) => {
      let score = 0;
      const leadArea = (lead.area || "").toLowerCase();
      const leadCity = (lead.city || "").toLowerCase();

      // Location match
      if (searchArea && leadArea.includes(searchArea)) score += 50;
      else if (isSouthDelhi && /kalkaji|saket|malviya|anand|lodhi|south|delhi/i.test(leadArea + leadCity)) score += 30;
      else if (leadCity.includes("delhi")) score += 10;

      // Class match
      if (classLevel && lead.classLevel.toLowerCase().includes(classLevel.toLowerCase())) score += 20;

      // Subject match
      if (subjects && subjects.length > 0) {
        for (const s of subjects) {
          if (lead.subjects.some((ls) => ls.toLowerCase().includes(s.toLowerCase()))) {
            score += 15;
            break;
          }
        }
      }

      return { lead, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(({ lead }) => {
      let budgetStr = "₹5,000 – ₹8,000/mo";
      if (lead.budgetMin && lead.budgetMax) {
        if (lead.budgetMax <= 1500) {
          budgetStr = `₹${lead.budgetMin} – ₹${lead.budgetMax}/hr`;
        } else {
          budgetStr = `₹${lead.budgetMin.toLocaleString()} – ₹${lead.budgetMax.toLocaleString()}/mo`;
        }
      } else if (lead.budgetMax) {
        budgetStr = `Up to ₹${lead.budgetMax.toLocaleString()}/mo`;
      }

      return {
        inquiryNumber: lead.inquiryNumber,
        classLevel: lead.classLevel,
        subjects: lead.subjects.slice(0, 3),
        area: lead.area || lead.city || "Delhi NCR",
        city: lead.city || "Delhi",
        budget: budgetStr,
        mode: lead.mode === "ONLINE" ? "Online" : lead.mode === "OFFLINE" ? "Home Visit" : "Home/Online",
      };
    });
  } catch (err) {
    console.error("[leads-helper] Failed to fetch leads:", err);
    return [];
  }
}

async function test() {
  const matches = await getChatbotMatchingLeads("sangam vihar", "delhi", "class 10", ["maths"]);
  console.log("Top 3 matches for Sangam Vihar:", JSON.stringify(matches, null, 2));
}

test();
