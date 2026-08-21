/**
 * lib/search/indexer.ts
 * Search Indexer & Document Sync Transformer
 */

import { prisma } from "@/lib/prisma";
import { isTypesenseConfigured } from "./client";
import type { TutorSearchDoc, LeadSearchDoc, ParentSearchDoc } from "./types";

async function postTypesenseDocument(collection: string, doc: Record<string, unknown>): Promise<boolean> {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "https";

  if (!host || !apiKey) return false;

  try {
    const url = `${protocol}://${host}:${port}/collections/${collection}/documents?action=upsert`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": apiKey,
      },
      body: JSON.stringify(doc),
    });
    return res.ok;
  } catch (error) {
    console.error(`[search-indexer] Error posting document to collection ${collection}`, error);
    return false;
  }
}

async function deleteTypesenseDocument(collection: string, docId: string): Promise<boolean> {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "https";

  if (!host || !apiKey) return false;

  try {
    const url = `${protocol}://${host}:${port}/collections/${collection}/documents/${docId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "X-TYPESENSE-API-KEY": apiKey },
    });
    return res.ok;
  } catch (error) {
    console.error(`[search-indexer] Error deleting document ${docId} from ${collection}`, error);
    return false;
  }
}

export async function indexTutor(tutorProfileId: string): Promise<boolean> {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: { user: { select: { name: true } } },
  });

  if (!tutor) return false;

  const doc: TutorSearchDoc = {
    id: tutor.id,
    userId: tutor.userId,
    name: tutor.user.name ?? "Tutor",
    subjects: tutor.subjects,
    classLevels: tutor.classLevels,
    qualification: tutor.qualification ?? "",
    experience: tutor.experience ?? 0,
    board: [],
    teachingMode: tutor.teachingMode,
    feeMin: tutor.feeMin ?? 0,
    feeMax: tutor.feeMax ?? 0,
    city: tutor.city ?? "",
    state: tutor.state ?? "",
    latitude: tutor.latitude,
    longitude: tutor.longitude,
    isVerified: tutor.isVerified,
    isFeatured: tutor.isFeatured,
    rating: tutor.averageRating,
    reviewCount: tutor.totalReviews,
    profileScore: tutor.profileScore,
    bio: tutor.bio ?? "",
    languages: [],
    updatedAt: Math.floor(tutor.updatedAt.getTime() / 1000),
  };

  if (isTypesenseConfigured()) {
    await postTypesenseDocument("tutors", doc);
  }

  console.info(`[search-indexer] Indexed tutor: ${tutorProfileId}`);
  return true;
}

export async function indexLead(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { parentProfile: { select: { user: { select: { name: true } } } } },
  });

  if (!lead) return false;

  const doc: LeadSearchDoc = {
    id: lead.id,
    parentProfileId: lead.parentProfileId,
    parentName: lead.parentProfile.user.name ?? "Parent",
    subjects: lead.subjects,
    classLevel: lead.classLevel,
    board: lead.board ?? "",
    mode: lead.mode,
    budgetMin: lead.budgetMin ?? 0,
    budgetMax: lead.budgetMax ?? 0,
    city: lead.city ?? "",
    area: lead.area ?? "",
    state: "",
    latitude: lead.latitude,
    longitude: lead.longitude,
    languagePref: lead.languagePref ? [lead.languagePref] : [],
    notes: lead.notes ?? "",
    status: lead.status,
    createdAt: Math.floor(lead.createdAt.getTime() / 1000),
    expiresAt: lead.expiresAt ? Math.floor(lead.expiresAt.getTime() / 1000) : 0,
  };

  if (isTypesenseConfigured()) {
    await postTypesenseDocument("leads", doc);
  }

  console.info(`[search-indexer] Indexed lead: ${leadId}`);
  return true;
}

export async function deleteTutorIndex(tutorProfileId: string): Promise<boolean> {
  if (isTypesenseConfigured()) {
    await deleteTypesenseDocument("tutors", tutorProfileId);
  }
  return true;
}

export async function deleteLeadIndex(leadId: string): Promise<boolean> {
  if (isTypesenseConfigured()) {
    await deleteTypesenseDocument("leads", leadId);
  }
  return true;
}

export async function reindexAllEntities(): Promise<{ tutors: number; leads: number }> {
  const [tutors, leads] = await Promise.all([
    prisma.tutorProfile.findMany({ select: { id: true } }),
    prisma.lead.findMany({ select: { id: true } }),
  ]);

  for (const t of tutors) {
    await indexTutor(t.id);
  }
  for (const l of leads) {
    await indexLead(l.id);
  }

  return { tutors: tutors.length, leads: leads.length };
}
