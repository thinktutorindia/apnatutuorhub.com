import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Copyright Policy",
  description:
    "Who owns ApnaTutorHub website content, tutor profile material, and how to report infringement.",
};

export default function CopyrightPage() {
  return (
    <LegalPageShell
      badge="Intellectual property"
      title="Copyright Policy"
      summary="The ApnaTutorHub site design and product copy belong to us. Tutor bios, photos, and teaching materials belong to the tutor who uploaded them, unless stated otherwise."
      updated="September 3, 2026"
    >
      <LegalSection title="1. What we own">
        <p>
          The ApnaTutorHub name, logo, layout, software, and original website copy are protected. You may not copy, scrape, frame, or republish substantial parts of the site for a competing directory or marketplace without written permission.
        </p>
      </LegalSection>

      <LegalSection title="2. What tutors and parents own">
        <p>
          Tutors keep rights in the photos, bios, and documents they upload for KYC and profiles. Parents keep rights in the requirement text they post. By uploading, you grant ApnaTutorHub a licence to display that content on the marketplace so matching, KYC, and support can work.
        </p>
      </LegalSection>

      <LegalSection title="3. Respect others’ work">
        <p>
          Do not upload another teacher’s notes, a publisher’s textbook scans, or a third party’s photos as if they were yours. Repeat infringement can lead to profile removal and loss of unused coins or membership time, as described in the{" "}
          <Link href="/terms" className="font-700 text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. How to report infringement">
        <p>
          If you believe material on ApnaTutorHub uses your copyrighted work without permission, WhatsApp us from a number we can call back. Include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your name and a way to reach you</li>
          <li>A description of the work you own</li>
          <li>The URL or profile where the material appears</li>
          <li>A statement that you are the owner or an authorised agent</li>
        </ul>
        <p>
          We will review complete reports and may remove or restrict the material. Incomplete reports may receive no action. This process does not replace legal advice.
        </p>
        <a
          href={getWhatsAppSupportLink(
            "Hi ApnaTutorHub Support, I want to report a copyright issue on the site."
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
