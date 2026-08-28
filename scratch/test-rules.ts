// Test comprehensive name, location, and subject extraction

function testLeadExtraction(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  // Test various snippets
  console.log("Snippet:", text);
}
