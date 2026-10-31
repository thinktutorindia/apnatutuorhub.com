import { processMessage } from "../../lib/whatsapp-bot/engine";
import { BotSession } from "../../lib/whatsapp-bot/session";

async function runExtremeTests() {
  console.log("=== RUNNING WHATSAPP CHATBOT EXTREME CONDITION TESTS ===\n");

  const baseSession: BotSession = {
    id: "test-session-123",
    phone: "919711855879",
    userType: "TUTOR",
    step: "DONE",
    data: {
      _registered: true,
      name: "Bhatia",
      area: "Khanpur",
      city: "Delhi",
      subjects: ["All Subjects"],
      classLevel: "Class 1-8",
    },
    retries: 0,
  };

  const sampleChatHistory = [
    {
      direction: "OUTBOUND",
      body: "**TUITION ENQUIRY: ##ATH-5\n*Client Name:* Tutor\n*Class:* Class 4\n*Mode:* Home Tuition\n*Location:* Khanpur Extension, Delhi\n*Fees:* ₹3,600-₹3,750/mo",
      createdAt: new Date(Date.now() - 60000),
      senderName: "System",
    },
    {
      direction: "INBOUND",
      body: "Fees is less",
      createdAt: new Date(Date.now() - 40000),
      senderName: "Bhatia",
    },
    {
      direction: "OUTBOUND",
      body: "Ji bilkul! Humari classes mein standard fees market rates ke hisaab se hoti hai — jaise Class 1-5 ke liye ₹6,000–₹6,800/month aur senior classes ke liye hourly rates. 📚 Aapko kis class ya subject ke liye fee discuss karni hai?",
      createdAt: new Date(Date.now() - 25000),
      senderName: "Bot",
    },
  ];

  // Test 1: Exact Screenshot message ("Ye kay hai fir?" with forwarded text)
  console.log("--- TEST 1: Exact Screenshot Case ('Ye kay hai fir?' after fee complaint) ---");
  const test1Input = "My Post Paid\n📞 *Thank You for Calling!*\nHere is the tuition enquiry assigned to you:...\nYe kay hai fir?";
  const res1 = await processMessage(baseSession, test1Input, { chatHistory: sampleChatHistory });
  console.log("INPUT:", test1Input.replace(/\n/g, " "));
  console.log("REPLY:\n" + res1.reply);
  console.log("BUTTONS:", res1.quickReplies);
  const test1Pass = !res1.reply.includes("Main ApnaTutorHub se Priya bol rahi hoon") && res1.reply.includes("proposed budget");
  console.log("TEST 1 RESULT:", test1Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 2: "Fees is less" / "Budget kam hai"
  console.log("\n--- TEST 2: 'Fees is less' ---");
  const res2 = await processMessage(baseSession, "Fees is less", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res2.reply);
  const test2Pass = res2.reply.includes("0% commission") && (res2.reply.includes("proposed budget") || res2.reply.includes("standard fees"));
  console.log("TEST 2 RESULT:", test2Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 3: "Parent call nahi utha rahe"
  console.log("\n--- TEST 3: 'Parent call nahi utha rahe' ---");
  const res3 = await processMessage(baseSession, "Sir parent call nahi utha rahe hai switched off aa raha hai", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res3.reply);
  const test3Pass = res3.reply.includes("refund") && res3.reply.includes("WhatsApp");
  console.log("TEST 3 RESULT:", test3Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 4: "Leads kyu nahi aa rahi"
  console.log("\n--- TEST 4: 'Leads kyu nahi aa rahi' ---");
  const res4 = await processMessage(baseSession, "Mujhe koi lead nahi mili abhi tak leads kyu nahi aa rahi", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res4.reply);
  const test4Pass = res4.reply.includes("instant WhatsApp alert") || res4.reply.includes("leads");
  console.log("TEST 4 RESULT:", test4Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 5: "Samajh nahi aaya" from registered tutor
  console.log("\n--- TEST 5: 'Samajh nahi aaya' from registered tutor ---");
  const res5 = await processMessage(baseSession, "Kuch samajh nahi aa raha", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res5.reply);
  const test5Pass = !res5.reply.includes("Tutor hain to *1*, parent hain to *2*") && res5.reply.toLowerCase().includes("leads");
  console.log("TEST 5 RESULT:", test5Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 6: Distance Complaint ("15 km door hai")
  console.log("\n--- TEST 6: 'Location bahut door hai 15km' ---");
  const res6 = await processMessage(baseSession, "Ye location bahut door hai 15 km travel nahi kar sakta", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res6.reply);
  const test6Pass = res6.reply.includes("Online") && res6.reply.includes("leads");
  console.log("TEST 6 RESULT:", test6Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 7: Staff Complaint / Fraud accusation
  console.log("\n--- TEST 7: 'Fraud company chor platform' ---");
  const res7 = await processMessage(baseSession, "Ye fraud platform hai chor company", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res7.reply);
  const test7Pass = res7.reply.includes("08062180653") && res7.reply.includes("Helpline");
  console.log("TEST 7 RESULT:", test7Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 8: Inbound "No" / "Ni" (Decline)
  console.log("\n--- TEST 8: 'No' / 'Ni' (Decline response) ---");
  const res8 = await processMessage(baseSession, "No", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res8.reply);
  const test8Pass = !res8.reply.includes("Thoda clear nahi hua") && (res8.reply.includes("Theek hai") || res8.reply.includes("koi baat nahi"));
  console.log("TEST 8 RESULT:", test8Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 9: Inbound "👋" / "🙏" (Emoji Greeting)
  console.log("\n--- TEST 9: '👋' (Emoji greeting) ---");
  const res9 = await processMessage(baseSession, "👋", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res9.reply);
  const test9Pass = !res9.reply.includes("Thoda clear nahi hua") && res9.reply.includes("Namaste");
  console.log("TEST 9 RESULT:", test9Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 10: Inbound "1" (Broadcast acceptance in DONE state)
  console.log("\n--- TEST 10: '1' in reply to broadcast ---");
  const res10 = await processMessage(baseSession, "1", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res10.reply);
  const test10Pass = res10.reply.includes("Zabardast") && res10.reply.includes("leads");
  console.log("TEST 10 RESULT:", test10Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 11: Inbound "2" (Plans/Coins in DONE state)
  console.log("\n--- TEST 11: '2' (Plans/Coins) in DONE state ---");
  const res11 = await processMessage(baseSession, "2", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res11.reply);
  const test11Pass = res11.reply.includes("₹") || res11.reply.includes("Coins") || res11.reply.includes("Plan");
  console.log("TEST 11 RESULT:", test11Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 12: Inbound "these info are wrong" (Wrong info / bad lead)
  console.log("\n--- TEST 12: 'these info are wrong' ---");
  const res12 = await processMessage(baseSession, "these info are wrong", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res12.reply);
  const test12Pass = res12.reply.includes("Report note kar li gayi hai") || res12.reply.includes("refund");
  console.log("TEST 12 RESULT:", test12Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 13: Inbound "Hi" from registered tutor
  console.log("\n--- TEST 13: 'Hi' from registered tutor ---");
  const res13 = await processMessage(baseSession, "Hi", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res13.reply);
  const test13Pass = !res13.reply.includes("1 - Tutor") && !res13.reply.includes("1 - English") && res13.reply.includes("Bhatia");
  console.log("TEST 13 RESULT:", test13Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 14: Inbound "5pm" at T_TIMING for onboarding tutor
  console.log("\n--- TEST 14: '5pm' at T_TIMING step for onboarding tutor ---");
  const onboardingSession: BotSession = {
    id: "test-onboarding-123",
    phone: "919876543210",
    userType: "TUTOR",
    step: "T_TIMING",
    data: { name: "Ananya", city: "Delhi", area: "Rohini", subjects: ["Maths"], classLevel: "Class 1-8" },
    retries: 0,
  };
  const res14 = await processMessage(onboardingSession, "5pm", { chatHistory: [] });
  console.log("REPLY:\n" + res14.reply);
  console.log("NEXT STEP:", res14.nextStep);
  // Accepts timing and progresses forward (does NOT fail with "invalid input")
  const test14Pass = !res14.reply.includes("Thoda clear nahi hua") && !res14.reply.includes("Invalid");
  console.log("TEST 14 RESULT:", test14Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 15: Account Deactivation request
  console.log("\n--- TEST 15: 'Delete my account' ---");
  const res15 = await processMessage(baseSession, "Mera account delete kar do please", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res15.reply);
  const test15Pass = res15.reply.includes("STOP") && res15.reply.includes("deactivate");
  console.log("TEST 15 RESULT:", test15Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 16: Devanagari Hindi "नमस्ते"
  console.log("\n--- TEST 16: Devanagari Hindi 'नमस्ते' ---");
  const res16 = await processMessage(baseSession, "नमस्ते", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res16.reply);
  const test16Pass = !res16.reply.includes("Thoda clear nahi hua") && (res16.reply.includes("Namaste") || res16.reply.includes("नमस्ते") || res16.reply.includes("Bhatia"));
  console.log("TEST 16 RESULT:", test16Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 17: Devanagari Hindi "नहीं"
  console.log("\n--- TEST 17: Devanagari Hindi 'नहीं' ---");
  const res17 = await processMessage(baseSession, "नहीं", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res17.reply);
  const test17Pass = !res17.reply.includes("Thoda clear nahi hua") && (res17.reply.includes("Theek hai") || res17.reply.includes("koi baat nahi"));
  console.log("TEST 17 RESULT:", test17Pass ? "PASSED ✅" : "FAILED ❌\n");

  // Test 18: Indian 6-digit Pincode query
  console.log("\n--- TEST 18: Indian Pincode '110062 mein koi class hai?' ---");
  const res18 = await processMessage(baseSession, "110062 mein koi class hai?", { chatHistory: sampleChatHistory });
  console.log("REPLY:\n" + res18.reply);
  const test18Pass = res18.reply.includes("Delhi") || res18.reply.includes("Pincode 110062") || res18.reply.includes("requirement");
  console.log("TEST 18 RESULT:", test18Pass ? "PASSED ✅" : "FAILED ❌\n");

  console.log("\n=======================================================");
  const allPass =
    test1Pass &&
    test2Pass &&
    test3Pass &&
    test4Pass &&
    test5Pass &&
    test6Pass &&
    test7Pass &&
    test8Pass &&
    test9Pass &&
    test10Pass &&
    test11Pass &&
    test12Pass &&
    test13Pass &&
    test14Pass &&
    test15Pass &&
    test16Pass &&
    test17Pass &&
    test18Pass;
  console.log("ALL EXTREME CONDITION TESTS SUMMARY:", allPass ? "ALL 18 PASSED! 🚀🎉" : "SOME FAILED ⚠️");
}

runExtremeTests().catch(console.error);
