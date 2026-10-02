/**
 * Full silent screen walkthroughs (no mic). Run:
 *   node scripts/walkthrough/record_silent_walkthroughs.mjs
 *   set WALKTHROUGH_ONLY=01 && node scripts/walkthrough/record_silent_walkthroughs.mjs
 *   set WALKTHROUGH_SKIP=02,05,06 && node scripts/walkthrough/record_silent_walkthroughs.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.WALKTHROUGH_BASE_URL || "https://www.apnatutorhub.com";
const OUT = path.join(process.cwd(), "public", "video-walkthrough");
const PASS = "Rohit@2927";
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const prefixed = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (prefixed) return prefixed.slice(flag.length + 1);
  return "";
}

const onlyCli = argValue("--only");
const skipCli = argValue("--skip");
const ONLY = onlyCli || (skipCli ? "" : process.env.WALKTHROUGH_ONLY || "");
const SKIP = new Set(
  (skipCli || process.env.WALKTHROUGH_SKIP || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const pause = (page, ms) => page.waitForTimeout(ms);

async function slowScroll(page, totalPx, stepPx = 280, delayMs = 700) {
  const steps = Math.ceil(totalPx / stepPx);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepPx);
    await pause(page, delayMs);
  }
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(page, 800);
}

async function tourPages(page, routes, dwellMs = 3500) {
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await pause(page, dwellMs);
    await slowScroll(page, 1400, 300, 650);
    await scrollToTop(page);
    await pause(page, 1500);
  }
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await pause(page, 1200);
  await page.getByRole("textbox", { name: /email or mobile/i }).fill(email);
  await page.getByRole("textbox", { name: /^password$/i }).fill(PASS);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60000 });
  await pause(page, 1500);
}

async function fullUnlockLeadsFlow(page) {
  await page.goto(`${BASE}/tutor/wallet`, { waitUntil: "networkidle" });
  await pause(page, 3500);
  await slowScroll(page, 600);

  await page.goto(`${BASE}/tutor/leads`, { waitUntil: "networkidle" });
  await pause(page, 4000);
  await scrollToTop(page);
  await pause(page, 2000);

  const tabs = ["Matched", "Nearby", "All", "Unlocked"];
  for (const label of tabs) {
    const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await pause(page, 2500);
      await slowScroll(page, 1200, 250, 600);
      await scrollToTop(page);
    }
  }

  await page.getByRole("button", { name: /matched/i }).first().click().catch(() => {});
  await pause(page, 2000);

  const subjectSelect = page.locator("select").first();
  if (await subjectSelect.isVisible().catch(() => false)) {
    await subjectSelect.selectOption({ index: 1 }).catch(() => {});
    await pause(page, 2000);
    await subjectSelect.selectOption({ index: 0 }).catch(() => {});
    await pause(page, 1500);
  }

  await slowScroll(page, 1600, 300, 800);

  const unlockBtn = page
    .getByRole("button", { name: /unlock parent contact|unlock \(\d+ coins\)|unlock via/i })
    .first();

  if (await unlockBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await unlockBtn.scrollIntoViewIfNeeded();
    await pause(page, 2000);
    await unlockBtn.click();
    await pause(page, 3500);

    const confirm = page.getByRole("button", { name: /confirm unlock/i });
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      await pause(page, 4000);
      await confirm.click();
      await pause(page, 5000);
    }

    const success = page.getByText(/lead unlocked successfully/i);
    if (await success.isVisible({ timeout: 10000 }).catch(() => false)) {
      await pause(page, 5000);
    }
  }

  await page.keyboard.press("Escape").catch(() => {});
  await pause(page, 1000);

  const unlockedTab = page.getByRole("button", { name: /unlocked leads/i }).first();
  if (await unlockedTab.isVisible().catch(() => false)) {
    await unlockedTab.click();
    await pause(page, 3000);
    await slowScroll(page, 1400, 280, 700);
  }

  await scrollToTop(page);
  await pause(page, 2000);
  await slowScroll(page, 1000, 320, 900);
  await pause(page, 3000);
}

async function tutorRegistrationOnboarding(page) {
  await page.goto(`${BASE}/register?role=tutor`, { waitUntil: "networkidle" });
  await pause(page, 4000);
  await slowScroll(page, 1800, 320, 750);
  await scrollToTop(page);
  await pause(page, 2500);

  await login(page, "tutor.kyc@apnatutorhub.com");
  await tourPages(page, ["/tutor/onboarding", "/tutor/profile"], 4000);
}

async function tutorSearchFilterLeads(page) {
  await page.goto(`${BASE}/tutor/leads`, { waitUntil: "networkidle" });
  await pause(page, 4000);
  await scrollToTop(page);

  for (const label of ["Nearby", "All", "Matched"]) {
    const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await pause(page, 2800);
    }
  }

  const selects = page.locator("select");
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 4); i++) {
    const sel = selects.nth(i);
    if (await sel.isVisible().catch(() => false)) {
      await sel.selectOption({ index: 1 }).catch(() => {});
      await pause(page, 2200);
      await sel.selectOption({ index: 0 }).catch(() => {});
      await pause(page, 1800);
    }
  }

  await slowScroll(page, 2000, 280, 700);
  await scrollToTop(page);
  await pause(page, 3000);
}

async function tutorManageProposals(page) {
  await page.goto(`${BASE}/tutor/leads`, { waitUntil: "networkidle" });
  await pause(page, 3500);

  const shortlisted = page.getByRole("button", { name: /shortlisted/i }).first();
  if (await shortlisted.isVisible().catch(() => false)) {
    await shortlisted.click();
    await pause(page, 3000);
    await slowScroll(page, 1200);
  }

  const unlockedTab = page.getByRole("button", { name: /unlocked/i }).first();
  if (await unlockedTab.isVisible().catch(() => false)) {
    await unlockedTab.click();
    await pause(page, 2800);
  }

  const unlockBtn = page
    .getByRole("button", { name: /unlock parent contact|unlock \(\d+ coins\)|view contact/i })
    .first();
  if (await unlockBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await unlockBtn.scrollIntoViewIfNeeded();
    await pause(page, 2000);
    await unlockBtn.click().catch(() => {});
    await pause(page, 4500);
    await page.keyboard.press("Escape").catch(() => {});
    await pause(page, 1000);
  }

  await tourPages(page, ["/tutor/bookings", "/tutor/wallet", "/tutor/plans"], 3200);
}

async function fullTutorDashboard(page) {
  await page.goto(`${BASE}/tutor/dashboard`, { waitUntil: "networkidle" });
  await pause(page, 3500);
  await slowScroll(page, 2000, 350, 800);
  await scrollToTop(page);
  await pause(page, 2500);
  await page.goto(`${BASE}/tutor/leads`, { waitUntil: "networkidle" });
  await pause(page, 2500);
  await slowScroll(page, 800);
}

async function fullParentPostRequirement(page) {
  await page.goto(`${BASE}/parent/dashboard`, { waitUntil: "networkidle" });
  await pause(page, 3500);
  await slowScroll(page, 1600, 350, 800);

  await page.goto(`${BASE}/parent/post-requirement`, { waitUntil: "networkidle" });
  await pause(page, 4000);
  await slowScroll(page, 2000, 320, 700);
  await scrollToTop(page);
  await pause(page, 2500);

  await page.goto(`${BASE}/parent/my-leads`, { waitUntil: "networkidle" });
  await pause(page, 4000);
  await slowScroll(page, 1400);
  await pause(page, 2500);
}

async function parentReviewApplications(page) {
  await page.goto(`${BASE}/parent/my-leads`, { waitUntil: "networkidle" });
  await pause(page, 4000);

  const leadLink = page.getByRole("link").filter({ hasText: /554914|requirement|view/i }).first();
  if (await leadLink.isVisible().catch(() => false)) {
    await leadLink.click();
    await pause(page, 3500);
  } else {
    const anyLead = page.locator("a[href*='/parent/my-leads/']").first();
    if (await anyLead.isVisible().catch(() => false)) {
      await anyLead.click();
      await pause(page, 3500);
    }
  }

  await page.goto(`${BASE}/parent/my-leads`, { waitUntil: "networkidle" });
  await pause(page, 2000);
  const applicants = page.locator("a[href*='/applicants']").first();
  if (await applicants.isVisible().catch(() => false)) {
    await applicants.click();
    await pause(page, 4500);
    await slowScroll(page, 1600, 300, 700);
  }

  await tourPages(page, ["/parent/bookings", "/parent/profile"], 3200);
}

async function adminDashboardOverview(page) {
  await tourPages(
    page,
    ["/admin/dashboard", "/admin", "/admin/search"],
    4000,
  );
}

async function adminUserManagement(page) {
  await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
  await pause(page, 4500);
  await slowScroll(page, 1600);

  for (const label of [/parent/i, /tutor/i, /all/i]) {
    const tab = page.getByRole("tab", { name: label }).or(page.getByRole("button", { name: label })).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await pause(page, 2800);
      await slowScroll(page, 800, 280, 600);
    }
  }

  await scrollToTop(page);
  await pause(page, 2500);
}

async function adminLeadsManagement(page) {
  await tourPages(page, ["/admin/leads", "/admin/bookings"], 4200);
}

async function adminKyc(page) {
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: "networkidle" });
  await pause(page, 4500);
  await slowScroll(page, 1400);

  const pendingRow = page.getByText(/tutor\.kyc|pending/i).first();
  if (await pendingRow.isVisible().catch(() => false)) {
    await pendingRow.click();
    await pause(page, 4000);
    await slowScroll(page, 1000);
  }

  const viewBtn = page.getByRole("button", { name: /view|review|open/i }).first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
    await pause(page, 4500);
    await page.keyboard.press("Escape").catch(() => {});
  }

  await pause(page, 3000);
}

async function adminPayments(page) {
  await tourPages(page, ["/admin/wallets", "/admin/coupons"], 4000);
}

async function adminSubAdmins(page) {
  await tourPages(page, ["/admin/sub-admins", "/admin/sub-admins/analytics"], 4000);
}

async function adminAnalytics(page) {
  await tourPages(page, ["/admin/analytics", "/admin/audit-logs"], 4200);
}

async function adminSettings(page) {
  await tourPages(page, ["/admin/settings", "/admin/notifications"], 4000);
}

async function troubleshootingAllRoles(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pause(page, 2500);
  const forgot = page.getByRole("link", { name: /forgot password/i });
  if (await forgot.isVisible().catch(() => false)) {
    await forgot.click();
    await pause(page, 3500);
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await pause(page, 1500);
  }

  await login(page, "tutor.kyc@apnatutorhub.com");
  await tourPages(page, ["/tutor/profile", "/tutor/help"], 3500);

  await login(page, "tutor.demo@apnatutorhub.com");
  await page.goto(`${BASE}/tutor/leads`, { waitUntil: "networkidle" });
  await pause(page, 3000);

  await login(page, "parent.demo@apnatutorhub.com");
  await page.goto(`${BASE}/parent/my-leads`, { waitUntil: "networkidle" });
  await pause(page, 3500);
  await slowScroll(page, 1000);

  await login(page, "coderrohit2927@gmail.com");
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: "networkidle" });
  await pause(page, 3500);
}

const JOBS = [
  {
    id: "01",
    file: "01_Tutor_Registration_Onboarding.webm",
    email: null,
    steps: tutorRegistrationOnboarding,
  },
  {
    id: "02",
    file: "02_Tutor_How_to_Unlock_Leads.webm",
    email: "tutor.demo@apnatutorhub.com",
    steps: fullUnlockLeadsFlow,
  },
  {
    id: "03",
    file: "03_Tutor_Search_Filter_Leads.webm",
    email: "tutor.demo@apnatutorhub.com",
    steps: tutorSearchFilterLeads,
  },
  {
    id: "04",
    file: "04_Tutor_Manage_Proposals.webm",
    email: "tutor.demo@apnatutorhub.com",
    steps: tutorManageProposals,
  },
  {
    id: "05",
    file: "05_Tutor_Dashboard.webm",
    email: "tutor.demo@apnatutorhub.com",
    steps: fullTutorDashboard,
  },
  {
    id: "06",
    file: "06_Parent_Dashboard.webm",
    email: "parent.demo@apnatutorhub.com",
    steps: fullParentPostRequirement,
  },
  {
    id: "07",
    file: "07_Parent_Review_Tutor_Applications.webm",
    email: "parent.demo@apnatutorhub.com",
    steps: parentReviewApplications,
  },
  {
    id: "08",
    file: "08_Admin_Dashboard_Overview.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminDashboardOverview,
  },
  {
    id: "09",
    file: "09_Admin_User_Management.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminUserManagement,
  },
  {
    id: "10",
    file: "10_Admin_Requirements_Leads_Management.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminLeadsManagement,
  },
  {
    id: "11",
    file: "11_Admin_Verification_KYC_Management.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminKyc,
  },
  {
    id: "12",
    file: "12_Admin_Payments_Transactions.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminPayments,
  },
  {
    id: "13",
    file: "13_Admin_Sub_Admins_Moderators.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminSubAdmins,
  },
  {
    id: "14",
    file: "14_Admin_Analytics_Reports.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminAnalytics,
  },
  {
    id: "15",
    file: "15_Admin_Settings_Configuration.webm",
    email: "coderrohit2927@gmail.com",
    steps: adminSettings,
  },
  {
    id: "16",
    file: "16_Troubleshooting_Common_Issues.webm",
    email: null,
    steps: troubleshootingAllRoles,
  },
];

async function finalizeRecording(dir, dest) {
  await new Promise((r) => setTimeout(r, 1200));
  const webm = fs.readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (!webm) return false;
  const src = path.join(dir, webm);
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      if (attempt === 9) throw e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  return false;
}

async function recordJob(browser, job) {
  const dir = path.join(OUT, "tmp", job.file.replace(".webm", ""));
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  try {
    if (job.email) {
      await login(page, job.email);
    }
    await job.steps(page);
  } catch (err) {
    console.error(`[${job.file}] failed:`, err instanceof Error ? err.message : err);
  }
  await pause(page, 2000);
  const dest = path.join(OUT, job.file);
  await context.close();
  if (await finalizeRecording(dir, dest)) {
    const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(`Wrote ${dest} (${mb} MB)`);
  } else {
    console.warn(`[${job.file}] no WebM captured in ${dir}`);
  }
}

fs.mkdirSync(OUT, { recursive: true });

let jobs = JOBS;
if (ONLY) {
  jobs = JOBS.filter((j) => j.id === ONLY || j.file.includes(ONLY));
} else if (SKIP.size) {
  jobs = JOBS.filter((j) => !SKIP.has(j.id));
}

console.log(`Queue (${jobs.length}): ${jobs.map((j) => j.id).join(", ")}`);

const browser = await chromium.launch({ headless: true });
for (const job of jobs) {
  console.log(`Recording ${job.id} → ${job.file}…`);
  try {
    await recordJob(browser, job);
  } catch (err) {
    console.error(`[${job.file}] record failed:`, err instanceof Error ? err.message : err);
  }
}
await browser.close();
console.log(`Done — ${jobs.length} silent WebM(s).`);
