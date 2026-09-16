async function checkPages() {
  try {
    const res1 = await fetch("http://localhost:3000/test-chatbot");
    console.log("/test-chatbot status:", res1.status);

    const res2 = await fetch("http://localhost:3000/api/chatbot/simulate?phone=919311459543");
    console.log("/api/chatbot/simulate status:", res2.status);
    const data = await res2.json();
    console.log("Simulate session:", data);
  } catch (err: any) {
    console.error("Fetch error:", err.message);
  }
}

checkPages();
