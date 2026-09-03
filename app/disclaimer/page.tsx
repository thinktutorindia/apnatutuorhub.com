import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Disclaimer Policy",
  description:
    "ApnaTutorHub is a tutoring marketplace. Tutors are independent. We do not guarantee exam results, fees, or earnings.",
};

export default function DisclaimerPage() {
  return (
    <LegalPageShell
      badge="Important notice"
      title="Disclaimer Policy"
      summary="ApnaTutorHub matches parents with independent tutors. We are not a school, coaching centre, or employer of teachers."
      updated="September 3, 2026"
    >
      <LegalSection title="1. Marketplace, not a classroom">
        <p>
          ApnaTutorHub is an online marketplace. Parents post home-tuition or live-online requirements for free. KYC-verified tutors may unlock those enquiries using coins or a membership plan. Classes, fees, timing, and teaching quality are agreed between the parent and the tutor after a demo. We do not teach students ourselves and we do not employ tutors as staff teachers.
        </p>
      </LegalSection>

      <LegalSection title="2. Independent tutors">
        <p>
          Tutors on the platform work independently. Profile text, fees, availability, and claims about experience are provided by the tutor. KYC (identity and qualification review) reduces fake profiles; it is not a government licence, a board affiliation, or a guarantee that a teacher will raise a particular mark or rank.
        </p>
      </LegalSection>

      <LegalSection title="3. No result or earnings guarantee">
        <p>
          Board exams, JEE, NEET, and school grades depend on the student, the teacher, and many factors outside this website. We do not guarantee marks, ranks, admissions, or a tutor’s monthly income. Coin packs and memberships buy access to parent contact details, not a booked student.
        </p>
      </LegalSection>

      <LegalSection title="4. Information “as is”">
        <p>
          Public pages, city landing pages, and search results are provided to help you find a tutor. We try to keep them accurate, but listings, distances, and availability can change. We are not liable for decisions you make solely from website copy, including hiring or declining a tutor.
        </p>
      </LegalSection>

      <LegalSection title="5. Reviews and opinions">
        <p>
          Reviews and comments reflect the reviewer’s view, not an official ApnaTutorHub rating of a school board or exam. Testimonials, where shown, are not a promise that every family will have the same experience.
        </p>
      </LegalSection>

      <LegalSection title="6. Related terms">
        <p>
          Lead unlocks, membership quotas, the 48-hour unreachable-number coin refund, and tutor conduct are governed by the{" "}
          <Link href="/terms" className="font-700 text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>{" "}
          and the{" "}
          <Link href="/membership-policy" className="font-700 text-[#2D9E6B] hover:underline">
            Tutor Membership Policy
          </Link>
          .
        </p>
        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I have a question about the disclaimer.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-[#2D9E6B] px-4 py-2 text-xs font-800 !text-white hover:bg-[#238357]"
        >
          WhatsApp {SUPPORT_PHONE_DISPLAY}
        </a>
      </LegalSection>
    </LegalPageShell>
  );
}
