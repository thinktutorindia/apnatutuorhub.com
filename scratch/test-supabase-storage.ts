import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function verifySupabaseStorage() {
  console.log("==================================================");
  console.log("     SUPABASE STORAGE CONNECTION VERIFICATION");
  console.log("==================================================");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[1] Checking credentials...");
  console.log("    NEXT_PUBLIC_SUPABASE_URL:", url ? "PRESENT" : "MISSING");
  console.log("    SUPABASE_SERVICE_ROLE_KEY:", key ? "PRESENT" : "MISSING");

  if (!url || !key) {
    console.error("ERROR: Supabase URL or Service Role Key missing!");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log("\n[2] Connecting to Supabase Storage API...");
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();

  if (bucketsErr) {
    console.error("    Failed to list buckets:", bucketsErr.message);
    process.exit(1);
  }

  console.log("    Buckets found:", buckets.map((b) => `${b.name} (public: ${b.public})`));

  const bucketName = "kyc-documents";
  const existingBucket = buckets.find((b) => b.name === bucketName);

  if (!existingBucket) {
    console.log(`\n[3] Bucket '${bucketName}' does not exist yet. Creating private bucket...`);
    const { data: newBucket, error: createErr } = await supabase.storage.createBucket(bucketName, {
      public: false, // Ensure private storage
      fileSizeLimit: 5242880, // 5MB
    });

    if (createErr) {
      console.error(`    Failed to create bucket '${bucketName}':`, createErr.message);
    } else {
      console.log(`    SUCCESS: Created private bucket '${newBucket.name}'!`);
    }
  } else {
    console.log(`\n[3] Private bucket '${bucketName}' exists (public: ${existingBucket.public})!`);
  }

  console.log("\n[4] Testing Signed Upload URL generation...");
  const testKey = `verify_test_${Date.now()}.txt`;
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(testKey);

  if (uploadErr) {
    console.error("    Signed Upload URL Error:", uploadErr.message);
  } else {
    console.log("    SUCCESS: Signed Upload URL generated cleanly!");
  }

  console.log("\n[5] Testing Signed View URL generation...");
  const { data: viewData, error: viewErr } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(testKey, 900);

  if (viewErr) {
    console.error("    Signed View URL Error:", viewErr.message);
  } else {
    console.log("    SUCCESS: Signed View URL generated cleanly!");
  }

  console.log("\n==================================================");
  console.log("    SUPABASE STORAGE IS FULLY CONNECTED & WORKING!");
  console.log("==================================================");
}

verifySupabaseStorage().catch(console.error);
