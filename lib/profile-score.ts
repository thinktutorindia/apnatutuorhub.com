import type { TutorProfile, TutorAvailability } from "@prisma/client";

type ScoredProfile = Pick<
  TutorProfile,
  | "bio"
  | "qualification"
  | "experience"
  | "subjects"
  | "classLevels"
  | "feeMin"
  | "feeMax"
  | "city"
  | "latitude"
  | "introVideoUrl"
  | "kycStatus"
  | "isVerified"
> & {
  availability?: TutorAvailability[];
};

export type ProfileScoreBreakdown = {
  total: number;        // 0–100
  kyc: number;          // 0 or 40
  subjects: number;     // 0–15
  classLevels: number;  // 0–10
  bio: number;          // 0 or 10
  fees: number;         // 0 or 5
  location: number;     // 0 or 5
  availability: number; // 0 or 10
  introVideo: number;   // 0 or 5
};

/**
 * 0-to-100 profile completion score used in:
 *  - "Profile Completion" ring on the tutor dashboard
 *  - Matching engine ranking (+100 pts for 100% completion)
 *  - KYC alert trigger
 */
export function calcProfileScore(profile: ScoredProfile): ProfileScoreBreakdown {
  const kyc = profile.kycStatus === "APPROVED" ? 40 : 0;
  // 3+ subjects = 15 pts
  const subjects = profile.subjects.length >= 3 ? 15 : profile.subjects.length * 5;
  // 2+ class levels = 10 pts
  const classLevels = profile.classLevels.length >= 2 ? 10 : profile.classLevels.length * 5;
  // bio >= 20 chars = 10 pts
  const bio = profile.bio && profile.bio.trim().length >= 20 ? 10 : 0;
  // feeMin or feeMax set = 5 pts
  const fees = profile.feeMin != null || profile.feeMax != null ? 5 : 0;
  // city set = 5 pts
  const location = profile.city && profile.city.trim().length > 0 ? 5 : 0;
  // 3+ availability slots = 10 pts
  const availability = (profile.availability?.length ?? 0) >= 3 ? 10 : 0;
  // intro video set = 5 pts
  const introVideo = profile.introVideoUrl && profile.introVideoUrl.trim().length > 0 ? 5 : 0;

  const total = Math.min(
    100,
    kyc + subjects + classLevels + bio + fees + location + availability + introVideo
  );

  return { total, kyc, subjects, classLevels, bio, fees, location, availability, introVideo };
}

/** Returns just the 0-to-100 total without the breakdown object. */
export function getProfileScore(profile: ScoredProfile): number {
  return calcProfileScore(profile).total;
}
