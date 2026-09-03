import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Cookie Policy",
  description:
    "How ApnaTutorHub uses essential sign-in cookies, optional analytics, and payment cookies on the tutoring marketplace.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      badge="Website cookies"
      title="Cookie Policy"
      summary="We use cookies so you can stay signed in, keep the marketplace secure, and (optionally) help us improve public pages. We do not sell cookie data."
      updated="September 3, 2026"
    >
      <LegalSection title="1. What cookies are">
        <p>
          Cookies are small files stored on your browser. Some are required for ApnaTutorHub to work (for example staying logged in). Others are optional and help us understand which public pages are useful.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies we use">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-[#0F2540]">Essential (first-party).</strong> Auth.js session cookies keep parents, tutors, and staff signed in and protect account security. Without these, login, posting a requirement, unlocking a lead, and chat will not work.
          </li>
          <li>
            <strong className="text-[#0F2540]">Optional analytics.</strong> If product analytics is enabled, PostHog may set cookies on public pages to measure visits and improve the product. Session recordings, when used, mask input fields so passwords are not captured.
          </li>
          <li>
            <strong className="text-[#0F2540]">Payments.</strong> When a tutor buys coins or a membership, Razorpay may set cookies on the checkout flow. Card details are processed by Razorpay, not stored on our servers.
          </li>
        </ul>
        <p>
          We do not run advertising networks or sell cookie identifiers to data brokers.
        </p>
      </LegalSection>

      <LegalSection title="3. Your choices">
        <p>
          You can delete existing cookies and block new ones in your browser settings. If you block essential cookies, you will need to sign in again and some features will stop working. Blocking analytics cookies does not stop you from posting a requirement or browsing tutors.
        </p>
        <p>
          How we use account data (not just cookies) is explained in the{" "}
          <Link href="/privacy" className="font-700 text-[#2D9E6B] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Changes">
        <p>
          We may update this policy when we add a processor or change how sign-in works. The “Last updated” date at the top will change. Continued use of ApnaTutorHub after an update means you accept the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>
          Questions about cookies: WhatsApp {SUPPORT_PHONE_DISPLAY} or email support@apnatutorhub.com.
        </p>
        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I have a question about cookies.")}
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
