import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllowedSubAdminModules } from "@/lib/rbac";

export default async function AdminRootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "SUB_ADMIN") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subAdminRole: true, customPermissions: true },
    });

    const allowed = getAllowedSubAdminModules({
      role: "SUB_ADMIN",
      subAdminRole: dbUser?.subAdminRole ?? session.user.subAdminRole,
      customPermissions: dbUser?.customPermissions ?? session.user.customPermissions,
    });

    if (allowed.includes("/admin/dashboard")) {
      redirect("/admin/dashboard");
    } else if (allowed.includes("/admin/staff-leads/my-leads")) {
      redirect("/admin/staff-leads/my-leads");
    } else if (allowed.includes("/admin/users")) {
      redirect("/admin/users");
    } else if (allowed.length > 0) {
      redirect(allowed[0]);
    }
  }

  redirect("/admin/dashboard");
}
