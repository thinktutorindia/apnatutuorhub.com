import { searchTutorsPublic } from "../app/actions/public.actions";

async function main() {
  console.log("=== TEST 1: Science & Maths for Class 9-10 in Sangam Vihar (radius 3 km) ===");
  const res1 = await searchTutorsPublic({
    subject: "Science & Maths",
    classLevel: "Class 9-10",
    city: "Sangam Vihar",
    radiusKm: 3,
  });

  console.log(`Results: ${res1.tutors.length} tutors (total: ${res1.total})`);
  for (const t of res1.tutors) {
    console.log(`- ${t.name} (id: ${t.id})`);
    console.log(`  Distance: ${t.distanceKm} km | City/Address: ${t.city} / ${t.address}`);
    console.log(`  Displayed: [${t.displayedClasses}] - [${t.displayedSubjects}]`);
    console.log(`  Raw classes: [${t.classLevels?.join(", ")}]`);
    console.log(`  Raw subjects: [${t.subjects?.slice(0, 5).join(", ")}]`);
    console.log(`  Avatar: ${t.image?.slice(0, 40) || "NULL"} | Gender: ${t.gender}`);
  }

  console.log("\n=== TEST 2: Science & Maths with NO location (All Tutors) ===");
  const res2 = await searchTutorsPublic({
    subject: "Science & Maths",
    classLevel: "Class 9-10",
  });
  console.log(`Total tutors found for Class 9-10 Science & Maths: ${res2.tutors.length}`);
  for (const t of res2.tutors.slice(0, 5)) {
    console.log(`- ${t.name}: [${t.displayedClasses}] [${t.displayedSubjects}] | Raw: [${t.classLevels?.join(", ")}]`);
  }

  console.log("\n=== TEST 3: Check if Akshay K. or Rahul R. leak into Class 9-10 ===");
  const akshay = res2.tutors.find(t => t.name.toLowerCase().includes("akshay"));
  const rahul = res2.tutors.find(t => t.name.toLowerCase().includes("rahul"));
  console.log("Did Rahul R. leak?", rahul ? `YES! ${rahul.name}` : "NO (Correct!)");
  console.log("Did Akshay K. match?", akshay ? `YES: [${akshay.displayedClasses}]` : "NO");
}

main().catch(console.error).finally(() => process.exit(0));
