import type { Metadata } from "next";
import { FindTutorWizard } from "@/components/find-tutor/FindTutorWizard";
import { PublicSiteHeader } from "@/components/home/PublicSiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Find Verified Tutors — ApnaTutorHub",
  description:
    "Tell us what you need and we'll find the best tutors for your subject, class, and location. 100% free. No sign-up needed to browse.",
  alternates: { canonical: "/find-tutor" },
};

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function FindTutorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {} as Record<string, string | string[] | undefined>;
  const initialSubject = firstParam(params.subject);
  const initialCity = firstParam(params.city);
  const initialClass = firstParam(params.classLevel);
  const session = await auth();
  const role = session?.user?.role;
  const dashboardHref =
    role === "PARENT"
      ? "/parent/dashboard"
      : role === "TUTOR"
        ? "/tutor/dashboard"
        : role === "SUPER_ADMIN" || role === "SUB_ADMIN"
          ? "/admin/dashboard"
          : undefined;

  const parentCtaUrl = role === "PARENT" ? "/parent/post-requirement" : dashboardHref || "/register";

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <PublicSiteHeader
        user={session?.user}
        dashboardUrl={dashboardHref}
        parentCtaUrl={parentCtaUrl}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <FindTutorWizard
          initialSubject={initialSubject}
          initialCity={initialCity}
          initialClassLevel={initialClass}
        />
      </main>
      <SiteFooter parentCtaUrl={parentCtaUrl} />
    </div>
  );
}
