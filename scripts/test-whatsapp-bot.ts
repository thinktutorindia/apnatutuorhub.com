/**
 * scripts/test-whatsapp-bot.ts
 *
 * Automated regression test suite for the ApnaTutorHub WhatsApp chatbot.
 * Verifies:
 *  1. Strictly English-only responses (zero Devanagari, zero Hinglish copy, zero LANG_SELECT).
 *  2. Strict email validation (valid domains only; rejects typos, placeholders, random strings).
 *  3. Strict education taxonomy:
 *     - Pre-Primary & Classes 1-8: ONLY "All Subjects for Pre-Primary" / "All Subjects for Class 1..8"
 *     - Classes 9-10: school board subjects ONLY (Physics/Chem/Bio fold to Science; no All Subjects)
 *     - Classes 11-12: stream subjects + class ONLY (no All Subjects, no generic Science/Social Science)
 *     - Multi-clause mixed inputs ("Biology 10 - 12. 1-5 all sub.")
 *  4. Persona understanding ("No thodi hindi thodi English", "Like on the app?",
 *     "I'm comfortable", "Lead as a tutor", "M beleive kaise kru", etc.).
 *  5. End-to-end engine state transitions without LANG_SELECT regressions.
 *
 * Run: npm run test:bot
 */

import assert from "node:assert/strict";
import {
  validateStrictEmail,
  isStrictValidEmail,
  extractStrictEmail,
  isPlaceholderEmail,
  extractStrictClasses,
  enforceStrictEducation,
  sanitizeEducationForDb,
} from "../lib/whatsapp-bot/strict-rules";
import { resolvePersonaPrecheck } from "../lib/whatsapp-bot/persona-understanding";
import { validateAndCleanLocality } from "../lib/whatsapp-bot/subject-rules";
import { expandTutorSubjectsAndClasses } from "../lib/whatsapp-bot/auto-register";
import { assessIntake, sealLeadEntry } from "../lib/whatsapp-bot/intake";
import { MSG, SPECIAL_COMMANDS } from "../lib/whatsapp-bot/messages";
import { processMessage } from "../lib/whatsapp-bot/engine";
import { type BotSession } from "../lib/whatsapp-bot/session";
import { sanitizeAiBotResponse, containsHindiOrHinglishSlip } from "../lib/whatsapp-bot/ai-agent";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const HINGLISH_REPLY_RE =
  /\b(kaunsi class|aapka|apna|batayein|bhejein|chahiye|theek hai|samajh gayi|samajh gaya|namaste|dhanyavaad|kripya|padhate ho|padhate hain|taiyaar ho gayi|note ho gay|save ho gay)\b/i;

function assertEnglishOnly(text: string, label: string) {
  assert.equal(DEVANAGARI_RE.test(text), false, `[${label}] Reply must not contain Devanagari script: ${text}`);
  assert.equal(HINGLISH_REPLY_RE.test(text), false, `[${label}] Reply must not contain Hinglish phrases: ${text}`);
}

function makeSession(overrides: Partial<BotSession> = {}): BotSession {
  return {
    id: "test-session",
    phone: "919000000099",
    userType: null,
    step: "WELCOME",
    data: { lang: "en" },
    retries: 0,
    isIdle: false,
    ...overrides,
  };
}

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    await fn();
    passed += 1;
    console.log(`  PASS: ${name}`);
  };
}

const tests = [
  // ── 1. English-only MSG & Command checks ──────────────────────────────────
  test("MSG constants are strictly English with zero LANG_SELECT", () => {
    assert.equal("LANG_PROMPT" in MSG, false);
    assert.equal("WELCOME_HI" in MSG, false);
    assert.equal(SPECIAL_COMMANDS.includes("LANG"), false);
    assertEnglishOnly(MSG.WELCOME, "MSG.WELCOME");
    assertEnglishOnly(MSG.CANCEL, "MSG.CANCEL");
    assertEnglishOnly(MSG.UNKNOWN, "MSG.UNKNOWN");
  }),

  // ── 2. Strict Email Validation ────────────────────────────────────────────
  test("Email firewall accepts valid real emails", () => {
    for (const em of [
      "tutor2@example.invalid",
      "tutor4@example.invalid",
      "tutor5@example.invalid",
      "tutor6@example.invalid",
      "tutor7@example.invalid",
    ]) {
      assert.equal(isStrictValidEmail(em), true, `Expected valid email: ${em}`);
    }
    assert.equal(
      extractStrictEmail("My email is Teacher.Rohit99@Gmail.Com please update"),
      "tutor3@example.invalid"
    );
  }),

  test("Email firewall rejects random words, placeholders, and domain/TLD typos", () => {
    for (const bad of [
      "hello",
      "available",
      "not available",
      "rohit@",
      "wa.9000000000@apnatutorhub.com",
      "wa_9000000000@apnatutorhub.internal",
      "test@example.com",
      "fake@mailinator.com",
      "rahul@gmal.com",
      "priya@gamil.com",
      "amit@yahooo.com",
      "neha@gmail.gom",
      "ankit@gmail.con",
      "a@gmail.com",
    ]) {
      assert.equal(isStrictValidEmail(bad), false, `Expected invalid email: ${bad}`);
      assertEnglishOnly(validateStrictEmail(bad).ok ? "" : validateStrictEmail(bad).reason, `email error ${bad}`);
    }
    assert.equal(isPlaceholderEmail("wa.9811111111@apnatutorhub.com"), true);
    assert.equal(isPlaceholderEmail("tutor8@example.invalid"), false);
  }),

  // ── 3. Strict Class & Subject Taxonomy ────────────────────────────────────
  test("Classes 1-8 enforce All Subjects ONLY (never individual subjects)", () => {
    const res = enforceStrictEducation({
      rawMessage: "Maths, Science and English for 1 to 8 class",
    });
    assert.equal(res.ok, true);
    assert.equal(res.classLevels.length, 8);
    assert.deepEqual(res.subjects, [
      "All Subjects for Class 1",
      "All Subjects for Class 2",
      "All Subjects for Class 3",
      "All Subjects for Class 4",
      "All Subjects for Class 5",
      "All Subjects for Class 6",
      "All Subjects for Class 7",
      "All Subjects for Class 8",
    ]);
    assert.equal(res.subjects.some((s) => /math|science|english|physics/i.test(s)), false);
  }),

  test("Pre-Primary to Class 3 maps to Pre-Primary + Class 1..3 All Subjects", () => {
    const res = enforceStrictEducation({ rawMessage: "Nursery to class 3" });
    assert.equal(res.ok, true);
    assert.deepEqual(res.classLevels, ["Pre-Primary (Nursery/KG)", "Class 1", "Class 2", "Class 3"]);
    assert.deepEqual(res.subjects, [
      "All Subjects for Pre-Primary",
      "All Subjects for Class 1",
      "All Subjects for Class 2",
      "All Subjects for Class 3",
    ]);
  }),

  test("Senior-only subject on Classes 1-8 alone is blocked with English guidance", () => {
    const res = enforceStrictEducation({ rawMessage: "Physics for Class 5" });
    assert.equal(res.ok, false);
    assert.equal(res.incompatibleSeniorOnlyForJunior, true);
    assert.ok(res.errorPrompt);
    assertEnglishOnly(res.errorPrompt!, "Physics Class 5");
  }),

  test("Classes 9-10 fold Physics/Chemistry/Biology to Science & Humanities to Social Science; reject All Subjects", () => {
    const folded = enforceStrictEducation({
      rawMessage: "Physics, Chemistry, Biology, History, Maths for Class 9 and 10",
    });
    assert.equal(folded.ok, true);
    assert.deepEqual(folded.classLevels, ["Class 9", "Class 10"]);
    assert.equal(folded.subjects.includes("Science for Class IX"), true);
    assert.equal(folded.subjects.includes("Science for Class X"), true);
    assert.equal(folded.subjects.includes("Social Science for Class IX"), true);
    assert.equal(folded.subjects.includes("Social Science for Class X"), true);
    assert.equal(folded.subjects.includes("Mathematics for Class IX"), true);
    assert.equal(folded.subjects.includes("Mathematics for Class X"), true);
    assert.equal(folded.subjects.some((s) => /physics|chemistry|biology|history|all subjects/i.test(s)), false);

    const all910 = enforceStrictEducation({ rawMessage: "All subjects for Class 9-10" });
    assert.equal(all910.ok, false);
    assert.equal(all910.needsSpecificSubjectsFor9to12, true);
    assertEnglishOnly(all910.errorPrompt || "", "All subjects 9-10");
  }),

  test("Classes 11-12 store exact stream subjects + class ONLY and reject All Subjects / generic Science", () => {
    const good = enforceStrictEducation({
      rawMessage: "Chemistry, Accountancy, Mathematics for Class 11 and 12",
    });
    assert.equal(good.ok, true);
    assert.deepEqual(good.subjects, [
      "Accountancy for Class XI",
      "Mathematics for Class XI",
      "Chemistry for Class XI",
      "Accountancy for Class XII",
      "Mathematics for Class XII",
      "Chemistry for Class XII",
    ]);

    const badAll = enforceStrictEducation({ rawMessage: "All subjects for Class 11-12" });
    assert.equal(badAll.ok, false);
    assert.equal(badAll.needsSpecificSubjectsFor9to12, true);
    assertEnglishOnly(badAll.errorPrompt || "", "All subjects 11-12");

    const badSci = enforceStrictEducation({ rawMessage: "Science for Class 12" });
    assert.equal(badSci.ok, false);
    assert.equal(badSci.needsSpecificSubjectsFor9to12, true);
  }),

  test('Multi-clause "Biology 10 - 12. 1-5 all sub." handles each band strictly', () => {
    const multi = enforceStrictEducation({ rawMessage: "Biology 10 - 12. 1-5 all sub." });
    assert.equal(multi.ok, true);
    assert.deepEqual(multi.classLevels, [
      "Class 1",
      "Class 2",
      "Class 3",
      "Class 4",
      "Class 5",
      "Class 10",
      "Class 11",
      "Class 12",
    ]);
    assert.equal(multi.subjects.includes("All Subjects for Class 1"), true);
    assert.equal(multi.subjects.includes("All Subjects for Class 5"), true);
    assert.equal(multi.subjects.includes("Science for Class X"), true);
    assert.equal(multi.subjects.includes("Biology for Class XI"), true);
    assert.equal(multi.subjects.includes("Biology for Class XII"), true);
    assert.equal(multi.subjects.some((s) => /biology.*class [1-5x]\b/i.test(s)), false);
  }),

  test("DB firewall sanitizeEducationForDb & expandTutorSubjectsAndClasses clean arbitrary dirty arrays", () => {
    const cleaned = sanitizeEducationForDb(
      ["RandomJunkXYZ", "Physics For Class IX", "Maths for Class IV", "All Subjects For Class XI", "Chemistry"],
      ["Class 4", "Class 9", "Class 11"]
    );
    assert.equal(cleaned.subjects.includes("All Subjects for Class 4"), true);
    assert.equal(cleaned.subjects.includes("Science for Class IX"), true);
    assert.equal(cleaned.subjects.includes("Chemistry for Class XI"), true);
    assert.equal(cleaned.subjects.some((s) => /random|physics for class ix|all subjects for class xi/i.test(s)), false);

    const expanded = expandTutorSubjectsAndClasses({
      rawSubjects: ["Biology", "Physics"],
      rawClassLevels: ["Class 9", "Class 11"],
    });
    assert.equal(expanded.subjects.includes("Science for Class IX"), true);
    assert.equal(expanded.subjects.includes("Physics for Class XI"), true);
    assert.equal(expanded.subjects.includes("Biology for Class XI"), true);
    assert.equal(expanded.subjects.some((s) => /(?:physics|biology) for class ix/i.test(s)), false);
  }),

  // ── 4. Persona Understanding Layer ────────────────────────────────────────
  test("Persona precheck handles NRI/language replies, app confusion, availability, and trust in English", () => {
    const nriOutbound = [
      {
        direction: "OUTBOUND",
        body: "Urgent Online Requirement for NRI Students (Classes 1-8). Student Location: Online",
      },
    ];
    const spokenPref = resolvePersonaPrecheck({
      rawMessage: "No thodi hindi thodi English",
      step: "WELCOME",
      userType: null,
      data: {},
      chatHistory: nriOutbound,
      isRegistered: false,
      phone: "919000000099",
    });
    assert.ok(spokenPref);
    assertEnglishOnly(spokenPref.reply, "spokenPref");
    assert.equal((spokenPref.updatedData as any)?.languagePref, "Bilingual / Hindi-English");

    const bareEnglishAfterNri = resolvePersonaPrecheck({
      rawMessage: "English",
      step: "WELCOME",
      userType: null,
      data: {},
      chatHistory: nriOutbound,
      isRegistered: false,
      phone: "919000000099",
    });
    assert.ok(bareEnglishAfterNri);
    assert.equal((bareEnglishAfterNri.updatedData as any)?.languagePref, "English");

    const appConfused = resolvePersonaPrecheck({
      rawMessage: "Like on the app?",
      step: "DONE",
      userType: "TUTOR",
      data: {},
      chatHistory: [{ direction: "OUTBOUND", body: "Check Requirement #32787 on apnatutorhub.com/login" }],
      isRegistered: true,
      phone: "919000000099",
    });
    assert.ok(appConfused);
    assert.match(appConfused.reply, /apnatutorhub\.com\/login/);
    assertEnglishOnly(appConfused.reply, "appConfused");

    for (const msg of [
      "I'm comfortable",
      "I am available",
      "Lead as a tutor",
      "M beleive kaise kru",
      "Number nahi lagta, call me",
    ]) {
      const p = resolvePersonaPrecheck({
        rawMessage: msg,
        step: "WELCOME",
        userType: null,
        data: {},
        isRegistered: false,
        phone: "919000000099",
      });
      assert.ok(p, `Expected persona precheck to handle: ${msg}`);
      assertEnglishOnly(p.reply, `persona: ${msg}`);
    }
  }),

  // ── 5. End-to-End Engine Flow (AI disabled = deterministic test) ──────────
  test('Engine never enters LANG_SELECT on "Hi", "lang", or idle MENU', async () => {
    const r1 = await processMessage(makeSession(), "Hi", { useAi: false, chatHistory: [] });
    assert.notEqual(r1.nextStep, "LANG_SELECT");
    assert.equal(r1.nextStep, "WELCOME");
    assertEnglishOnly(r1.reply, "WELCOME Hi");

    const r2 = await processMessage(makeSession({ isIdle: true, step: "T_AREA" }), "MENU", { useAi: false, chatHistory: [] });
    assert.notEqual(r2.nextStep, "LANG_SELECT");
    assert.equal(r2.nextStep, "WELCOME");
    assertEnglishOnly(r2.reply, "Idle MENU");

    const r3 = await processMessage(makeSession({ step: "LANG_SELECT" as string }), "Hello", { useAi: false, chatHistory: [] });
    assert.notEqual(r3.nextStep, "LANG_SELECT");
    assertEnglishOnly(r3.reply, "Upgraded LANG_SELECT");
  }),

  test('Engine processes "Biology 10 - 12. 1-5 all sub." and "Nursery to class 3\\nAll subjects" cleanly', async () => {
    const multi = await processMessage(makeSession(), "Biology 10 - 12. 1-5 all sub.", {
      useAi: false,
      chatHistory: [],
    });
    assert.equal(multi.nextStep, "T_AREA");
    assert.equal((multi.updatedData.subjects as string[]).includes("All Subjects for Class 1"), true);
    assert.equal((multi.updatedData.subjects as string[]).includes("Science for Class X"), true);
    assert.equal((multi.updatedData.subjects as string[]).includes("Biology for Class XI"), true);
    assertEnglishOnly(multi.reply, "Multi-clause T_CONVO");

    const splitMsg = await processMessage(makeSession(), "Nursery to class 3\nAll subjects", {
      useAi: false,
      chatHistory: [],
    });
    assert.equal(splitMsg.nextStep, "T_AREA");
    assert.deepEqual(splitMsg.updatedData.classLevels, [
      "Pre-Primary (Nursery/KG)",
      "Class 1",
      "Class 2",
      "Class 3",
    ]);
    assertEnglishOnly(splitMsg.reply, "Split Nursery to class 3");
  }),

  test("Engine rejects invalid/typo emails at T_EMAIL and accepts valid emails to T_PASSWORD", async () => {
    const baseData = {
      lang: "en",
      userType: "TUTOR",
      subjects: ["Mathematics for Class X", "Science for Class X"],
      classLevels: ["Class 10"],
      classLevel: "Class 10",
      area: "Rohini",
      city: "Delhi",
      name: "Priya Sharma",
    };

    const badTypo = await processMessage(
      makeSession({ step: "T_EMAIL", userType: "TUTOR", data: baseData }),
      "priya@gmal.com",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(badTypo.nextStep, "T_EMAIL");
    assert.equal(badTypo.updatedData.email, undefined);
    assertEnglishOnly(badTypo.reply, "Bad typo email");

    const badRandom = await processMessage(
      makeSession({ step: "T_EMAIL", userType: "TUTOR", data: baseData }),
      "just some random words",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(badRandom.nextStep, "T_EMAIL");
    assert.equal(badRandom.updatedData.email, undefined);
    assertEnglishOnly(badRandom.reply, "Random email text");

    const goodEmail = await processMessage(
      makeSession({ step: "T_EMAIL", userType: "TUTOR", data: baseData }),
      "tutor1@example.invalid",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(goodEmail.nextStep, "T_PASSWORD", `Expected T_PASSWORD but got ${goodEmail.nextStep}. Reply was: ${goodEmail.reply}`);
    assert.equal(goodEmail.updatedData.email, "tutor1@example.invalid");
    assertEnglishOnly(goodEmail.reply, "Valid email");
  }),

  test("Engine NRI reply 'No thodi hindi thodi English' does NOT pollute subjects with English", async () => {
    const nriReply = await processMessage(
      makeSession(),
      "No thodi hindi thodi English",
      {
        useAi: false,
        chatHistory: [
          {
            direction: "OUTBOUND",
            body: "NRI online tuitions: agar Hindi mein comfortable nahi hain toh reply karein.",
          },
        ],
      }
    );
    assert.equal(nriReply.nextStep, "T_CONVO");
    assert.equal(Boolean((nriReply.updatedData.subjects as string[] | undefined)?.includes("English")), false);
    assertEnglishOnly(nriReply.reply, "NRI language reply");
  }),

  // ── 6. Parent Intake Rules ────────────────────────────────────────────────
  test("Parent intake enforces Class 1-8 All Subjects + Offline, Class 11-12 specific subjects, English-only", () => {
    const class4 = assessIntake("Class 4 Maths Rohini");
    assert.equal(class4.ready, true);
    assert.deepEqual(class4.draft.subjects, ["All Subjects"]);
    assert.equal(class4.draft.mode, "OFFLINE");
    assertEnglishOnly(class4.reply, "Parent Class 4");

    const badAll12 = sealLeadEntry({
      classLevel: "Class 12",
      subjects: ["All Subjects"],
      area: "Rohini",
      mode: "ONLINE",
    });
    assert.equal(badAll12.ok, false);
    if (!badAll12.ok) assertEnglishOnly(badAll12.reason, "sealLeadEntry 12 All Subjects");
  }),

  // ── 7. Verify extractStrictClasses ignores pincodes & sector numbers ──────
  test("extractStrictClasses ignores Sector numbers and 6-digit pincodes", () => {
    const sec = extractStrictClasses("I live in Sector 12 Noida 201301");
    assert.deepEqual(sec.grades, []);
    assert.deepEqual(sec.labels, []);

    const multi = extractStrictClasses("Class 1 to 5 and 9-10");
    assert.deepEqual(multi.grades, [1, 2, 3, 4, 5, 9, 10]);
  }),

  // ── 8. AI-First Semantic Intent & Output Firewall (sanitizeAiBotResponse) ─
  test("sanitizeAiBotResponse handles OFF_TOPIC_OR_RANDOM, mixed multi-intent, and Hinglish slip guard", () => {
    const randomSanitized = sanitizeAiBotResponse(
      {
        intent: "OFF_TOPIC_OR_RANDOM",
        reply: "Hi! I'm Priya from ApnaTutorHub. How can I help you today?",
        quickReplies: ["I'm a Tutor", "I'm a Parent", "Help"],
        detectedRole: "TUTOR",
        extractedData: {
          name: "asdf",
          subjects: ["Physics"],
          classLevels: ["Class 5"],
          area: "Rohini",
          email: "junk@gmal.com",
        },
        isComplete: true,
      },
      "asdf qwerty ???"
    );
    assert.ok(randomSanitized);
    assert.equal(randomSanitized.intent, "OFF_TOPIC_OR_RANDOM");
    assert.deepEqual(randomSanitized.extractedData, {});
    assert.equal(randomSanitized.isComplete, false);
    assertEnglishOnly(randomSanitized.reply, "AI OFF_TOPIC_OR_RANDOM");

    const multiIntent = sanitizeAiBotResponse(
      {
        intent: "DECLINE_OR_LATER",
        reply: "No problem! I noted your Chemistry (Class 11) preference for later.",
        quickReplies: ["Continue"],
        detectedRole: "TUTOR",
        extractedData: {
          name: "asdf",
          subjects: ["Chemistry"],
          classLevels: ["Class 11"],
          email: "teacher@gmal.com",
        },
        isComplete: false,
      },
      "Call me later, btw I teach Chemistry Class 11"
    );
    assert.ok(multiIntent);
    assert.equal(multiIntent.intent, "DECLINE_OR_LATER");
    assert.equal(multiIntent.extractedData?.name, undefined);
    assert.equal(multiIntent.extractedData?.email, undefined);
    assert.deepEqual(multiIntent.extractedData?.classLevels, ["Class 11"]);
    assert.deepEqual(multiIntent.extractedData?.subjects, ["Chemistry for Class XI"]);

    assert.equal(containsHindiOrHinglishSlip("Namaste! Aapka naam batayein"), true);
    assert.equal(containsHindiOrHinglishSlip("Hi! Please share your full name."), false);

    const hinglishLeaked = sanitizeAiBotResponse(
      {
        intent: "SUPPORT_OR_HUMAN",
        reply: "Namaste! Aapka problem batayein, theek hai.",
        quickReplies: ["Help", "Batayein kya chahiye"],
        extractedData: {},
      },
      "how do I contact support?"
    );
    assert.ok(hinglishLeaked);
    assertEnglishOnly(hinglishLeaked.reply, "AI Hinglish slip replacement");
    assert.equal(hinglishLeaked.quickReplies.some((q) => /batayein/i.test(q)), false);

    const enforcedElementary = sanitizeAiBotResponse(
      {
        intent: "ONBOARD_OR_UPDATE",
        reply: "Noted Class 5!",
        extractedData: {
          subjects: ["Physics", "Mathematics"],
          classLevels: ["Class 5"],
        },
      },
      "I teach Physics and Maths for Class 5"
    );
    assert.ok(enforcedElementary);
    assert.deepEqual(enforcedElementary.extractedData?.subjects, ["All Subjects for Class 5"]);
  }),

  // ── 9. Universal Fallback for Random Noise, Junk Names, and Open Questions ─
  test("Universal fallback handles random gibberish, open questions, and rejects junk T_NAME noise cleanly", async () => {
    const rNoiseWelcome = await processMessage(makeSession(), "asdfqwerty", {
      useAi: false,
      chatHistory: [],
    });
    assert.equal(rNoiseWelcome.nextStep, "WELCOME");
    assertEnglishOnly(rNoiseWelcome.reply, "WELCOME random noise");

    const rQuestionWelcome = await processMessage(makeSession(), "how does payment and trial work?", {
      useAi: false,
      chatHistory: [],
    });
    assert.equal(rQuestionWelcome.nextStep, "WELCOME");
    assertEnglishOnly(rQuestionWelcome.reply, "WELCOME question");

    const rNoiseTutor = await processMessage(
      makeSession({ step: "T_CONVO", userType: "TUTOR", data: { lang: "en", userType: "TUTOR" } }),
      "xyz123??",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rNoiseTutor.nextStep, "T_CONVO");
    assert.equal(rNoiseTutor.updatedData.subjects, undefined);
    assertEnglishOnly(rNoiseTutor.reply, "T_CONVO random noise");

    const rQuestionTutor = await processMessage(
      makeSession({ step: "T_CONVO", userType: "TUTOR", data: { lang: "en", userType: "TUTOR" } }),
      "when will parents call me?",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rQuestionTutor.nextStep, "T_CONVO");
    assertEnglishOnly(rQuestionTutor.reply, "T_CONVO open question");

    const rBadName = await processMessage(
      makeSession({
        step: "T_NAME",
        userType: "TUTOR",
        data: {
          lang: "en",
          userType: "TUTOR",
          subjects: ["Chemistry for Class XI"],
          classLevels: ["Class 11"],
          classLevel: "Class 11",
          area: "Rohini",
          city: "Delhi",
        },
      }),
      "asdf",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rBadName.nextStep, "T_NAME");
    assert.equal(rBadName.updatedData.name, undefined);
    assertEnglishOnly(rBadName.reply, "T_NAME noise rejection");

    const rDoneNoise = await processMessage(
      makeSession({
        step: "DONE",
        userType: "TUTOR",
        data: { lang: "en", userType: "TUTOR", _registered: true, name: "Priya Sharma" },
      }),
      "asdf???",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rDoneNoise.nextStep, "DONE");
    assertEnglishOnly(rDoneNoise.reply, "DONE random noise");
  }),

  // ── 10. Nov 2026 Audit Regression Guards ──────────────────────────────────
  test("Normalizes Indian localities (karolbagh, indrapuram gaziyabad, Kashmere Gate, multi-line Saket) & blocks junk names/emails", async () => {
    const karol = validateAndCleanLocality("karolbagh");
    assert.equal(karol.isValid, true);
    assert.equal(karol.area, "Karol Bagh");
    assert.equal(karol.city, "Delhi");

    const indirapuram = validateAndCleanLocality("My location is indrapuram gaziyabad");
    assert.equal(indirapuram.isValid, true);
    assert.equal(indirapuram.area, "Indirapuram");
    assert.equal(indirapuram.city, "Ghaziabad");

    const kashmere = validateAndCleanLocality("Kashmere Gate");
    assert.equal(kashmere.isValid, true);
    assert.equal(kashmere.area, "Kashmere Gate");
    assert.equal(kashmere.city, "Delhi");

    const multiLineLoc = validateAndCleanLocality(
      "Location South Delhi, Saket\nSubjects: 9th-10th: Maths & Science\n11th-12th: Physics & Maths"
    );
    assert.equal(multiLineLoc.isValid, true);
    assert.equal(multiLineLoc.area, "Saket");
    assert.equal(multiLineLoc.city, "Delhi");

    // Multi-band sanitizeEducationForDb must drop Science for Class XI, drop junk Law test, fold History for IX -> Social Science, keep Physics XI
    const scrubbed = sanitizeEducationForDb(
      ["Science for Class XI", "History for Class IX", "Law School Admission Test for Class XI", "Physics for Class XI"],
      ["Class 9", "Class 11"]
    );
    assert.equal(scrubbed.subjects.includes("Social Science for Class IX"), true);
    assert.equal(scrubbed.subjects.includes("Physics for Class XI"), true);
    assert.equal(scrubbed.subjects.some((s) => /Science for Class XI|History for Class|Law School/i.test(s)), false);

    // Complaint containing "name" must NOT enter UPDATE_NAME
    const rComplaint = await processMessage(
      makeSession({ step: "DONE", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "Y mujhe kisi aur name se aaya tha mujhse 2000 le liye kuch bhi nhi diya",
      { useAi: false, chatHistory: [] }
    );
    assert.notEqual(rComplaint.nextStep, "UPDATE_NAME");
    assertEnglishOnly(rComplaint.reply, "Complaint mentioning name");

    // Even inside UPDATE_NAME, conversational distrust text must NOT be saved as name
    const rDistrustInUpdateName = await processMessage(
      makeSession({ step: "UPDATE_NAME", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "Mujhe trust aata hi nhi h",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rDistrustInUpdateName.updatedData.name, undefined);
    assert.equal(rDistrustInUpdateName.nextStep, "DONE");
    assertEnglishOnly(rDistrustInUpdateName.reply, "UPDATE_NAME distrust guard");

    // Roman ordinals XIth and XIIth work cleanly
    const rRoman = enforceStrictEducation({
      rawMessage: "Also update class - XIth and XIIth - Physics, chemistry and Mathematics",
    });
    assert.equal(rRoman.ok, true);
    assert.deepEqual(rRoman.classLevels, ["Class 11", "Class 12"]);
    assert.equal(rRoman.subjects.includes("Physics for Class XI"), true);
    assert.equal(rRoman.subjects.includes("Chemistry for Class XII"), true);
    assert.equal(rRoman.subjects.includes("Mathematics for Class XII"), true);

    // Automated "not monitored" business auto-responder must not hijack email
    const rAutoAway = await processMessage(
      makeSession({ step: "DONE", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "Hey there! For quick assistance email us at support@example.invalid. This chat isn't monitored.",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rAutoAway.reply, "");
    assert.equal(rAutoAway.updatedData.email, undefined);
  }),

  // ── 11. Mid-Flow Escape & Multi-Language Non-Trap Guarantees ───────────────
  test("Mid-flow steps (UPDATE_EMAIL, UPDATE_PASSWORD, T_PASSWORD, T_NAME, foreign script) never trap or save questions as passwords", async () => {
    const rQuestionInEmail = await processMessage(
      makeSession({ step: "UPDATE_EMAIL", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "how do plans and fees work?",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rQuestionInEmail.nextStep, "DONE");
    assert.equal(rQuestionInEmail.updatedData.email, undefined);
    assertEnglishOnly(rQuestionInEmail.reply, "UPDATE_EMAIL question escape");

    const rQuestionInUpdatePass = await processMessage(
      makeSession({ step: "UPDATE_PASSWORD", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "where are my leads?",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rQuestionInUpdatePass.nextStep, "DONE");
    assert.equal(rQuestionInUpdatePass.updatedData.password, undefined);
    assertEnglishOnly(rQuestionInUpdatePass.reply, "UPDATE_PASSWORD question escape");

    const rQuestionInTPass = await processMessage(
      makeSession({
        step: "T_PASSWORD",
        userType: "TUTOR",
        data: {
          lang: "en",
          userType: "TUTOR",
          email: "tutor2@example.invalid",
          area: "Rohini",
          city: "Delhi",
          subjects: ["Physics for Class XI"],
          classLevels: ["Class 11"],
        },
      }),
      "Fees kitni hogi?",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rQuestionInTPass.nextStep, "T_PASSWORD");
    assert.equal(rQuestionInTPass.updatedData.password, undefined);
    assertEnglishOnly(rQuestionInTPass.reply, "T_PASSWORD question guard");

    const rNameWrapper = await processMessage(
      makeSession({
        step: "T_NAME",
        userType: "TUTOR",
        data: {
          lang: "en",
          userType: "TUTOR",
          area: "Rohini",
          city: "Delhi",
          subjects: ["All Subjects for Class 5"],
          classLevels: ["Class 5"],
          email: "amit.verma@gmail.com",
        },
      }),
      "My name is Amit Verma",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rNameWrapper.updatedData.name, "Amit Verma");
    assertEnglishOnly(rNameWrapper.reply, "T_NAME intro wrapper");

    const rTamilWelcome = await processMessage(
      makeSession({ step: "WELCOME" }),
      "வணக்கம் எனக்கு டியூஷன் வேண்டும்",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rTamilWelcome.nextStep, "WELCOME");
    assertEnglishOnly(rTamilWelcome.reply, "Foreign script deterministic English reply");

    const rHindiInAreaUpdate = await processMessage(
      makeSession({ step: "UPDATE_AREA", userType: "TUTOR", data: { lang: "en", userType: "TUTOR", _registered: true } }),
      "बाद में करूँगा",
      { useAi: false, chatHistory: [] }
    );
    assert.equal(rHindiInAreaUpdate.nextStep, "DONE");
    assertEnglishOnly(rHindiInAreaUpdate.reply, "Hindi script escape in UPDATE_AREA");
  }),

  // ── 12. Live WhatsApp "8tk" Hindi Slang & Multi-Band Separation ────────────
  test('Parses "My subjects are classes 8tk all subjects and 11-12 mai chemistry and physics" strictly across both bands', () => {
    const res = enforceStrictEducation({
      rawMessage: "My subjects are classes 8tk all subjects and 11-12 mai chemistry and physics",
    });
    assert.equal(res.ok, true);
    for (let g = 1; g <= 8; g++) {
      assert.equal(res.classLevels.includes(`Class ${g}`), true);
      assert.equal(res.subjects.includes(`All Subjects for Class ${g}`), true);
    }
    assert.equal(res.classLevels.includes("Class 11"), true);
    assert.equal(res.classLevels.includes("Class 12"), true);
    assert.equal(res.subjects.includes("Chemistry for Class XI"), true);
    assert.equal(res.subjects.includes("Physics for Class XI"), true);
    assert.equal(res.subjects.includes("Chemistry for Class XII"), true);
    assert.equal(res.subjects.includes("Physics for Class XII"), true);
    assert.equal(res.subjects.some((s) => /Physics.*Class [1-8]\b|Chemistry.*Class [1-8]\b/i.test(s)), false);

    const hRange = enforceStrictEducation({ rawMessage: "1st se 6th all subjects" });
    assert.equal(hRange.ok, true);
    assert.deepEqual(hRange.classLevels, ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"]);
  }),
];

async function run() {
  console.log(`\nRunning ${tests.length} WhatsApp chatbot regression tests...\n`);
  for (const fn of tests) {
    await fn();
  }
  console.log(`\nAll ${passed}/${tests.length} tests passed.\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error("\nTEST FAILED:\n", err);
  process.exit(1);
});
