import { prisma } from "@/lib/prisma";
import { expandSubjectAliases, expandClassLevel } from "@/lib/subject-matcher";
import { getTaxonomySubjectsForSearch, inferTutorClassesAndSubjects, getGradesForClassLevel, parseGradeNumbers } from "@/lib/subject-taxonomy";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import { haversineDistanceKm } from "@/lib/haversine";

export interface PublicTutorResult {
  id: string;
  name: string; // first name + last initial only e.g. "Ramesh K."
  qualification: string;
  experience: number;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  feeMin: number | null;
  feeMax: number | null;
  city: string | null;
  state: string | null;
  address?: string | null;
  gender?: string | null;
  image?: string | null;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  isFeatured: boolean;
  bio: string | null;
  profileScore: number;
  teachingRadius?: number;
  distanceKm?: number | null;
  displayedClasses?: string;
  displayedSubjects?: string;
  isOnlineMatch?: boolean;
}

function maskName(fullName: string | null): string {
  if (!fullName) return "Verified Tutor";
  const cleaned = fullName
    .replace(/[()[\]{}<>]/g, " ")
    .replace(/[^a-zA-Z.\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(/\s+/).filter((p) => p.replace(/[.'-]/g, "").length >= 2);
  if (parts.length === 0) return "Verified Tutor";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]!.toUpperCase()}.`;
}

function subjectMatchScore(tutorSubjects: string[], requested: string[]): number {
  if (!requested.length) return 0;
  const req = requested.map((s) => s.toLowerCase());
  const subs = tutorSubjects.map((s) => s.toLowerCase());
  let score = 0;
  if (subs[0] && req.some((r) => subs[0] === r || subs[0].includes(r) || r.includes(subs[0]))) {
    score += 100;
  }
  for (const s of subs) {
    if (req.some((r) => s === r)) score += 20;
    else if (req.some((r) => s.includes(r) || r.includes(s))) score += 8;
  }
  return score;
}

function getMetroName(locality: string): string {
  const loc = locality.toLowerCase().trim();
  if (
    /delhi|new delhi|sangam vihar|saket|malviya nagar|hauz khas|greater kailash|gk|lajpat|kalkaji|nehru place|vasant|dwarka|janakpuri|vikaspuri|uttam nagar|tilak nagar|rajouri|punjabi bagh|paschim vihar|kirti nagar|patel nagar|moti nagar|rohini|pitampura|shalimar|model town|ashok vihar|civil lines|mukherjee nagar|gtb nagar|burari|azadpur|jahangirpuri|karol bagh|laxmi nagar|mayur vihar|preet vihar|anand vihar|dilshad garden|shahdara|noida|greater noida|ghaziabad|indirapuram|vaishali|vasundhara|gurgaon|gurugram|faridabad/i.test(
      loc
    )
  ) {
    return "Delhi";
  }
  if (/mumbai|andheri|bandra|juhu|powai|thane|navi mumbai|borivali|dadar|worli/i.test(loc)) {
    return "Mumbai";
  }
  if (/bengaluru|bangalore|koramangala|indiranagar|whitefield|hsr|electronic city|jayanagar|jp nagar/i.test(loc)) {
    return "Bengaluru";
  }
  if (/hyderabad|gachibowli|madhapur|hitec|jubilee hills|banjara hills|kondapur/i.test(loc)) {
    return "Hyderabad";
  }
  if (/pune|kothrud|viman nagar|hinjewadi|wakad|baner|aundh/i.test(loc)) {
    return "Pune";
  }
  return "Delhi";
}

export async function searchTutorsPublic(params: {
  subject?: string;
  subjects?: string[];
  classLevel?: string;
  mode?: string;
  budgetMax?: number;
  city?: string;
  board?: string;
  gender?: string;
  radiusKm?: number;
}): Promise<{ tutors: PublicTutorResult[]; total: number; isFallback?: boolean; fallbackReason?: string }> {
  const { classLevel, mode, budgetMax, city, gender, radiusKm } = params;
  const inputSubjects =
    params.subjects && params.subjects.length > 0
      ? params.subjects
      : params.subject
        ? [params.subject]
        : [];
  const primarySubject = inputSubjects[0] || "";

  // Normalize classLevel format (e.g. "Class 11 12" -> "Class 11-12")
  const cleanClassLevel = classLevel
    ? classLevel
        .replace(/(?:class\s*)?11\s*[-–to\s]+\s*12/i, "Class 11-12")
        .replace(/(?:class\s*)?9\s*[-–to\s]+\s*10/i, "Class 9-10")
        .replace(/(?:class\s*)?6\s*[-–to\s]+\s*8/i, "Class 6-8")
        .replace(/(?:class\s*)?1\s*[-–to\s]+\s*5/i, "Class 1-5")
    : undefined;

  // 1. Resolve exact matching canonical subjects directly from Centralized Taxonomy
  const taxonomySubjects = getTaxonomySubjectsForSearch(primarySubject, cleanClassLevel);

  // Isolate grade-specific taxonomy subjects when classLevel is specified to prevent junior tutors matching
  const targetGrades = cleanClassLevel ? getGradesForClassLevel(cleanClassLevel) : [];
  const gradeSpecificTaxonomySubjects =
    cleanClassLevel && targetGrades.length > 0
      ? taxonomySubjects.filter((s) => {
          const g = parseGradeNumbers(s);
          return g.length > 0 && g.some((n) => targetGrades.includes(n));
        })
      : taxonomySubjects;

  // If a class level is requested, searchSubjectSet should be strictly governed by taxonomy subjects
  // for that class level, plus primary subject
  const searchSubjectSet = new Set<string>(taxonomySubjects);
  if (inputSubjects.length > 0) {
    inputSubjects.forEach((s) => {
      if (!cleanClassLevel) {
        expandSubjectAliases(s).forEach((alias) => searchSubjectSet.add(alias));
      } else {
        searchSubjectSet.add(s);
      }
    });
  }
  const querySubjectsList = Array.from(searchSubjectSet);

  // 2. Expand class levels without leaky "General"
  const expandedClassLevels = cleanClassLevel ? expandClassLevel(cleanClassLevel) : undefined;

  const andClauses: any[] = [{ user: { isActive: true } }];

  if (querySubjectsList.length > 0) {
    andClauses.push({ subjects: { hasSome: querySubjectsList } });
  }

  if (expandedClassLevels && expandedClassLevels.length > 0) {
    // A tutor matches if their classLevels has target tags OR they teach matching grade-specific subjects
    const subjectAlternatives =
      gradeSpecificTaxonomySubjects.length > 0 ? gradeSpecificTaxonomySubjects : taxonomySubjects;
    andClauses.push({
      OR: [
        { classLevels: { hasSome: expandedClassLevels } },
        ...(subjectAlternatives.length > 0 ? [{ subjects: { hasSome: subjectAlternatives } }] : []),
      ],
    });
  }

  if (mode && mode !== "EITHER") {
    andClauses.push({ teachingMode: { in: [mode, "EITHER"] } });
  }

  if (gender && gender !== "ANY" && gender !== "EITHER") {
    andClauses.push({ gender: { equals: gender, mode: "insensitive" } });
  }

  if (budgetMax && budgetMax < 99999) {
    andClauses.push({
      OR: [{ feeMin: { lte: budgetMax } }, { feeMin: null }],
    });
  }

  // City & Locality Filter
  if (city && city.trim()) {
    const loc = city.trim();
    const tokens = loc.split(/[,–-]/).map((t) => t.trim()).filter(Boolean);
    const primaryLoc = tokens[0] || loc;
    const widerMetro = getMetroName(loc);
    andClauses.push({
      OR: [
        { city: { contains: primaryLoc, mode: "insensitive" } },
        { address: { contains: primaryLoc, mode: "insensitive" } },
        { city: { contains: widerMetro, mode: "insensitive" } },
        { address: { contains: widerMetro, mode: "insensitive" } },
        { teachingMode: { in: ["ONLINE", "EITHER"] } },
      ],
    });
  }

  const where: any = { AND: andClauses };

  const profileSelect = {
    id: true,
    qualification: true,
    experience: true,
    subjects: true,
    classLevels: true,
    teachingMode: true,
    teachingRadius: true,
    latitude: true,
    longitude: true,
    feeMin: true,
    feeMax: true,
    city: true,
    state: true,
    address: true,
    gender: true,
    averageRating: true,
    totalReviews: true,
    isVerified: true,
    isFeatured: true,
    bio: true,
    profileScore: true,
    user: {
      select: { name: true, image: true },
    },
  };

  let profiles = await prisma.tutorProfile.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { profileScore: "desc" },
      { averageRating: "desc" },
    ],
    take: 60,
    select: profileSelect,
  });

  let total = await prisma.tutorProfile.count({ where });
  let isFallback = false;
  let fallbackReason: string | undefined = undefined;

  // 3. Coordinate Resolution & Distance Calculation
  const searchCoords = city ? resolveLocationCoordinates(city) : null;

  type ProfileWithDistance = (typeof profiles)[number] & {
    distanceKm: number | null;
    isOnlineMatch?: boolean;
  };

  const scoredProfiles: ProfileWithDistance[] = profiles.map((p) => {
    let tutorLat = p.latitude;
    let tutorLng = p.longitude;

    if ((tutorLat === null || tutorLng === null) && (p.address || p.city)) {
      const resolved = resolveLocationCoordinates(p.address || p.city);
      if (resolved) {
        tutorLat = resolved.lat;
        tutorLng = resolved.lng;
      }
    }

    let distanceKm: number | null = null;
    if (searchCoords && tutorLat !== null && tutorLng !== null) {
      distanceKm = Math.round(haversineDistanceKm(searchCoords.lat, searchCoords.lng, tutorLat, tutorLng) * 10) / 10;
    }

    const isOnline = p.teachingMode === "ONLINE" || p.teachingMode === "EITHER";

    return {
      ...p,
      distanceKm,
      isOnlineMatch: isOnline,
    };
  });

  // 4. Radius Filter Enforcement
  let filteredProfiles = scoredProfiles;
  if (radiusKm && radiusKm > 0 && searchCoords) {
    const strictlyWithinRadius = scoredProfiles.filter((p) => {
      return p.distanceKm !== null && p.distanceKm <= radiusKm;
    });

    if (strictlyWithinRadius.length > 0) {
      filteredProfiles = strictlyWithinRadius;
      total = strictlyWithinRadius.length;
    } else {
      // Grace fallback when 0 tutors are in strict local neighborhood
      isFallback = true;
      const sortedByDist = scoredProfiles
        .filter((p) => p.distanceKm !== null)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      const closestOffline = sortedByDist[0];
      const nearestKm = closestOffline?.distanceKm ? `${closestOffline.distanceKm} km` : "nearby";
      fallbackReason = `No home tutors found within ${radiusKm} km of ${city}. Showing nearest verified teachers in surrounding areas (closest is ${nearestKm} away).`;
      filteredProfiles = sortedByDist.length > 0 ? sortedByDist.slice(0, 10) : scoredProfiles.slice(0, 10);
      total = filteredProfiles.length;
    }
  }

  // 5. Ranking & Sorting
  const ranked = [...filteredProfiles].sort((a, b) => {
    // If user searched a location, sort by closest distance first
    if (searchCoords) {
      const distA = a.distanceKm !== null ? a.distanceKm : 999;
      const distB = b.distanceKm !== null ? b.distanceKm : 999;
      if (Math.abs(distA - distB) >= 2) {
        return distA - distB; // Closest tutors appear first!
      }
    }

    // Secondary: Subject overlap match score
    if (querySubjectsList.length > 0) {
      const overlapDelta =
        subjectMatchScore(b.subjects, querySubjectsList) - subjectMatchScore(a.subjects, querySubjectsList);
      if (overlapDelta !== 0) return overlapDelta;
    }

    // Tertiary: Featured & Profile score
    if (Number(b.isFeatured) !== Number(a.isFeatured)) return Number(b.isFeatured) - Number(a.isFeatured);
    if (b.profileScore !== a.profileScore) return b.profileScore - a.profileScore;
    return b.averageRating - a.averageRating;
  }).slice(0, 16);

  // 6. Format Tutor Results with Taxonomy-Derived Classes and Relevant Subjects
  const tutors: PublicTutorResult[] = ranked.map((p) => {
    const { displayClasses, displaySubjects } = inferTutorClassesAndSubjects(
      p.subjects,
      p.classLevels,
      primarySubject,
      cleanClassLevel
    );

    return {
      id: p.id,
      name: maskName(p.user.name),
      qualification: p.qualification ?? "",
      experience: p.experience ?? 0,
      subjects: p.subjects,
      classLevels: p.classLevels,
      teachingMode: p.teachingMode,
      teachingRadius: p.teachingRadius ?? 10,
      distanceKm: p.distanceKm,
      displayedClasses: displayClasses,
      displayedSubjects: displaySubjects,
      isOnlineMatch: p.isOnlineMatch,
      feeMin: p.feeMin,
      feeMax: p.feeMax,
      city: p.city,
      state: p.state,
      address: p.address,
      gender: p.gender,
      image: p.user.image,
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      isVerified: p.isVerified,
      isFeatured: p.isFeatured,
      bio: p.bio,
      profileScore: p.profileScore,
    };
  });

  return { tutors, total: filteredProfiles.length || total, isFallback, fallbackReason };
}

