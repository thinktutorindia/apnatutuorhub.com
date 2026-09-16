async function checkLocal() {
  try {
    const res = await fetch("http://localhost:3000");
    console.log("Localhost:3000 Status:", res.status);
  } catch (err: any) {
    console.log("Localhost:3000 not responding:", err.message);
  }
}
checkLocal();
