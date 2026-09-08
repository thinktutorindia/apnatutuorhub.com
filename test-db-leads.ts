import { searchTutorsPublic } from "./app/actions/public.actions";

async function main() {
  const res = await searchTutorsPublic({
    subject: "Mathematics",
    classLevel: "Class 11-12",
    city: "Sangam Vihar",
  });
  console.log("fallbackReason:", res.fallbackReason);
  console.log("Total:", res.total);
  console.log("Tutors count:", res.tutors.length);
  console.log("First 3 tutors:", res.tutors.slice(0, 3).map(t => ({
    name: t.name,
    qualification: t.qualification,
    subjects: t.subjects,
    classLevels: t.classLevels,
    city: t.city,
    address: t.address,
  })));
}

main().catch(console.error).finally(() => process.exit(0));
