async function testSimulate() {
  const res = await fetch("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hi", useAi: true })
  });
  console.log("POST /api/chatbot/simulate status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}

testSimulate();
