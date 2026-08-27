"use client";

import React, { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  UserPlus,
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  Key,
  Shield,
  User,
  GraduationCap,
  Users,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  BookOpen,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  Mail,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
  Zap,
} from "lucide-react";
import {
  adminCreateUserAction,
  adminGetNextAutoEmailAction,
  type CreateUserInput,
} from "@/app/actions/admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { CLASS_LEVELS, BOARDS } from "@/lib/validations";
import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";
import type { SubAdminRole, TeachingMode } from "@prisma/client";

// ── Location Types & API Helpers ──────────────────────────────────────────────

export type ResolvedLocation = {
  city: string;
  state: string;
  pincode: string;
  area: string;
  fullAddress: string;
  lat?: number;
  lon?: number;
};

// OpenStreetMap Photon API (fast, debounced, Indian bounds)
async function searchPhotonLocation(query: string): Promise<ResolvedLocation[]> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=8&bbox=68.7,8.1,97.4,37.1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results: ResolvedLocation[] = [];

    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {};
      const [lon, lat] = feature.geometry?.coordinates ?? [null, null];

      if (p.country !== "India" && p.countrycode !== "IN") continue;

      const city = p.city || p.name || p.county || p.state_district || "";
      const state = p.state || "";
      const area =
        p.name !== city ? p.name || p.suburb || p.district || "" : p.suburb || p.district || "";
      const pincode = p.postcode || "";

      if (!city && !state && !area) continue;

      const parts = [area, city, state].filter(Boolean);
      const fullAddress = parts.join(", ") + (pincode ? ` - ${pincode}` : "") + ", India";

      results.push({
        city,
        state,
        pincode,
        area: area || city,
        fullAddress,
        lat: typeof lat === "number" ? lat : undefined,
        lon: typeof lon === "number" ? lon : undefined,
      });
    }

    return Array.from(
      new Map(results.map((r) => [`${r.city}|${r.area}|${r.pincode}`, r])).values()
    ).slice(0, 7);
  } catch {
    return [];
  }
}

// Indian Postal Pincode API for direct 6-digit zip queries
async function searchPincodeLocation(pincode: string): Promise<ResolvedLocation[]> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.[0]?.Status !== "Success") return [];

    const offices = (data[0].PostOffice ?? []).slice(0, 5);
    const results: ResolvedLocation[] = [];

    for (const po of offices) {
      const city = po.District || po.Block || po.Circle || po.Name || "";
      const state = po.State || "";
      const area = po.Name || "";

      results.push({
        city,
        state,
        pincode,
        area,
        fullAddress: `${area}, ${city}, ${state} - ${pincode}, India`,
        lat: undefined,
        lon: undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

// Fallback Nominatim search
async function searchNominatimLocation(query: string): Promise<ResolvedLocation[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&addressdetails=1&limit=5`,
      {
        headers: { "Accept-Language": "en" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => {
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.city_district || addr.county || addr.state_district || "";
      const state = addr.state || "";
      const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || item.name || "";
      const pincode = addr.postcode || "";
      const parts = [area, city, state].filter(Boolean);
      return {
        city: city || area,
        state,
        pincode,
        area: area || city,
        fullAddress: item.display_name || parts.join(", "),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      };
    });
  } catch {
    return [];
  }
}

// ── Individual Classes & Presets ──────────────────────────────────────────────

const INDIVIDUAL_CLASSES = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Nursery / KG",
  "College / Degree",
  "IIT-JEE",
  "NEET",
  "Competitive Exams",
  "Coding & IT",
  "Languages",
];

const CLASS_QUICK_GROUPS = [
  { label: "Class 1-5", classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"] },
  { label: "Class 6-8", classes: ["Class 6", "Class 7", "Class 8"] },
  { label: "Class 9-10", classes: ["Class 9", "Class 10"] },
  { label: "Class 11-12", classes: ["Class 11", "Class 12"] },
  { label: "JEE & NEET", classes: ["IIT-JEE", "NEET"] },
];

export function CreateUserModal({
  defaultQuery,
  buttonText = "Create User",
  buttonClassName,
  triggerIcon,
}: {
  defaultQuery?: string;
  buttonText?: string;
  buttonClassName?: string;
  triggerIcon?: React.ReactNode;
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  // Role Tab
  const [role, setRole] = useState<"TUTOR" | "PARENT" | "SUB_ADMIN" | "SUPER_ADMIN">("TUTOR");

  // Core Identity
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [autoPassword, setAutoPassword] = useState(true);
  const [customPassword, setCustomPassword] = useState("");

  // Sub Admin role
  const [subAdminRole, setSubAdminRole] = useState<SubAdminRole>("SUPPORT");

  // Real Location & Geocoding (No map required)
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<ResolvedLocation[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ResolvedLocation | null>(null);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualPincode, setManualPincode] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  // Tutor Specific State
  const [tutorTeachingMode, setTutorTeachingMode] = useState<TeachingMode>("EITHER");
  const [tutorClassLevels, setTutorClassLevels] = useState<string[]>([]);
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const [tutorSubjectSearch, setTutorSubjectSearch] = useState("");
  const [tutorCustomSubject, setTutorCustomSubject] = useState("");
  const [isCategoryTreeOpen, setIsCategoryTreeOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Combo Subjects KG to 10th", "Science Subjects", "Maths"])
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const [tutorExperience, setTutorExperience] = useState<string>("");
  const [tutorQualification, setTutorQualification] = useState("");
  const [tutorFeeRateType, setTutorFeeRateType] = useState<"HOURLY" | "MONTHLY">("HOURLY");
  const [tutorFeeMin, setTutorFeeMin] = useState("");
  const [tutorFeeMax, setTutorFeeMax] = useState("");
  const [tutorGender, setTutorGender] = useState("MALE");
  const [tutorBio, setTutorBio] = useState("");
  const [tutorAutoVerify, setTutorAutoVerify] = useState(false);

  // Parent Specific State
  const [parentClassLevel, setParentClassLevel] = useState("");
  const [parentBoard, setParentBoard] = useState("CBSE");
  const [parentSubjects, setParentSubjects] = useState<string[]>([]);
  const [parentSubjectSearch, setParentSubjectSearch] = useState("");
  const [parentCustomSubject, setParentCustomSubject] = useState("");
  const [parentNotes, setParentNotes] = useState("");

  // Result state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingUserMatch, setExistingUserMatch] = useState<{
    id: string;
    name?: string;
    email: string;
    role: string;
  } | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    userId?: string;
    email: string;
    temporaryPassword?: string;
    role: string;
    name: string;
    phone?: string;
    subjects?: string[];
    classLevels?: string[];
    classLevel?: string;
    board?: string;
    teachingMode?: string;
    feeMin?: number;
    feeMax?: number;
    qualification?: string;
    experience?: number;
    locationSummary?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Flatten all subjects from the onboarding taxonomy tree with deduplication
  const allFlattenedSubjects = useMemo(() => {
    const list: { subject: string; group: string; parentCategory: string }[] = [];
    const seen = new Set<string>();

    TRUEMYTUTOR_TREE.forEach((node) => {
      if (node.subjects) {
        node.subjects.forEach((s) => {
          const k = `${node.name}::${s}`;
          if (!seen.has(k)) {
            seen.add(k);
            list.push({ subject: s, group: node.name, parentCategory: node.name });
          }
        });
      }
      if (node.subcategories) {
        node.subcategories.forEach((sub) => {
          sub.subjects.forEach((s) => {
            const group = `${node.name} > ${sub.name}`;
            const k = `${group}::${s}`;
            if (!seen.has(k)) {
              seen.add(k);
              list.push({
                subject: s,
                group,
                parentCategory: node.name,
              });
            }
          });
        });
      }
    });
    return list;
  }, []);

  // Filter subjects for Tutor search
  const tutorFilteredSubjects = useMemo(() => {
    const q = tutorSubjectSearch.trim().toLowerCase();
    if (!q) return [];
    return allFlattenedSubjects.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [allFlattenedSubjects, tutorSubjectSearch]);

  // Filter subjects for Parent search
  const parentFilteredSubjects = useMemo(() => {
    const q = parentSubjectSearch.trim().toLowerCase();
    if (!q) return [];
    return allFlattenedSubjects.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [allFlattenedSubjects, parentSubjectSearch]);

  // Dynamically compute recommended subjects based on selected classes
  const dynamicClassSubjects = useMemo(() => {
    if (tutorClassLevels.length === 0) return [];
    const keywords: string[] = [];

    tutorClassLevels.forEach((lvl) => {
      const numMatch = lvl.match(/Class\s*(\d+)/i);
      if (numMatch) {
        const n = numMatch[1];
        const roman =
          n === "1" ? "I" : n === "2" ? "II" : n === "3" ? "III" : n === "4" ? "IV" :
          n === "5" ? "V" : n === "6" ? "VI" : n === "7" ? "VII" : n === "8" ? "VIII" :
          n === "9" ? "IX" : n === "10" ? "X" : n === "11" ? "XI" : n === "12" ? "XII" : n;
        keywords.push(`Class ${n}`, `Class ${roman}`);
      } else if (lvl.includes("IIT-JEE")) {
        keywords.push("IITJEE", "IIT");
      } else if (lvl.includes("NEET")) {
        keywords.push("NEET");
      } else if (lvl.includes("KG") || lvl.includes("Nursery")) {
        keywords.push("KG", "Nursery", "Preparatory");
      }
    });

    if (keywords.length === 0) return [];

    const matched = allFlattenedSubjects.filter((item) =>
      keywords.some((k) => item.subject.toLowerCase().includes(k.toLowerCase()))
    );

    return matched.slice(0, 24);
  }, [allFlattenedSubjects, tutorClassLevels]);

  // Dynamically compute recommended subjects for selected Parent Class
  const dynamicParentClassSubjects = useMemo(() => {
    if (!parentClassLevel) return [];
    const keywords: string[] = [];
    const numMatch = parentClassLevel.match(/Class\s*(\d+)/i);
    if (numMatch) {
      const n = numMatch[1];
      const roman =
        n === "1" ? "I" : n === "2" ? "II" : n === "3" ? "III" : n === "4" ? "IV" :
        n === "5" ? "V" : n === "6" ? "VI" : n === "7" ? "VII" : n === "8" ? "VIII" :
        n === "9" ? "IX" : n === "10" ? "X" : n === "11" ? "XI" : n === "12" ? "XII" : n;
      keywords.push(`Class ${n}`, `Class ${roman}`);
    } else if (parentClassLevel.includes("IIT-JEE")) {
      keywords.push("IITJEE", "IIT");
    } else if (parentClassLevel.includes("NEET")) {
      keywords.push("NEET");
    } else if (parentClassLevel.includes("KG") || parentClassLevel.includes("Nursery")) {
      keywords.push("KG", "Nursery", "Preparatory");
    }

    if (keywords.length === 0) return [];

    const matched = allFlattenedSubjects.filter((item) =>
      keywords.some((k) => item.subject.toLowerCase().includes(k.toLowerCase()))
    );

    return matched.slice(0, 20);
  }, [allFlattenedSubjects, parentClassLevel]);

  const [isParentCategoryTreeOpen, setIsParentCategoryTreeOpen] = useState(false);
  const [parentExpandedCategories, setParentExpandedCategories] = useState<Set<string>>(
    new Set(["Combo Subjects KG to 10th", "Science Subjects", "Maths"])
  );
  const [parentExpandedSubcategories, setParentExpandedSubcategories] = useState<Set<string>>(new Set());

  const toggleParentCategory = (catName: string) => {
    setParentExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleParentSubcategory = (subKey: string) => {
    setParentExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subKey)) next.delete(subKey);
      else next.add(subKey);
      return next;
    });
  };

  // Close location dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced location search (Photon OSM + Postal Pincode)
  useEffect(() => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      const t = setTimeout(() => {
        setLocationSuggestions([]);
        setIsLocationDropdownOpen(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        let results: ResolvedLocation[] = [];
        if (/^\d{6}$/.test(trimmed)) {
          results = await searchPincodeLocation(trimmed);
        }
        if (results.length === 0) {
          results = await searchPhotonLocation(trimmed);
        }
        if (results.length === 0) {
          results = await searchNominatimLocation(trimmed);
        }
        setLocationSuggestions(results);
        setIsLocationDropdownOpen(results.length > 0);
      } catch {
        // silent
      } finally {
        setIsSearchingLocation(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  const handleSelectLocation = (loc: ResolvedLocation) => {
    setSelectedLocation(loc);
    setManualCity(loc.city);
    setManualState(loc.state);
    setManualPincode(loc.pincode);
    setManualAddress(loc.fullAddress);
    setLocationQuery("");
    setIsLocationDropdownOpen(false);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setManualCity("");
    setManualState("");
    setManualPincode("");
    setManualAddress("");
    setLocationQuery("");
  };

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleSubcategory = (subKey: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subKey)) next.delete(subKey);
      else next.add(subKey);
      return next;
    });
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAutoPassword(true);
    setCustomPassword("");
    setRole("TUTOR");
    setSubAdminRole("SUPPORT");
    handleClearLocation();
    setShowManualAddress(false);

    setTutorTeachingMode("EITHER");
    setTutorClassLevels([]);
    setTutorSubjects([]);
    setTutorSubjectSearch("");
    setTutorCustomSubject("");
    setIsCategoryTreeOpen(false);
    setTutorExperience("");
    setTutorQualification("");
    setTutorFeeMin("");
    setTutorFeeMax("");
    setTutorGender("MALE");
    setTutorBio("");
    setTutorAutoVerify(true);

    setParentClassLevel("");
    setParentBoard("CBSE");
    setParentSubjects([]);
    setParentSubjectSearch("");
    setParentCustomSubject("");
    setParentNotes("");

    setErrorMsg(null);
    setCreatedResult(null);
  };

  const handleOpen = (queryOverride?: string) => {
    resetForm();
    const rawQ = queryOverride ?? defaultQuery ?? "";
    const trimmed = rawQ.trim();
    if (trimmed) {
      if (trimmed.includes("@")) {
        setEmail(trimmed);
      } else if (
        /^(\+?\d[\d\s-]{6,15})$/.test(trimmed) ||
        /^\d{7,15}$/.test(trimmed.replace(/\D/g, ""))
      ) {
        setPhone(trimmed);
      } else {
        setName(trimmed);
      }
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const toggleTutorClassLevel = (lvl: string) => {
    setTutorClassLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    );
  };

  const selectTutorClassGroup = (groupClasses: string[]) => {
    setTutorClassLevels((prev) => {
      const allSelected = groupClasses.every((c) => prev.includes(c));
      if (allSelected) {
        return prev.filter((c) => !groupClasses.includes(c));
      } else {
        return Array.from(new Set([...prev, ...groupClasses]));
      }
    });
  };

  const selectAllSchoolClasses = () => {
    const school = [
      "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
      "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
    ];
    setTutorClassLevels((prev) => {
      const allSelected = school.every((c) => prev.includes(c));
      if (allSelected) return prev.filter((c) => !school.includes(c));
      return Array.from(new Set([...prev, ...school]));
    });
  };

  const toggleTutorSubject = (subj: string) => {
    setTutorSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const toggleAllSubjectsInList = (list: string[]) => {
    setTutorSubjects((prev) => {
      const allSelected = list.every((s) => prev.includes(s));
      if (allSelected) {
        return prev.filter((s) => !list.includes(s));
      } else {
        return Array.from(new Set([...prev, ...list]));
      }
    });
  };

  const addTutorCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tutorCustomSubject.trim();
    if (clean && !tutorSubjects.includes(clean)) {
      setTutorSubjects((prev) => [...prev, clean]);
      setTutorCustomSubject("");
    }
  };

  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const handleAutoGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const res = await adminGetNextAutoEmailAction(
        role === "TUTOR" ? "tutor" : role === "PARENT" ? "parent" : "user",
        phone
      );
      if (res.success && res.data?.email) {
        setEmail(res.data.email);
      } else {
        const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
        if (cleanPhone && cleanPhone.length >= 10) {
          setEmail(`user${cleanPhone}@apnatutorhub.com`);
        } else {
          setEmail(`user${Date.now().toString().slice(-4)}@apnatutorhub.com`);
        }
      }
    } catch {
      const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
      setEmail(
        cleanPhone
          ? `user${cleanPhone}@apnatutorhub.com`
          : `user${Math.floor(1000 + Math.random() * 9000)}@apnatutorhub.com`
      );
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const toggleParentSubject = (subj: string) => {
    setParentSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const addParentCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = parentCustomSubject.trim();
    if (clean && !parentSubjects.includes(clean)) {
      setParentSubjects((prev) => [...prev, clean]);
      setParentCustomSubject("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedResult(null);

    const effectiveCity = manualCity.trim() || selectedLocation?.city || undefined;
    const effectiveState = manualState.trim() || selectedLocation?.state || undefined;
    const effectivePincode = manualPincode.trim() || selectedLocation?.pincode || undefined;
    const effectiveAddress = manualAddress.trim() || selectedLocation?.fullAddress || undefined;
    const rawName = name.trim();
    let normalizedPhone: string | undefined = undefined;

    if (phone.trim()) {
      let digits = phone.trim().replace(/\D/g, "");
      if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
      else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

      if (digits.length !== 10) {
        setErrorMsg("Mobile number must be exactly 10 digits.");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(digits)) {
        setErrorMsg("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
        return;
      }
      normalizedPhone = digits;
    }

    const roleLabel = role === "TUTOR" ? "Tutor" : role === "PARENT" ? "Parent" : "User";
    const displayName = rawName || (normalizedPhone ? `${roleLabel} (${normalizedPhone.slice(-4)})` : roleLabel);

    const payload: CreateUserInput = {
      name: rawName || undefined,
      email: email.trim() || undefined,
      phone: normalizedPhone,
      password: autoPassword ? undefined : customPassword.trim() || undefined,
      role,
      subAdminRole: role === "SUB_ADMIN" ? subAdminRole : undefined,
      city: effectiveCity,
      state: effectiveState,
      pincode: effectivePincode,
      address: effectiveAddress,
      latitude: selectedLocation?.lat,
      longitude: selectedLocation?.lon,
    };

    if (role === "TUTOR") {
      payload.subjects = tutorSubjects;
      payload.classLevels = tutorClassLevels;
      payload.teachingMode = tutorTeachingMode;
      payload.experience = tutorExperience ? parseInt(tutorExperience, 10) : undefined;
      payload.qualification = tutorQualification.trim() || undefined;
      payload.feeMin = tutorFeeMin ? parseInt(tutorFeeMin, 10) : undefined;
      payload.feeMax = tutorFeeMax ? parseInt(tutorFeeMax, 10) : undefined;
      payload.gender = tutorGender;
      payload.bio = tutorBio.trim() || undefined;
      payload.isVerified = tutorAutoVerify;
      payload.kycStatus = tutorAutoVerify ? "APPROVED" : "PENDING";
    } else if (role === "PARENT") {
      payload.studentName = rawName ? `${rawName}'s Child` : undefined;
      payload.classLevel = parentClassLevel;
      payload.board = parentBoard;
      payload.subjects = parentSubjects;
      payload.notes = parentNotes.trim() || undefined;
    }

    startTransition(async () => {
      const res = await adminCreateUserAction(payload);

      if (!res.success) {
        setErrorMsg(res.error ?? "Failed to create user account.");
        const idMatch = res.error?.match(/User ID:\s*([a-zA-Z0-9_-]+)/);
        const roleMatch = res.error?.match(/already exists as a ([A-Z_]+)/);
        if (idMatch && idMatch[1]) {
          setExistingUserMatch({
            id: idMatch[1],
            email: email.trim(),
            role: roleMatch ? roleMatch[1] : "USER",
            name: name.trim() || undefined,
          });
        } else {
          setExistingUserMatch(null);
        }
      } else {
        const locSummary = selectedLocation
          ? `${selectedLocation.area ? selectedLocation.area + ", " : ""}${selectedLocation.city || ""}${selectedLocation.pincode ? ` (${selectedLocation.pincode})` : ""}`
          : effectiveCity
          ? `${effectiveCity}${effectiveState ? `, ${effectiveState}` : ""}${effectivePincode ? ` (${effectivePincode})` : ""}`
          : undefined;

        setCreatedResult({
          userId: res.data?.userId,
          email: res.data?.email ?? email,
          temporaryPassword: res.data?.temporaryPassword,
          role,
          name: displayName,
          phone: normalizedPhone,
          subjects: role === "TUTOR" ? tutorSubjects : role === "PARENT" ? parentSubjects : undefined,
          classLevels: role === "TUTOR" ? tutorClassLevels : undefined,
          classLevel: role === "PARENT" ? parentClassLevel : undefined,
          board: role === "PARENT" ? parentBoard : undefined,
          teachingMode: role === "TUTOR" ? tutorTeachingMode : undefined,
          feeMin: role === "TUTOR" && tutorFeeMin ? parseInt(tutorFeeMin, 10) : undefined,
          feeMax: role === "TUTOR" && tutorFeeMax ? parseInt(tutorFeeMax, 10) : undefined,
          qualification: role === "TUTOR" ? tutorQualification.trim() || undefined : undefined,
          experience: role === "TUTOR" && tutorExperience ? parseInt(tutorExperience, 10) : undefined,
          locationSummary: locSummary,
        });
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const pwd = createdResult.temporaryPassword || (customPassword ? customPassword : "12345678");
    let text = `🎉 Welcome to ApnaTutorHub!\n\nHere are your login credentials:\n👤 Name: ${createdResult.name}\n🔑 Role: ${createdResult.role}\n📧 Email: ${createdResult.email}\n🔒 Password: ${pwd}`;

    if (createdResult.phone) {
      text += `\n📱 Mobile: +91 ${createdResult.phone}`;
    }

    if (createdResult.role === "TUTOR") {
      if (createdResult.classLevels && createdResult.classLevels.length > 0) {
        text += `\n🎓 Classes: ${createdResult.classLevels.join(", ")}`;
      }
      if (createdResult.subjects && createdResult.subjects.length > 0) {
        text += `\n📚 Subjects: ${createdResult.subjects.join(", ")}`;
      }
      if (createdResult.teachingMode) {
        const modeTxt =
          createdResult.teachingMode === "ONLINE"
            ? "Online Only"
            : createdResult.teachingMode === "OFFLINE"
            ? "Home Tuition"
            : "Home & Online";
        text += `\n💻 Mode: ${modeTxt}`;
      }
      if (createdResult.feeMin) {
        text += `\n💰 Min Fee: ₹${createdResult.feeMin.toLocaleString("en-IN")}/mo`;
      }
    } else if (createdResult.role === "PARENT") {
      if (createdResult.classLevel) {
        text += `\n🎓 Class: ${createdResult.classLevel}`;
      }
      if (createdResult.board) {
        text += `\n🏛️ Board: ${createdResult.board}`;
      }
      if (createdResult.subjects && createdResult.subjects.length > 0) {
        text += `\n📚 Required Subjects: ${createdResult.subjects.join(", ")}`;
      }
    }

    if (createdResult.locationSummary) {
      text += `\n📍 Location: ${createdResult.locationSummary}`;
    }

    text += `\n\n🌐 Login URL: https://apnatutorhub.com/login\n\nPlease log in to access your dashboard.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ActionOverlay
        isOpen={isPending}
        title="Creating User Profile"
        subtitle="Configuring credentials, verified location coordinates, and role parameters..."
      />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => handleOpen()}
        className={
          buttonClassName ??
          "group relative inline-flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-extrabold text-white transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer bg-gradient-to-r from-[#2D9E6B] to-[#1F8255]"
        }
      >
        {triggerIcon ?? <UserPlus size={16} className="transition-transform group-hover:scale-110" />}
        <span>{buttonText}</span>
      </button>

      {/* Modal Dialog Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden my-auto text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#2D9E6B] shadow-xs">
                  <UserPlus size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-lg font-bold text-[#0F2540] tracking-tight"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      Create New User Account
                    </h3>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-100/80 text-[#1F8255] px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Admin Quick Onboard
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Register verified Tutor, Parent, or Staff accounts with live Indian location &amp; subject mapping
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message & Match Banner */}
            {errorMsg && (
              <div className="mx-6 mt-4 rounded-2xl p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold space-y-3 animate-in fade-in shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{errorMsg}</p>
                  </div>
                </div>

                {existingUserMatch && (
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/80">
                    <Link
                      href={`/admin/users/${existingUserMatch.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-extrabold shadow-sm transition-all"
                    >
                      <ExternalLink size={14} className="text-[#2D9E6B]" />
                      <span>Open Existing Profile &amp; Promote to Sub-Admin →</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {createdResult ? (
                /* Success View */
                <div className="space-y-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 p-6 text-emerald-950">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-[#2D9E6B] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <CheckCircle2 size={26} />
                    </div>
                    <div>
                      <h4 className="text-[#0F2540] font-bold text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
                        Account Created Successfully! 🎉
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        The account is live, verified, and ready for immediate login.
                      </p>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="space-y-4 rounded-2xl bg-white p-5 text-xs border border-emerald-200/60 shadow-xs text-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Full Name</span>
                        <span className="font-bold text-[#0F2540] text-sm">{createdResult.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Account Role</span>
                        <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs">
                          {createdResult.role}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Login Email</span>
                        <span className="font-bold font-mono text-[#0F2540]">{createdResult.email}</span>
                      </div>
                      {createdResult.phone && (
                        <div>
                          <span className="text-slate-500 font-semibold block text-[11px]">Mobile Number</span>
                          <span className="font-bold font-mono text-[#0F2540]">+91 {createdResult.phone}</span>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 font-semibold block text-[11px]">Temporary Password</span>
                        <span className="inline-block font-bold font-mono text-emerald-900 bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300">
                          {createdResult.temporaryPassword || customPassword || "12345678"}
                        </span>
                      </div>

                      {/* Location Summary */}
                      {createdResult.locationSummary && (
                        <div className="sm:col-span-2 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5">
                          <strong className="text-slate-900 shrink-0">📍 Verified Location:</strong>
                          <span>{createdResult.locationSummary}</span>
                        </div>
                      )}

                      {/* Parent Class & Board */}
                      {createdResult.role === "PARENT" && (createdResult.classLevel || createdResult.board) && (
                        <div className="sm:col-span-2 text-[11px] bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl text-blue-950 flex flex-wrap items-center gap-3">
                          {createdResult.classLevel && (
                            <div>
                              <span className="text-blue-600 font-medium">Student Class: </span>
                              <strong className="font-bold">{createdResult.classLevel}</strong>
                            </div>
                          )}
                          {createdResult.board && (
                            <div>
                              <span className="text-blue-600 font-medium">Board: </span>
                              <strong className="font-bold">{createdResult.board}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tutor Classes Taught */}
                      {createdResult.role === "TUTOR" && createdResult.classLevels && createdResult.classLevels.length > 0 && (
                        <div className="sm:col-span-2 space-y-1.5 pt-1">
                          <span className="text-slate-500 font-bold block text-[11px]">
                            🎓 Classes Taught ({createdResult.classLevels.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {createdResult.classLevels.map((cls) => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[11px]"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subjects (Tutor or Parent) */}
                      {createdResult.subjects && createdResult.subjects.length > 0 && (
                        <div className="sm:col-span-2 space-y-1.5 pt-1">
                          <span className="text-slate-500 font-bold block text-[11px]">
                            📚 {createdResult.role === "TUTOR" ? "Selected Subjects Taught" : "Required Subjects"} ({createdResult.subjects.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {createdResult.subjects.map((subj) => (
                              <span
                                key={subj}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-[11px]"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tutor Extra Highlights */}
                      {createdResult.role === "TUTOR" && (createdResult.teachingMode || createdResult.feeMin || createdResult.qualification) && (
                        <div className="sm:col-span-2 text-[11px] bg-purple-50/60 border border-purple-200/80 p-2.5 rounded-xl text-purple-950 flex flex-wrap items-center gap-3">
                          {createdResult.teachingMode && (
                            <div>
                              <span className="text-purple-600 font-medium">Mode: </span>
                              <strong className="font-bold">
                                {createdResult.teachingMode === "ONLINE"
                                  ? "Online Only"
                                  : createdResult.teachingMode === "OFFLINE"
                                  ? "Home Tuition"
                                  : "Home & Online"}
                              </strong>
                            </div>
                          )}
                          {createdResult.qualification && (
                            <div>
                              <span className="text-purple-600 font-medium">Qualification: </span>
                              <strong className="font-bold">{createdResult.qualification}</strong>
                            </div>
                          )}
                          {createdResult.experience !== undefined && (
                            <div>
                              <span className="text-purple-600 font-medium">Experience: </span>
                              <strong className="font-bold">{createdResult.experience} yrs</strong>
                            </div>
                          )}
                          {createdResult.feeMin && (
                            <div>
                              <span className="text-purple-600 font-medium">Min Fee: </span>
                              <strong className="font-bold">₹{createdResult.feeMin.toLocaleString("en-IN")}/mo</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2D9E6B] px-5 py-3 text-xs font-extrabold text-white hover:bg-[#238357] transition-all shadow-md shadow-emerald-500/20 active:scale-98 cursor-pointer"
                    >
                      <Copy size={16} />
                      <span>{copied ? "Credentials Copied! ✓" : "Copy Login Info"}</span>
                    </button>
                    {createdResult.userId && (
                      <Link
                        href={`/admin/users/${createdResult.userId}/edit`}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:text-[#0F2540] hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        <span>Edit Profile</span>
                        <ExternalLink size={14} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl bg-slate-100 hover:bg-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      + Create Another
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Form */
                <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                  {/* Step 1: Role Switcher Cards */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                        1
                      </span>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                        Select Account Role
                      </label>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Tutor */}
                      <button
                        type="button"
                        onClick={() => setRole("TUTOR")}
                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          role === "TUTOR"
                            ? "bg-purple-50/80 border-purple-400 text-purple-950 shadow-sm shadow-purple-500/10 ring-2 ring-purple-400/30 font-bold"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                            role === "TUTOR"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500 group-hover:text-purple-600 group-hover:bg-purple-50"
                          }`}
                        >
                          <GraduationCap size={18} />
                        </div>
                        <span className="text-xs font-bold text-[#0F2540]">Tutor</span>
                        <span className="text-[10px] text-slate-500 font-medium">Teaching Profile</span>
                      </button>

                      {/* Parent */}
                      <button
                        type="button"
                        onClick={() => setRole("PARENT")}
                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          role === "PARENT"
                            ? "bg-blue-50/80 border-blue-400 text-blue-950 shadow-sm shadow-blue-500/10 ring-2 ring-blue-400/30 font-bold"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                            role === "PARENT"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50"
                          }`}
                        >
                          <Users size={18} />
                        </div>
                        <span className="text-xs font-bold text-[#0F2540]">Parent</span>
                        <span className="text-[10px] text-slate-500 font-medium">Student Profile</span>
                      </button>

                      {/* Sub Admin */}
                      <button
                        type="button"
                        onClick={() => setRole("SUB_ADMIN")}
                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          role === "SUB_ADMIN"
                            ? "bg-amber-50/80 border-amber-400 text-amber-950 shadow-sm shadow-amber-500/10 ring-2 ring-amber-400/30 font-bold"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                            role === "SUB_ADMIN"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500 group-hover:text-amber-600 group-hover:bg-amber-50"
                          }`}
                        >
                          <Shield size={18} />
                        </div>
                        <span className="text-xs font-bold text-[#0F2540]">Sub Admin</span>
                        <span className="text-[10px] text-slate-500 font-medium">Staff Role</span>
                      </button>

                      {/* Super Admin */}
                      {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setRole("SUPER_ADMIN")}
                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          role === "SUPER_ADMIN"
                            ? "bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-sm shadow-emerald-500/10 ring-2 ring-emerald-400/30 font-bold"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                            role === "SUPER_ADMIN"
                              ? "bg-[#2D9E6B] text-white shadow-xs"
                              : "bg-slate-100 text-slate-500 group-hover:text-[#2D9E6B] group-hover:bg-emerald-50"
                          }`}
                        >
                          <Sparkles size={18} />
                        </div>
                        <span className="text-xs font-bold text-[#0F2540]">Super Admin</span>
                        <span className="text-[10px] text-slate-500 font-medium">Full Access</span>
                      </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Account Information */}
                  <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                        2
                      </span>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                        Account Credentials
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="mb-1.5 block font-bold text-slate-700">
                          Full Name <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                        </label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Ramesh Sharma (or leave blank)"
                            className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] focus:ring-4 focus:ring-emerald-500/10 font-semibold transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-slate-700">
                            Email Address <span className="text-slate-400 font-normal text-[10px]">(Optional / Auto)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleAutoGenerateEmail}
                            disabled={isGeneratingEmail}
                            className="text-[11px] font-bold text-[#2D9E6B] hover:text-[#1F8255] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Auto-assign next sequential email"
                          >
                            {isGeneratingEmail ? (
                              <Loader2 size={12} className="animate-spin text-[#2D9E6B]" />
                            ) : (
                              <Zap size={12} className="text-[#2D9E6B]" />
                            )}
                            <span>Auto-Generate Email</span>
                          </button>
                        </div>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. user1@apnatutorhub.com (or click Auto-Generate)"
                            className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] focus:ring-4 focus:ring-emerald-500/10 font-semibold transition-all shadow-2xs"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                          Leave empty to auto-assign sequential email. You can edit this email anytime.
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-slate-700">
                            Mobile Number <span className="text-slate-400 font-normal text-[11px]">(WhatsApp)</span>
                          </label>
                          {phone.trim() && (
                            <span
                              className={`text-[10px] font-bold ${
                                phone.replace(/\D/g, "").length === 10 &&
                                /^[6-9]/.test(phone.replace(/\D/g, ""))
                                  ? "text-emerald-700 font-extrabold"
                                  : "text-amber-700"
                              }`}
                            >
                              {phone.replace(/\D/g, "").length}/10 digits
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 flex items-center gap-1 text-slate-500 font-bold text-xs pointer-events-none">
                            <span>🇮🇳 +91</span>
                          </div>
                          <input
                            type="tel"
                            value={phone}
                            maxLength={10}
                            onChange={(e) => {
                              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPhone(digitsOnly);
                            }}
                            placeholder="98765 43210"
                            className="w-full rounded-2xl pl-16 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] focus:ring-4 focus:ring-emerald-500/10 font-bold font-mono tracking-wide transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {role === "SUB_ADMIN" ? (
                        <div>
                          <label className="mb-1.5 block font-bold text-slate-700">
                            Department Role <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={subAdminRole}
                            onChange={(e) => setSubAdminRole(e.target.value as SubAdminRole)}
                            className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 outline-none cursor-pointer focus:border-[#2D9E6B] font-semibold transition-all shadow-2xs"
                          >
                            <option value="SUPPORT">Support Team</option>
                            <option value="VERIFICATION">Verification &amp; KYC</option>
                            <option value="FINANCE">Finance &amp; Wallets</option>
                            <option value="OPERATIONS">Operations &amp; Bookings</option>
                            <option value="MARKETING">Marketing &amp; Campaigns</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-slate-700">Password</label>
                            <button
                              type="button"
                              onClick={() => setAutoPassword(!autoPassword)}
                              className="text-[11px] font-bold text-[#2D9E6B] hover:underline cursor-pointer"
                            >
                              {autoPassword ? "Set custom password" : "Use default password"}
                            </button>
                          </div>
                          {autoPassword ? (
                            <div className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-medium">
                              <div className="flex items-center gap-2">
                                <Key size={14} className="text-[#2D9E6B] shrink-0" />
                                <span>Default Password:</span>
                              </div>
                              <span className="font-bold font-mono text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                                12345678
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={customPassword}
                              onChange={(e) => setCustomPassword(e.target.value)}
                              placeholder="Enter custom password (default: 12345678)"
                              className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-mono text-xs shadow-2xs"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Verified Location (No Map Required) */}
                  {(role === "TUTOR" || role === "PARENT") && (
                    <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                            3
                          </span>
                          <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540] flex items-center gap-1.5">
                            <span>Location &amp; Coordinates</span>
                            <span className="text-[10px] text-[#2D9E6B] font-semibold normal-case bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                              Instant Real Indian Search
                            </span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowManualAddress(!showManualAddress)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showManualAddress ? "Hide Manual Fields" : "Manual Fields"}</span>
                          {showManualAddress ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                      {/* Selected Location Card */}
                      {selectedLocation ? (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-2xs animate-in fade-in duration-150">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl bg-[#2D9E6B] text-white flex items-center justify-center shrink-0 shadow-xs">
                              <MapPin size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-[#0F2540] text-xs flex items-center gap-1.5">
                                <span>{selectedLocation.area || selectedLocation.city}</span>
                                {selectedLocation.pincode && (
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-300">
                                    {selectedLocation.pincode}
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-600 mt-0.5">{selectedLocation.fullAddress}</p>
                              {selectedLocation.lat && selectedLocation.lon && (
                                <p className="text-[10px] text-[#1F8255] font-mono font-bold mt-1">
                                  ✓ Verified GPS: {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lon.toFixed(4)}° E
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearLocation}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer shrink-0"
                            title="Change location"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        /* Live Autocomplete Search Input */
                        <div ref={locationWrapperRef} className="relative">
                          <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                            <input
                              type="text"
                              value={locationQuery}
                              onChange={(e) => setLocationQuery(e.target.value)}
                              placeholder="Search locality, area, landmark, pincode (e.g. Sangam Vihar, Delhi, 110062)…"
                              className="w-full rounded-2xl pl-9 pr-9 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] focus:ring-4 focus:ring-emerald-500/10 text-xs font-medium transition-all shadow-2xs"
                            />
                            {isSearchingLocation && (
                              <Loader2
                                size={15}
                                className="absolute right-3.5 top-3 animate-spin text-[#2D9E6B]"
                              />
                            )}
                          </div>

                          {/* Autocomplete Dropdown */}
                          {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl divide-y divide-slate-100 animate-in fade-in duration-100">
                              {locationSuggestions.map((item, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectLocation(item)}
                                  className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-emerald-50/50 transition-colors cursor-pointer"
                                >
                                  <MapPin size={15} className="text-[#2D9E6B] mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-[#0F2540] text-xs">
                                        {item.area || item.city}
                                      </span>
                                      {item.city && item.city !== item.area && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                          {item.city}
                                        </span>
                                      )}
                                      {item.pincode && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono font-bold">
                                          {item.pincode}
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-[11px] text-slate-500 mt-0.5">
                                      {item.fullAddress}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual Address Collapse */}
                      {showManualAddress && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-in fade-in duration-150">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              City / District
                            </label>
                            <input
                              type="text"
                              value={manualCity}
                              onChange={(e) => setManualCity(e.target.value)}
                              placeholder="e.g. South Delhi"
                              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-[#2D9E6B]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={manualState}
                              onChange={(e) => setManualState(e.target.value)}
                              placeholder="e.g. Delhi"
                              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-[#2D9E6B]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Pincode
                            </label>
                            <input
                              type="text"
                              value={manualPincode}
                              onChange={(e) => setManualPincode(e.target.value)}
                              placeholder="e.g. 110062"
                              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-mono font-semibold outline-none focus:border-[#2D9E6B]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Role-Specific Details: TUTOR */}
                  {role === "TUTOR" && (
                    <div className="space-y-4 p-5 rounded-3xl bg-purple-50/40 border border-purple-200/80">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-extrabold text-[10px]">
                          4
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                          <GraduationCap size={15} className="text-purple-600" />
                          <span>Tutor Classes &amp; Detailed Subjects</span>
                        </label>
                      </div>

                      {/* Teaching Mode Preference */}
                      <div>
                        <label className="mb-1.5 block font-bold text-slate-700">
                          Teaching Mode Preference
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { value: "EITHER", label: "Both (Home & Online)" },
                            { value: "OFFLINE", label: "Home / Offline" },
                            { value: "ONLINE", label: "Online Only" },
                            { value: "COACHING", label: "Coaching / Institute" },
                          ].map((m) => (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => setTutorTeachingMode(m.value as TeachingMode)}
                              className={`py-2.5 px-2 rounded-2xl text-center text-xs font-bold transition-all cursor-pointer border ${
                                tutorTeachingMode === m.value
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-500/20"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-purple-300"
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Individual Class Levels */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700">
                            Select Classes Taught ({tutorClassLevels.length} Selected)
                          </label>
                          {tutorClassLevels.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTutorClassLevels([])}
                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear Classes
                            </button>
                          )}
                        </div>

                        {/* Quick Group Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Quick:</span>
                          {CLASS_QUICK_GROUPS.map((grp) => {
                            const isAllIn = grp.classes.every((c) => tutorClassLevels.includes(c));
                            return (
                              <button
                                key={grp.label}
                                type="button"
                                onClick={() => selectTutorClassGroup(grp.classes)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer border ${
                                  isAllIn
                                    ? "bg-purple-100 border-purple-300 text-purple-900 font-extrabold"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                {isAllIn ? "✓ " : "+ "}
                                {grp.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={selectAllSchoolClasses}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer"
                          >
                            + All School (1-12)
                          </button>
                        </div>

                        {/* Individual Class Pills */}
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-white border border-purple-200/60 shadow-2xs">
                          {INDIVIDUAL_CLASSES.map((cls) => {
                            const isSelected = tutorClassLevels.includes(cls);
                            return (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => toggleTutorClassLevel(cls)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50/50 hover:border-purple-200"
                                }`}
                              >
                                {isSelected ? "✓ " : ""}
                                {cls}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detailed Subjects Section */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Layers size={14} className="text-purple-600" />
                            <span>Subjects Taught ({tutorSubjects.length} Selected)</span>
                          </label>
                          {tutorSubjects.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTutorSubjects([])}
                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear all ({tutorSubjects.length})
                            </button>
                          )}
                        </div>

                        {/* Selected Subject Badges */}
                        {tutorSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-white border border-purple-200/60 shadow-2xs max-h-32 overflow-y-auto">
                            {tutorSubjects.map((subj, idx) => (
                              <span
                                key={`tut-selected-${subj}-${idx}`}
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold"
                              >
                                <span>{subj}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleTutorSubject(subj)}
                                  className="text-purple-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Search Across Full Taxonomy */}
                        <div className="relative">
                          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10 shadow-2xs">
                            <Search size={15} className="text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={tutorSubjectSearch}
                              onChange={(e) => setTutorSubjectSearch(e.target.value)}
                              placeholder="Search 1,000+ standardized subjects (e.g. Maths for Class X, Physics for NEET, Python)…"
                              className="flex-1 bg-transparent text-xs text-slate-900 font-semibold outline-none placeholder:text-slate-400"
                            />
                            {tutorSubjectSearch && (
                              <button
                                type="button"
                                onClick={() => setTutorSubjectSearch("")}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Live Search Results Dropdown */}
                          {tutorSubjectSearch.trim() && (
                            <div className="mt-1.5 max-h-52 overflow-y-auto rounded-2xl bg-white border border-purple-300 shadow-xl p-2 space-y-1 divide-y divide-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 px-2 pb-1.5 flex justify-between">
                                <span>Matching Subjects ({tutorFilteredSubjects.length})</span>
                                <span className="text-purple-600">Click to toggle</span>
                              </div>
                              {tutorFilteredSubjects.length > 0 ? (
                                tutorFilteredSubjects.map(({ subject, group }, idx) => {
                                  const isSelected = tutorSubjects.includes(subject);
                                  return (
                                    <button
                                      key={`tutor-search-${group}-${subject}-${idx}`}
                                      type="button"
                                      onClick={() => toggleTutorSubject(subject)}
                                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-purple-100 text-purple-900 font-bold"
                                          : "hover:bg-purple-50/60 text-slate-700"
                                      }`}
                                    >
                                      <span className="truncate">{subject}</span>
                                      <span className="text-[10px] text-slate-400 truncate ml-2">
                                        {group}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="p-3 text-center">
                                  <p className="text-slate-500 text-xs">
                                    No standardized match for &quot;{tutorSubjectSearch}&quot;
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const clean = tutorSubjectSearch.trim();
                                      if (clean && !tutorSubjects.includes(clean)) {
                                        setTutorSubjects((prev) => [...prev, clean]);
                                        setTutorSubjectSearch("");
                                      }
                                    }}
                                    className="mt-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer shadow-xs"
                                  >
                                    + Add &quot;{tutorSubjectSearch.trim()}&quot; as custom subject
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Class-Specific Suggested Subjects */}
                        {dynamicClassSubjects.length > 0 && !tutorSubjectSearch.trim() && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-purple-950 font-bold">
                                Subjects for selected classes ({tutorClassLevels.join(", ")}):
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleAllSubjectsInList(
                                    dynamicClassSubjects.map((d) => d.subject)
                                  )
                                }
                                className="text-purple-700 hover:underline cursor-pointer font-bold text-[10px]"
                              >
                                Select / Toggle All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-2xl bg-white border border-purple-200/60 shadow-2xs">
                              {dynamicClassSubjects.map(({ subject, group }, idx) => {
                                const isSelected = tutorSubjects.includes(subject);
                                return (
                                  <button
                                    key={`dyn-subj-${group}-${subject}-${idx}`}
                                    type="button"
                                    onClick={() => toggleTutorSubject(subject)}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                                      isSelected
                                        ? "bg-purple-600 border-purple-600 text-white font-bold shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50/50 hover:border-purple-200"
                                    }`}
                                  >
                                    {isSelected ? "✓ " : "+ "}
                                    {subject}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Expandable Taxonomy Explorer */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setIsCategoryTreeOpen(!isCategoryTreeOpen)}
                            className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-bold cursor-pointer py-1"
                          >
                            <span>
                              {isCategoryTreeOpen
                                ? "Hide Category Explorer"
                                : "Browse Full Taxonomy Categories (Combo KG-10th, Science, Maths, Languages…)"}
                            </span>
                            {isCategoryTreeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isCategoryTreeOpen && (
                            <div className="mt-2 rounded-2xl border border-purple-200 bg-white p-3 max-h-64 overflow-y-auto space-y-2 divide-y divide-slate-100 shadow-sm">
                              {TRUEMYTUTOR_TREE.map((parent) => {
                                const isExpanded = expandedCategories.has(parent.name);
                                const totalInCat =
                                  (parent.subjects?.length ?? 0) +
                                  (parent.subcategories?.reduce(
                                    (acc, s) => acc + s.subjects.length,
                                    0
                                  ) ?? 0);

                                return (
                                  <div key={parent.name} className="pt-2 first:pt-0">
                                    <div
                                      onClick={() => toggleCategory(parent.name)}
                                      className="flex items-center justify-between p-1.5 hover:bg-purple-50/60 rounded-xl cursor-pointer select-none"
                                    >
                                      <span className="font-bold text-[#0F2540] text-xs flex items-center gap-2">
                                        <span className="text-purple-600 font-extrabold">
                                          {isExpanded ? "−" : "+"}
                                        </span>
                                        <span>{parent.name}</span>
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {totalInCat} subjects
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div className="pl-4 pt-1.5 pb-2 space-y-2">
                                        {parent.subjects && (
                                          <div className="flex flex-wrap gap-1">
                                            {parent.subjects.map((s, idx) => {
                                              const isChecked = tutorSubjects.includes(s);
                                              return (
                                                <button
                                                  key={`cat-${parent.name}-${s}-${idx}`}
                                                  type="button"
                                                  onClick={() => toggleTutorSubject(s)}
                                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                                    isChecked
                                                      ? "bg-purple-600 border-purple-600 text-white font-bold"
                                                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50"
                                                  }`}
                                                >
                                                  {isChecked ? "✓ " : "+ "}
                                                  {s}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {parent.subcategories && (
                                          <div className="space-y-1.5">
                                            {parent.subcategories.map((sub) => {
                                              const subKey = `${parent.name} > ${sub.name}`;
                                              const isSubExp = expandedSubcategories.has(subKey);
                                              return (
                                                <div
                                                  key={subKey}
                                                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/80"
                                                >
                                                  <div
                                                    onClick={() => toggleSubcategory(subKey)}
                                                    className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-800 hover:text-purple-700"
                                                  >
                                                    <span className="flex items-center gap-1.5">
                                                      <span>{isSubExp ? "▾" : "▸"}</span>
                                                      <span>{sub.name}</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-normal">
                                                      {sub.subjects.length}
                                                    </span>
                                                  </div>
                                                  {isSubExp && (
                                                    <div className="flex flex-wrap gap-1 pt-2 pl-2">
                                                      {sub.subjects.map((s, idx) => {
                                                        const isChecked = tutorSubjects.includes(s);
                                                        return (
                                                          <button
                                                            key={`subcat-${subKey}-${s}-${idx}`}
                                                            type="button"
                                                            onClick={() => toggleTutorSubject(s)}
                                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                                              isChecked
                                                                ? "bg-purple-600 border-purple-600 text-white font-bold"
                                                                : "bg-white border-slate-200 text-slate-700 hover:bg-purple-50"
                                                            }`}
                                                          >
                                                            {isChecked ? "✓ " : "+ "}
                                                            {s}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Custom Subject Adder */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={tutorCustomSubject}
                            onChange={(e) => setTutorCustomSubject(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTutorCustomSubject();
                              }
                            }}
                            placeholder="Add custom subject (e.g. Organic Chemistry, French)…"
                            className="flex-1 rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-semibold outline-none focus:border-purple-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => addTutorCustomSubject()}
                            className="px-4 py-2 rounded-2xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors cursor-pointer shadow-xs"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* Experience, Qualification, Fees & Gender */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                        <div>
                          <label className="mb-1 block font-bold text-slate-700">Experience (Yrs)</label>
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={tutorExperience}
                            onChange={(e) => setTutorExperience(e.target.value)}
                            className="w-full rounded-2xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-purple-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-slate-700">Qualification</label>
                          <input
                            type="text"
                            value={tutorQualification}
                            onChange={(e) => setTutorQualification(e.target.value)}
                            placeholder="e.g. B.Tech / MSc"
                            className="w-full rounded-2xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-purple-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700">
                              Fee ({tutorFeeRateType === "HOURLY" ? "₹/hr" : "₹/mo"})
                            </label>
                            <button
                              type="button"
                              onClick={() => setTutorFeeRateType(tutorFeeRateType === "HOURLY" ? "MONTHLY" : "HOURLY")}
                              className="text-[10px] font-extrabold text-purple-600 hover:text-purple-800 cursor-pointer bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200"
                            >
                              {tutorFeeRateType === "HOURLY" ? "⏱️ /hr" : "📅 /mo"}
                            </button>
                          </div>
                          <input
                            type="number"
                            value={tutorFeeMin}
                            onChange={(e) => setTutorFeeMin(e.target.value)}
                            placeholder={tutorFeeRateType === "HOURLY" ? "Min ₹/hr" : "Min ₹/mo"}
                            className="w-full rounded-2xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-purple-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-slate-700">
                            Max Fee ({tutorFeeRateType === "HOURLY" ? "₹/hr" : "₹/mo"})
                          </label>
                          <input
                            type="number"
                            value={tutorFeeMax}
                            onChange={(e) => setTutorFeeMax(e.target.value)}
                            placeholder={tutorFeeRateType === "HOURLY" ? "Max ₹/hr" : "Max ₹/mo"}
                            className="w-full rounded-2xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-purple-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-slate-700">Gender</label>
                          <select
                            value={tutorGender}
                            onChange={(e) => setTutorGender(e.target.value)}
                            className="w-full rounded-2xl px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none cursor-pointer focus:border-purple-500 shadow-2xs"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Auto Approve KYC Toggle */}
                      <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-purple-200 shadow-2xs cursor-pointer hover:border-purple-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={tutorAutoVerify}
                          onChange={(e) => setTutorAutoVerify(e.target.checked)}
                          className="h-4 w-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-[#0F2540] text-xs block">
                            Auto-Approve KYC &amp; Verify Tutor
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Tutor can immediately browse student leads and start receiving booking inquiries.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Step 4: Role-Specific Details: PARENT */}
                  {role === "PARENT" && (
                    <div className="space-y-4 p-5 rounded-3xl bg-blue-50/40 border border-blue-200/80">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px]">
                          4
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                          <BookOpen size={15} className="text-blue-600" />
                          <span>Student &amp; Requirement Profile</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-bold text-slate-700">Class / Grade</label>
                          <select
                            value={parentClassLevel}
                            onChange={(e) => setParentClassLevel(e.target.value)}
                            className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                          >
                            <option value="">Select Class / Grade Level</option>
                            {INDIVIDUAL_CLASSES.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block font-bold text-slate-700">School Board</label>
                          <select
                            value={parentBoard}
                            onChange={(e) => setParentBoard(e.target.value)}
                            className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs font-semibold outline-none cursor-pointer focus:border-blue-500 shadow-2xs"
                          >
                            {BOARDS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Parent Subjects Needed */}
                      <div className="space-y-2.5">
                        <label className="block font-bold text-slate-700">
                          Subjects Needed ({parentSubjects.length} Selected)
                        </label>

                        {/* Selected Subject Badges */}
                        {parentSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-white border border-blue-200/60 shadow-2xs max-h-28 overflow-y-auto">
                            {parentSubjects.map((subj, idx) => (
                              <span
                                key={`parent-selected-${subj}-${idx}`}
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold"
                              >
                                <span>{subj}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleParentSubject(subj)}
                                  className="text-blue-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dynamic Class-Specific Suggested Subjects for Parent */}
                        {dynamicParentClassSubjects.length > 0 && !parentSubjectSearch.trim() && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-blue-950 font-bold">
                                Subjects for {parentClassLevel}:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const subjectsToAdd = dynamicParentClassSubjects.map((d) => d.subject);
                                  setParentSubjects((prev) => {
                                    const allIn = subjectsToAdd.every((s) => prev.includes(s));
                                    if (allIn) return prev.filter((s) => !subjectsToAdd.includes(s));
                                    return Array.from(new Set([...prev, ...subjectsToAdd]));
                                  });
                                }}
                                className="text-blue-700 hover:underline cursor-pointer font-bold text-[10px]"
                              >
                                Select / Toggle All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-2xl bg-white border border-blue-200/60 shadow-2xs">
                              {dynamicParentClassSubjects.map(({ subject, group }, idx) => {
                                const isSelected = parentSubjects.includes(subject);
                                return (
                                  <button
                                    key={`parent-dyn-subj-${group}-${subject}-${idx}`}
                                    type="button"
                                    onClick={() => toggleParentSubject(subject)}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600 text-white font-bold shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50/50 hover:border-blue-200"
                                    }`}
                                  >
                                    {isSelected ? "✓ " : "+ "}
                                    {subject}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Search Onboarding Subjects for Parent */}
                        <div className="relative">
                          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 shadow-2xs">
                            <Search size={15} className="text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={parentSubjectSearch}
                              onChange={(e) => setParentSubjectSearch(e.target.value)}
                              placeholder={`Search 1,000+ standardized subjects (e.g. Maths for Class X, Physics for NEET, French)…`}
                              className="flex-1 bg-transparent text-xs text-slate-900 font-semibold outline-none placeholder:text-slate-400"
                            />
                            {parentSubjectSearch && (
                              <button
                                type="button"
                                onClick={() => setParentSubjectSearch("")}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Live search results for parent */}
                          {parentSubjectSearch.trim() && (
                            <div className="mt-1.5 max-h-48 overflow-y-auto rounded-2xl bg-white border border-blue-300 shadow-xl p-2 space-y-1 divide-y divide-slate-100">
                              {parentFilteredSubjects.length > 0 ? (
                                parentFilteredSubjects.map(({ subject, group }, idx) => {
                                  const isSelected = parentSubjects.includes(subject);
                                  return (
                                    <button
                                      key={`parent-search-${group}-${subject}-${idx}`}
                                      type="button"
                                      onClick={() => toggleParentSubject(subject)}
                                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-blue-100 text-blue-900 font-bold"
                                          : "hover:bg-blue-50/60 text-slate-700"
                                      }`}
                                    >
                                      <span className="truncate">{subject}</span>
                                      <span className="text-[10px] text-slate-400 truncate ml-2">
                                        {group}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const clean = parentSubjectSearch.trim();
                                      if (clean && !parentSubjects.includes(clean)) {
                                        setParentSubjects((prev) => [...prev, clean]);
                                        setParentSubjectSearch("");
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                  >
                                    + Add &quot;{parentSubjectSearch.trim()}&quot;
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expandable Taxonomy Explorer for Parent */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setIsParentCategoryTreeOpen(!isParentCategoryTreeOpen)}
                            className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold cursor-pointer py-1"
                          >
                            <span>
                              {isParentCategoryTreeOpen
                                ? "Hide Category Explorer"
                                : "Browse Full Taxonomy Categories (Combo KG-10th, Science, Maths, Languages…)"}
                            </span>
                            {isParentCategoryTreeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isParentCategoryTreeOpen && (
                            <div className="mt-2 rounded-2xl border border-blue-200 bg-white p-3 max-h-64 overflow-y-auto space-y-2 divide-y divide-slate-100 shadow-sm">
                              {TRUEMYTUTOR_TREE.map((parent) => {
                                const isExpanded = parentExpandedCategories.has(parent.name);
                                const totalInCat =
                                  (parent.subjects?.length ?? 0) +
                                  (parent.subcategories?.reduce(
                                    (acc, s) => acc + s.subjects.length,
                                    0
                                  ) ?? 0);

                                return (
                                  <div key={`parent-tree-${parent.name}`} className="pt-2 first:pt-0">
                                    <div
                                      onClick={() => toggleParentCategory(parent.name)}
                                      className="flex items-center justify-between p-1.5 hover:bg-blue-50/60 rounded-xl cursor-pointer select-none"
                                    >
                                      <span className="font-bold text-[#0F2540] text-xs flex items-center gap-2">
                                        <span className="text-blue-600 font-extrabold">
                                          {isExpanded ? "−" : "+"}
                                        </span>
                                        <span>{parent.name}</span>
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        {totalInCat} subjects
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div className="pl-4 pt-1.5 pb-2 space-y-2">
                                        {parent.subjects && (
                                          <div className="flex flex-wrap gap-1">
                                            {parent.subjects.map((s, idx) => {
                                              const isChecked = parentSubjects.includes(s);
                                              return (
                                                <button
                                                  key={`parent-cat-${parent.name}-${s}-${idx}`}
                                                  type="button"
                                                  onClick={() => toggleParentSubject(s)}
                                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                                    isChecked
                                                      ? "bg-blue-600 border-blue-600 text-white font-bold"
                                                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50"
                                                  }`}
                                                >
                                                  {isChecked ? "✓ " : "+ "}
                                                  {s}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {parent.subcategories && (
                                          <div className="space-y-1.5">
                                            {parent.subcategories.map((sub) => {
                                              const subKey = `${parent.name} > ${sub.name}`;
                                              const isSubExp = parentExpandedSubcategories.has(subKey);
                                              return (
                                                <div
                                                  key={`parent-subcat-${subKey}`}
                                                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/80"
                                                >
                                                  <div
                                                    onClick={() => toggleParentSubcategory(subKey)}
                                                    className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-800 hover:text-blue-700"
                                                  >
                                                    <span className="flex items-center gap-1.5">
                                                      <span>{isSubExp ? "▾" : "▸"}</span>
                                                      <span>{sub.name}</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-normal">
                                                      {sub.subjects.length}
                                                    </span>
                                                  </div>
                                                  {isSubExp && (
                                                    <div className="flex flex-wrap gap-1 pt-2 pl-2">
                                                      {sub.subjects.map((s, idx) => {
                                                        const isChecked = parentSubjects.includes(s);
                                                        return (
                                                          <button
                                                            key={`parent-subcat-${subKey}-${s}-${idx}`}
                                                            type="button"
                                                            onClick={() => toggleParentSubject(s)}
                                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                                              isChecked
                                                                ? "bg-blue-600 border-blue-600 text-white font-bold"
                                                                : "bg-white border-slate-200 text-slate-700 hover:bg-blue-50"
                                                            }`}
                                                          >
                                                            {isChecked ? "✓ " : "+ "}
                                                            {s}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Custom tag adder */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={parentCustomSubject}
                            onChange={(e) => setParentCustomSubject(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addParentCustomSubject();
                              }
                            }}
                            placeholder="Add specific subject (e.g. Accountancy, Coding)…"
                            className="flex-1 rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-semibold outline-none focus:border-blue-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => addParentCustomSubject()}
                            className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* Parent Notes */}
                      <div>
                        <label className="mb-1 block font-bold text-slate-700">
                          Requirement Notes <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={parentNotes}
                          onChange={(e) => setParentNotes(e.target.value)}
                          placeholder="e.g. Looking for an experienced home tutor 4 days/week near Sangam Vihar for Class 10 CBSE Math & Science."
                          className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-medium outline-none focus:border-blue-500 shadow-2xs resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Footer */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-extrabold text-white transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer active:scale-98 bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:opacity-95"
                    >
                      {isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>
                            Create {role === "TUTOR" ? "Tutor" : role === "PARENT" ? "Parent" : "User"} Account
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
