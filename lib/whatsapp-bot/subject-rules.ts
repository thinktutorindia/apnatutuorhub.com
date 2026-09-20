/**
 * lib/whatsapp-bot/subject-rules.ts
 *
 * Common-sense educational domain knowledge and validation for ApnaTutorHub chatbot.
 * Enforces realistic subject-grade boundaries across Indian school curricula (CBSE / ICSE / State Boards).
 * Prevents illogical combinations (e.g. Physics for Class 5, Accounts for Class 4, French for KG, etc.)
 * both in quick-reply suggestions and user input validation.
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedReplies?: string[];
  switchedSubject?: string[];
  switchedClass?: string;
}

/**
 * Returns sensible quick-reply suggestions and prompt for a given subject.
 * Guarantees that users are never prompted with invalid grades (e.g. Class 1-8 for Physics).
 */
export function getSubjectClassSuggestions(subject: string): { prompt: string; quickReplies: string[] } {
  const s = subject.toLowerCase();

  // Senior Sciences
  if (/physic|chem|bio|neet|jee/i.test(s)) {
    const name = /chem/i.test(s) ? "Chemistry" : /bio/i.test(s) ? "Biology" : "Physics";
    return {
      prompt: `${name} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "Class 9-10 (Science)", "JEE / NEET", "College / B.Sc"],
    };
  }

  // Commerce & Management
  if (/account|b\.?com|commerce|business\s*studies|bst|ca\s*foundation|cma|cs/i.test(s)) {
    return {
      prompt: `Commerce / Accounts kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "B.Com / College", "CA Foundation", "CUET"],
    };
  }

  // Humanities / Arts Senior Electives
  if (/political\s*science|pol\s*science|sociology|psychology|legal\s*studies/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 11-12", "BA / College", "CUET", "Class 9-10 (SST)"],
    };
  }

  // Foreign Languages
  if (/french|german|spanish|japanese|russian|chinese|arabic|foreign\s*language/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ya level ko padhate ho? 🌍`,
      quickReplies: ["Class 6-8 (School)", "Class 9-10 (Board)", "Class 11-12", "Spoken / All Levels"],
    };
  }

  // Sanskrit
  if (/sanskrit/i.test(s)) {
    return {
      prompt: `Sanskrit kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 6-8", "Class 9-10", "Class 11-12"],
    };
  }

  // All Subjects / Combo
  if (/all\s*subjects?|combo/i.test(s)) {
    return {
      prompt: `All subjects kaunsi classes tak padhate ho? 📚`,
      quickReplies: ["Class 1-5 (Primary)", "Class 6-8 (Middle)", "Class 1-8 (Combo)", "Class 9-10"],
    };
  }

  // Mathematics
  if (/math/i.test(s)) {
    return {
      prompt: `Maths kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 1-8 (Foundation)", "Class 9-10", "Class 11-12", "JEE / Advanced"],
    };
  }

  // Computer Science & Coding
  if (/computer|coding|python|java|c\+\+|programming/i.test(s)) {
    return {
      prompt: `Coding / CS kaunsi classes ko padhate ho? 💻`,
      quickReplies: ["Class 11-12 (CS/IP)", "Class 9-10 (IT/AI)", "Kids Coding (Class 4-8)", "Python / Web Dev"],
    };
  }

  // Languages: English & Hindi
  if (/english|hindi/i.test(s)) {
    return {
      prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
      quickReplies: ["Class 1-5 (Primary)", "Class 6-8 (Middle)", "Class 9-10", "Class 11-12"],
    };
  }

  return {
    prompt: `${subject} kaunsi classes ko padhate ho? 📚`,
    quickReplies: ["Class 1-8", "Class 9-10", "Class 11-12", "All Classes"],
  };
}

/**
 * Validates if the selected class makes educational common sense for the given subjects.
 * If invalid, explains why and provides smart alternative buttons to resolve the ambiguity.
 */
export function validateSubjectClassCompatibility(
  subjects: string[],
  classInput: string,
  userType: "TUTOR" | "PARENT" = "TUTOR"
): ValidationResult {
  const cleanCls = classInput.trim();
  const lowerCls = cleanCls.toLowerCase();

  // If user clicked a disambiguation button like "Class 1-5 (All Subjects)"
  if (/all\s*subjects?/i.test(lowerCls)) {
    return {
      isValid: true,
      switchedSubject: ["All Subjects", "All Subjects (Class 1-8)"],
      switchedClass: cleanCls.replace(/\(all\s*subjects?\)/i, "").trim() || "Class 1-5",
    };
  }

  // If user clicked "Class 9-10 (Science)" when previously on Physics
  if (/science/i.test(lowerCls)) {
    return {
      isValid: true,
      switchedSubject: ["Science"],
      switchedClass: cleanCls.replace(/\(science\)/i, "").trim() || "Class 9-10",
    };
  }

  // Extract grade numbers from input (e.g. "5", "class 5", "5th", "grade 5")
  const gradeMatch = lowerCls.match(/\b([1-9]|1[0-2])\b/);
  const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : null;
  const isPrimary = (grade !== null && grade <= 5) || /primary|kg|nursery|pre|1\s*[-–to]\s*5/i.test(lowerCls);
  const isMiddle = (grade !== null && grade >= 6 && grade <= 8) || /middle|6\s*[-–to]\s*8/i.test(lowerCls);
  const isBelow9 = (grade !== null && grade < 9) || isPrimary || isMiddle || /1\s*[-–to]\s*8|upto\s*8th|till\s*8th/i.test(lowerCls);
  const isBelow11 = (grade !== null && grade < 11) || isBelow9 || /9\s*[-–to]\s*10/i.test(lowerCls);

  // ── 1. Senior Sciences (Physics, Chemistry, Biology) ────────────────────────
  const isPhysics = subjects.some((s) => /physic/i.test(s));
  const isChemistry = subjects.some((s) => /chem/i.test(s));
  const isBiology = subjects.some((s) => /bio/i.test(s));
  const isSeniorScience = isPhysics || isChemistry || isBiology;

  if (isSeniorScience && isBelow9) {
    const sciName = isChemistry ? "Chemistry" : isBiology ? "Biology" : "Physics";
    if (userType === "PARENT") {
      return {
        isValid: false,
        reason: `School mein Class ${grade || "1-8"} ke liye ${sciName} alag se nahi hoti, wahan 'General Science' aur 'All Subjects' hota hai! 📚\n\nBachche ke liye kya chahiye?`,
        suggestedReplies: [`Class ${grade || 5} All Subjects`, `Class ${grade || 5} Science`, "Class 9-10 (Science)"],
      };
    }

    return {
      isValid: false,
      reason: `School curriculum mein ${sciName} Class 9-12 (aur JEE/NEET) mein hoti hai! 📚 Class 1-8 ke liye 'All Subjects' ya 'General Science' hota hai.\n\nAap kaunsi class ke liye padhate hain?`,
      suggestedReplies: [
        `Class 11-12 (${sciName})`,
        `Class 9-10 (Science)`,
        `Class 1-5 (All Subjects)`,
        `JEE / NEET`,
      ],
    };
  }

  // ── 2. Commerce & Accounts ──────────────────────────────────────────────────
  const isCommerce = subjects.some((s) => /account|business\s*studies|bst|commerce|cma|ca\s*foundation/i.test(s));
  if (isCommerce && isBelow11) {
    if (userType === "PARENT") {
      return {
        isValid: false,
        reason: `Accounts aur Commerce subjects Class 11-12 aur College mein shuru hote hain! 📚 Kaunsi class ke liye tutor chahiye?`,
        suggestedReplies: ["Class 11-12 Commerce", "B.Com / College", "Class 9-10 Maths/Sci"],
      };
    }

    return {
      isValid: false,
      reason: `Accounts aur Commerce school mein Class 11-12 aur College level par hota hai! 📚 Class 1-10 mein yeh subject nahi hota.\n\nKaunsi class ko padhate hain?`,
      suggestedReplies: ["Class 11-12", "B.Com / College", "CA Foundation", "Class 1-10 All Subjects"],
    };
  }

  // ── 3. Humanities Senior Electives ──────────────────────────────────────────
  const isHumanitiesSenior = subjects.some((s) => /political\s*science|pol\s*science|sociology|psychology|legal\s*studies/i.test(s));
  if (isHumanitiesSenior && isBelow11) {
    const subName = subjects.find((s) => /political|sociology|psychology|legal/i.test(s)) || "Humanities";
    return {
      isValid: false,
      reason: `${subName} Class 11-12 aur College level par alag subject hota hai! 📚 Class 6-10 ke liye 'Social Science (SST)' hota hai.\n\nKaunsi class padhate hain?`,
      suggestedReplies: ["Class 11-12", "Class 9-10 (SST)", "Class 6-8 (SST)", "BA / College"],
    };
  }

  // ── 4. Foreign Languages ────────────────────────────────────────────────────
  const isForeignLang = subjects.some((s) => /french|german|spanish|japanese|russian|chinese|arabic/i.test(s));
  if (isForeignLang && isPrimary && (grade !== null && grade <= 4)) {
    return {
      isValid: false,
      reason: `Foreign languages school mein generally Class 5-6 onwards shuru hoti hain! 🌍 Kaunse level ke liye padhate hain?`,
      suggestedReplies: ["Class 6-8 (School)", "Class 9-10 (Board)", "Class 11-12", "Spoken / All Levels"],
    };
  }

  // ── 5. Sanskrit ─────────────────────────────────────────────────────────────
  const isSanskrit = subjects.some((s) => /sanskrit/i.test(s));
  if (isSanskrit && isPrimary && (grade !== null && grade <= 4)) {
    return {
      isValid: false,
      reason: `Sanskrit schools mein Class 5-6 se shuru hoti hai! 📚 Kaunsi class ko padhate hain?`,
      suggestedReplies: ["Class 6-8", "Class 9-10", "Class 11-12"],
    };
  }

  // ── 6. "All Subjects" for Senior Secondary ──────────────────────────────────
  const isAllSubjects = subjects.every((s) => /all\s*subjects?|combo/i.test(s));
  if (isAllSubjects && (grade === 11 || grade === 12 || /11\s*[-–to]\s*12|senior\s*secondary/i.test(lowerCls))) {
    return {
      isValid: false,
      reason: `Class 11-12 mein 'All Subjects' nahi hota (Science, Commerce, Arts streams hoti hain)! 📚 Kaunsi stream ya specific subject padhate hain?`,
      suggestedReplies: [
        "Science (PCM / PCB)",
        "Commerce (Accounts/BST)",
        "Humanities / Arts",
        "Class 1-10 All Subjects",
      ],
    };
  }

  return { isValid: true };
}
