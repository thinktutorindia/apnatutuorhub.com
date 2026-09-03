import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Tutor Membership Policy",
  description:
    "How tutor coins, membership plans, lead unlocks, KYC, and the 48-hour unreachable-number refund work on ApnaTutorHub.",
};

export default function MembershipPolicyPage() {
  return (
    <LegalPageShell
      badge="For tutors"
      title="Tutor Membership Policy"
      summary="Parents post requirements free. Tutors complete KYC, then use wallet coins or a paid plan to unlock parent contact details. This page summarises paid access; the full legal terms live on Terms of Service."
      updated="September 3, 2026"
    >
      <LegalSection title="1. Who pays for what">
        <p>
          Posting a tuition requirement is free for parents. Tutors create an account free of charge, submit identity and qualification documents for KYC, and only pay when they choose to unlock a lead or buy a membership. We are a marketplace: coins and plans buy access to verified parent enquiries, not a guaranteed student or a salary.
        </p>
      </LegalSection>

      <LegalSection title="2. KYC before paid unlocks">
        <p>
          Tutors must upload address/ID proof (typically Aadhaar or another government ID) and educational qualification documents. Profiles stay private until review. Providing false documents, a fake phone number, or another person’s identity can lead to account closure and forfeiture of unused coins or plan time.
        </p>
      </LegalSection>

      <LegalSection title="3. Coins and membership plans">
        <p>
          Wallet coins can be used one lead at a time. Membership plans (Bronze, Silver, Gold, Platinum) include a lead allowance, a validity period, and a competition cap (how many tutors may unlock the same enquiry). Current prices, lead counts, and exclusivity rules are listed on the{" "}
          <Link href="/terms" className="font-700 text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>{" "}
          and on the in-app plans page. Payments go through Razorpay. Do not pay a third party who claims to “top up” your wallet.
        </p>
      </LegalSection>

      <LegalSection title="4. What a lead unlock includes">
        <p>
          An unlock shows the parent’s registered contact so you can call or message about a demo. It does not guarantee that the parent will hire you, attend a demo, or continue classes. Tuition fees are agreed between you and the family, not paid to ApnaTutorHub as the teacher’s salary.
        </p>
      </LegalSection>

      <LegalSection title="5. Refunds and replacements">
        <p>
          Unused membership time and coin packs are generally not refundable after purchase, except where Indian consumer law requires otherwise or where our lead-protection rules apply. If a parent number is wrong or permanently unreachable, report the lead within 48 hours for a coin refund or replacement credit after support verifies it. Duplicate posts and requirements withdrawn after unlock are also eligible for credit once checked. Details are in section 5 of the{" "}
          <Link href="/terms" className="font-700 text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Conduct">
        <p>
          Be punctual for demos, dress and speak professionally at a student’s home, and do not share parent numbers with other tutors or agencies. Do not solicit school or college admissions fees, or use the platform for anything other than genuine tutoring. Harassment or misrepresentation of qualifications ends the account.
        </p>
      </LegalSection>

      <LegalSection title="7. Account security and changes">
        <p>
          You are responsible for activity under your login. We may pause or close accounts that break these rules. We may update this policy; the date above will change. Using paid features after an update means you accept the new version.
        </p>
        <p>
          Full lead-delivery, competition caps, and Platinum solo-lock rules:{" "}
          <Link href="/terms" className="font-700 text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>
          . Questions: WhatsApp {SUPPORT_PHONE_DISPLAY}.
        </p>
        <a
          href={getWhatsAppSupportLink(
            "Hi ApnaTutorHub Support, I have a question about tutor membership and leads."
          )}
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
