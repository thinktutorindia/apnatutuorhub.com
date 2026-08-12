const fs = require("fs");
const path = require("path");

const dirs = [
  path.join(process.cwd(), "components", "tutor", "onboarding"),
  path.join(process.cwd(), "app", "tutor", "onboarding")
];

function sanitizeFile(filePath) {
  const buf = fs.readFileSync(filePath);
  let changed = false;
  const out = [];

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 128) {
      out.push(b);
    } else {
      changed = true;
      if (b === 0x97 || b === 0x96) {
        out.push(0x2D); // '-'
      } else if (b === 0x91 || b === 0x92) {
        out.push(0x27); // "'"
      } else if (b === 0x93 || b === 0x94) {
        out.push(0x22); // '"'
      } else if (b === 0xB7) {
        out.push(0x20, 0x2D, 0x20); // ' - '
      } else {
        out.push(0x20); // space
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, Buffer.from(out));
    console.log("Sanitized:", filePath);
  } else {
    console.log("Already clean:", filePath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(f)) {
      sanitizeFile(full);
    }
  }
}

dirs.forEach(walk);
