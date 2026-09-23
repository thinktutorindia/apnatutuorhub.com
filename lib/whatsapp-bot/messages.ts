/**
 * lib/whatsapp-bot/messages.ts
 * All chatbot message templates in one place.
 * Edit here to change bot copy — nothing else needs to change.
 */

export const MSG = {
  // ── Language Selection ────────────────────────────────────────────────────────
  LANG_PROMPT: `Welcome to *ApnaTutorHub*! / *ApnaTutorHub* में आपका स्वागत है! 🙏
India's Leading Home Tutoring Network.

Please choose your language / अपनी भाषा चुनें:
1 — English
2 — हिंदी (Hindi)

Reply with *1* or *2*`,

  // ── Common (Bilingual) ────────────────────────────────────────────────────────
  WELCOME_EN: `Welcome to *ApnaTutorHub*! 🎓
India's Leading Home Tutoring Network.

Please tell us who you are:
1 — *Tutor* (Looking for home tuition / teaching work)
2 — *Parent* (Looking for a qualified home tutor)

Reply with *1* or *2*`,

  WELCOME_HI: `*ApnaTutorHub* में आपका स्वागत है! 🎓
भारत का प्रमुख होम ट्यूशन नेटवर्क।

कृपया बताएं आप कौन हैं:
1 — *ट्यूटर* (होम ट्यूशन / टीचिंग वर्क चाहिए)
2 — *पेरेंट* (बच्चे के लिए होम ट्यूटर चाहिए)

Reply करें *1* या *2*`,

  WELCOME: `Welcome to *ApnaTutorHub*! / *ApnaTutorHub* में आपका स्वागत है! 🙏

Please choose your language / अपनी भाषा चुनें:
1 — English
2 — हिंदी (Hindi)

Reply with *1* or *2*`,

  RE_WELCOME: `👋 Welcome back to *ApnaTutorHub*!

Are you a Tutor or a Parent?
1 — *Tutor* (Looking for tuition opportunities)
2 — *Parent* (Looking for a home tutor)

Reply with *1* or *2*`,

  UNKNOWN: `Sorry, I didn't quite catch that. 🙏
Type *MENU* to restart or reply with the requested option.`,

  UNKNOWN_HI: `समझ नहीं आया। 🙏
Restart करने के लिए *MENU* type करें।`,

  HELP: `📞 *ApnaTutorHub Support*

WhatsApp: +91 93191 93109
Timings: 9:00 AM – 7:00 PM (Mon–Sat)

Type *MENU* anytime to return to the main menu.`,

  CANCEL: `✅ Session cleared.
Type *MENU* anytime to start afresh.

*ApnaTutorHub.com — We Provide Home Tutors* 🙏`,

  TOO_MANY_RETRIES: `Something went wrong. Let's start fresh.
Type *MENU* to try again.`,

  // ── Tutor Flow ────────────────────────────────────────────────────────────
  T_NAME: `Great! 🎉 Let's set up your *tutor profile*.

👤 *Step 1 of 8* — What is your *full name*?

_(e.g. Priya Sharma)_`,

  T_CITY: `📍 *Step 2 of 8* — Which *city* are you based in?

_(e.g. Delhi, Noida, Mumbai, Lucknow)_`,

  T_AREA: (city: string) => `🏠 *Step 3 of 8* — Which *area / locality* in *${city}*?

_(e.g. Sector 15, Andheri West, Hazratganj)_`,

  T_SUBJECTS: `📚 *Step 4 of 8* — Which *subjects* do you teach?

Type all subjects, separated by commas.

Examples:
• Mathematics, Physics, Chemistry
• English, Hindi, Social Science
• All Subjects`,

  T_CLASSES: `🎓 *Step 5 of 8* — Which *classes* do you teach?

Reply with numbers separated by commas:

1 → Class 1–5 (Primary)
2 → Class 6–8 (Middle School)
3 → Class 9–10 (Board Exam)
4 → Class 11–12 (Senior Secondary)
5 → JEE / NEET / Entrance Exam
6 → All of the above

_(e.g. 1,2,3)_`,

  T_MODE: `🏡 *Step 6 of 8* — How do you prefer to teach?

1 → *Home visit* (I go to the student's home)
2 → *Online only* (video call)
3 → *Both* (home visit + online)

Reply *1*, *2*, or *3*`,

  T_TIMING: `⏰ *Step 7 of 8* — What are your *available timings*?

_(e.g. Morning 7–10am & Evenings 5–8pm, or Weekdays 4–8pm, Weekends anytime)_`,

  T_EXPERIENCE: `💼 *Step 8 of 8* — How many *years of teaching experience* do you have?

Type a number. Reply *0* if you are just starting out.`,

  T_CONFIRM: (d: {
    name: string;
    city: string;
    area: string;
    subjects: string;
    classes: string;
    mode: string;
    timing: string;
    experience: string;
  }) => `✅ *Please review your tutor profile:*

👤 Name: *${d.name}*
📍 Location: *${d.city}, ${d.area}*
📚 Subjects: *${d.subjects}*
🎓 Classes: *${d.classes}*
🏡 Mode: *${d.mode}*
⏰ Timings: *${d.timing}*
💼 Experience: *${d.experience} years*

Is everything correct?
1 → ✅ *Yes, register me!*
2 → ✏️ *Edit* (start over)
3 → ❌ *Cancel*`,

  T_DONE: (link: string) => `🎉 *You're now registered with ApnaTutorHub!*

Your profile is live and will be matched with nearby parents.

📲 *Complete your profile* (add photo, education, bio):
🔗 ${link}

💡 *Exciting offer:* Get your first verified parent lead for just *₹99* (No GST)!

Our team will contact you for profile verification shortly.

Thank you for joining *ApnaTutorHub*! 🙏
_ApnaTutorHub.com — We Provide Home Tutors_`,

  // ── Parent Flow ───────────────────────────────────────────────────────────
  P_STUDENT_NAME: `Great! Let's find the *perfect tutor* for your child. 🎓

👶 *Step 1 of 8* — What is your *child's name*?`,

  P_CLASS: `🎓 *Step 2 of 8* — Which *class / grade* is your child in?

1 → Nursery / KG / Class 1–2
2 → Class 3–5 (Primary)
3 → Class 6–8 (Middle School)
4 → Class 9–10 (Board Exam)
5 → Class 11–12 (Senior Secondary)
6 → JEE / NEET / Competitive Exam

Reply *1–6*`,

  P_SUBJECTS: `📚 *Step 3 of 8* — Which *subjects* do you need help with?

Type subjects separated by commas.

Examples:
• Mathematics, Science
• English, Hindi
• Physics, Chemistry, Biology
• All Subjects`,

  P_CITY: `📍 *Step 4 of 8* — Which *city* are you in?

_(e.g. Delhi, Noida, Gurgaon, Mumbai)_`,

  P_AREA: (city: string) => `🏠 *Step 5 of 8* — Which *area / locality* in *${city}*?

_(e.g. Sector 62, Indiranagar, Bandra West)_`,

  P_TIMING: `⏰ *Step 6 of 8* — Preferred *tuition timings*?

_(e.g. Evenings 5–7pm, Weekends only, Flexible)_`,

  P_MODE: `🏡 *Step 7 of 8* — What type of tuition do you prefer?

1 → *Home tutor* comes to your home
2 → *Online* (video call)
3 → *Either* is fine

Reply *1*, *2*, or *3*`,

  P_BUDGET: `💰 *Step 8 of 8* — What is your approximate *monthly tuition budget*?

1 → Under ₹2,000 / month
2 → ₹2,000 – ₹5,000 / month
3 → ₹5,000 – ₹10,000 / month
4 → Above ₹10,000 / month

Reply *1–4*`,

  P_PARENT_NAME: `👤 Almost done! What is *your name* (parent / guardian)?`,

  P_CONFIRM: (d: {
    studentName: string;
    classLevel: string;
    subjects: string;
    city: string;
    area: string;
    timing: string;
    mode: string;
    budget: string;
    parentName: string;
  }) => `✅ *Please review your tuition requirement:*

👶 Student: *${d.studentName}*
🎓 Class: *${d.classLevel}*
📚 Subjects: *${d.subjects}*
📍 Location: *${d.city}, ${d.area}*
⏰ Timing: *${d.timing}*
🏡 Type: *${d.mode}*
💰 Budget: *${d.budget}*
👤 Parent: *${d.parentName}*

Is everything correct?
1 → ✅ *Yes, find me a tutor!*
2 → ✏️ *Edit* (start over)
3 → ❌ *Cancel*`,

  P_DONE: (inquiryNumber: number) => `🎉 *Your tuition requirement has been posted!*

📋 Reference No: *ATH-${String(inquiryNumber).padStart(4, "0")}*

Our verified tutors will reach out to you shortly. You can also view matching tutors at:

🔗 https://apnatutorhub.com/find-tutor

📞 If you don't hear back within 24 hours, WhatsApp us again and type *HELP*.

Thank you for choosing *ApnaTutorHub*! 🙏
_ApnaTutorHub.com — We Provide Home Tutors_`,
} as const;

// ── Lookup tables ────────────────────────────────────────────────────────────

export const CLASS_MAP: Record<string, string> = {
  "1": "Nursery / KG / Class 1–2",
  "2": "Class 3–5 (Primary)",
  "3": "Class 6–8 (Middle School)",
  "4": "Class 9–10 (Board Exam)",
  "5": "Class 11–12 (Senior Secondary)",
  "6": "JEE / NEET / Competitive Exam",
};

export const TUTOR_CLASS_MAP: Record<string, string> = {
  "1": "Class 1–5",
  "2": "Class 6–8",
  "3": "Class 9–10",
  "4": "Class 11–12",
  "5": "JEE / NEET",
  "6": "All Classes",
};

export const TEACHING_MODE_MAP: Record<string, string> = {
  "1": "Home Visit",
  "2": "Online",
  "3": "Both (Home + Online)",
};

export const BUDGET_MAP: Record<string, { label: string; min: number; max: number }> = {
  "1": { label: "Under ₹2,000/month", min: 0, max: 2000 },
  "2": { label: "₹2,000–₹5,000/month", min: 2000, max: 5000 },
  "3": { label: "₹5,000–₹10,000/month", min: 5000, max: 10000 },
  "4": { label: "Above ₹10,000/month", min: 10000, max: 50000 },
};

export const SPECIAL_COMMANDS = ["MENU", "START", "HI", "HELLO", "HALO", "LANG", "LANGUAGE", "BHASHA"];
export const HELP_COMMANDS = ["HELP", "SUPPORT"];
export const CANCEL_COMMANDS = ["STOP", "CANCEL", "QUIT", "EXIT"];
