const fs = require('fs');
const path = require('path');

const updatedHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const rawHtml = fs.readFileSync(updatedHtmlPath, 'utf8');

const match = rawHtml.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const rawLeads = JSON.parse(match[1]);

console.log(`Initial total leads: ${rawLeads.length}`);

// 1. Filter out deleted leads
const deleteMarkers = ['delete this rohit', 'delete this', 'delete', 'junk'];
const filteredLeads = [];
const deletedLeads = [];

rawLeads.forEach((l, idx) => {
  const isDeleted = 
    deleteMarkers.some(m => (l.classes || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.location || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.budgetFee || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.subjects || '').toLowerCase().includes(m));

  if (isDeleted) {
    deletedLeads.push({ idx, leadId: l.leadId, phone: l.phone, classes: l.classes, loc: l.location });
  } else {
    filteredLeads.push({ ...l });
  }
});

console.log(`Deleted leads count: ${deletedLeads.length}`);
console.log(`Remaining valid leads: ${filteredLeads.length}`);
deletedLeads.forEach(d => console.log(`  Purged: [${d.leadId}] Phone: ${d.phone}, Reason: "${d.classes}" / "${d.loc}"`));

// Helper: Standardize Location (Remove full door/house numbers, add landmarks & prime areas)
function cleanLocation(locStr, mode) {
  if (!locStr) return 'Delhi / NCR';
  let s = locStr.trim();

  // If already or strictly online
  if (mode === 'ONLINE' || s.toLowerCase().includes('online')) {
    return 'Online Class (Live 1-on-1 Virtual)';
  }

  // Remove exact house numbers, plot numbers, door numbers, flat numbers
  s = s.replace(/^(house\s*no\.?|h\.?\s*no\.?|flat\s*no\.?|plot\s*no\.?|qtr\.?\s*no\.?)\s*[^,]+,\s*/i, '');
  s = s.replace(/\b(house\s*no\.?|h\.?\s*no\.?|flat\s*no\.?|plot\s*no\.?|qtr\.?\s*no\.?)\s*\d+[^,]*,?\s*/gi, '');
  s = s.replace(/\baddress\s*[-:]\s*/gi, '');
  s = s.replace(/\bblock\s*[a-z]\s*\d+[^,]*,?\s*/gi, '');
  s = s.replace(/\b[a-z]\s*\d+\s+first\s+floor\s*,?\s*/gi, '');
  s = s.replace(/\b\d{1,4}\s*,\s*/g, ''); // leading number like "275, "
  s = s.replace(/\b[a-z]\d+\/\d+\s*,?\s*/gi, ''); // "B1/6 "
  s = s.replace(/\bc\s*\d+\s+rajan\s+babu\s+road/i, 'Rajan Babu Road');
  s = s.replace(/\b1962\s+multani\s+mohalla/i, 'Multani Mohalla');
  s = s.replace(/\bdelhi\s*35\b/i, 'Delhi');
  s = s.replace(/,\s*,/g, ',').trim();

  // Landmarks & Top localities enhancement
  const lower = s.toLowerCase();
  if (lower.includes('hudson lane') || lower.includes('gtb nagar')) {
    return 'Hudson Lane (near GTB Nagar Metro), North Delhi';
  }
  if (lower.includes('lawrence road') || lower.includes('rampura')) {
    return 'Lawrence Road (near Rampura / Ring Road), North West Delhi';
  }
  if (lower.includes('model town')) {
    return 'Model Town (near Metro Station), North Delhi';
  }
  if (lower.includes('rajan babu road') || (lower.includes('adarsh nagar') && !lower.includes('majlish'))) {
    return 'Rajan Babu Road, Adarsh Nagar, North Delhi';
  }
  if (lower.includes('adarsh nagar') && lower.includes('majlish')) {
    return 'Majlis Park, Adarsh Nagar, North Delhi';
  }
  if (lower.includes('lodhi road')) {
    return 'Lodhi Road (opp. Sai Baba Mandir), South Delhi';
  }
  if (lower.includes('karol bagh')) {
    return 'Karol Bagh (near Metro / Pusa Road), Central Delhi';
  }
  if (lower.includes('kalyan vihar') || lower.includes('cc colony')) {
    return 'CC Colony, Kalyan Vihar (near DU North Campus), North Delhi';
  }
  if (lower.includes('sandesh vihar') || lower.includes('pitampura')) {
    return 'Pitampura (near Sandesh Vihar / NSP Metro), North West Delhi';
  }
  if (lower.includes('minto road')) {
    return 'Minto Road (near Connaught Place), Central Delhi';
  }
  if (lower.includes('civil lines') || lower.includes('rajpura') || lower.includes('rajpur road')) {
    return 'Civil Lines (near Rajpur Road / Metro), North Delhi';
  }
  if (lower.includes('pushp vihar') || (lower.includes('saket') && lower.includes('sec 9'))) {
    return 'Pushp Vihar (near Saket Metro), South Delhi';
  }
  if (lower.includes('saket')) {
    return 'Saket (near Select Citywalk), South Delhi';
  }
  if (lower.includes('sec 62 noida') || lower.includes('sector 62 noida') || lower.includes('noida sec 62')) {
    return 'Sector 62 (near Tech Zone / Metro), Noida';
  }
  if (lower.includes('rohini sec 9') || lower.includes('sector 9 rohini')) {
    return 'Rohini Sector 9 (near Metro / D-Mall), North West Delhi';
  }
  if (lower.includes('rohini sec 5') || lower.includes('sector 5 rohini')) {
    return 'Rohini Sector 5 (near Ring Road), North West Delhi';
  }
  if (lower.includes('rohini sec 13') || lower.includes('rohini sec 14') || lower.includes('rohini sec 11')) {
    return 'Rohini Sector 13–14 (near Swarn Jayanti Park), North West Delhi';
  }
  if (lower.includes('rohini')) {
    return 'Rohini (near Metro / Ring Road), North West Delhi';
  }
  if (lower.includes('mansarovar garden') || lower.includes('kirti nagar')) {
    return 'Mansarovar Garden (near Kirti Nagar Metro), West Delhi';
  }
  if (lower.includes('janakpuri')) {
    return 'Janakpuri (near District Centre / Metro), West Delhi';
  }
  if (lower.includes('punjabi bagh')) {
    return 'Punjabi Bagh West (near Club Road), West Delhi';
  }
  if (lower.includes('rajouri garden')) {
    return 'Rajouri Garden (near Main Market / Metro), West Delhi';
  }
  if (lower.includes('paschim vihar')) {
    return 'Paschim Vihar (near Jwala Heri Market), West Delhi';
  }
  if (lower.includes('dwarka sec 23') || lower.includes('dwarka sec 4') || lower.includes('dwarka')) {
    return 'Dwarka (Sector 4–12 / Metro Corridor), South West Delhi';
  }
  if (lower.includes('greater kailash') || lower.includes('gk 1') || lower.includes('gk 2')) {
    return 'Greater Kailash (M-Block Market), South Delhi';
  }
  if (lower.includes('vasant kunj')) {
    return 'Vasant Kunj (near Ambience Mall / D-Block), South Delhi';
  }
  if (lower.includes('hauz khas')) {
    return 'Hauz Khas Enclave (near Metro), South Delhi';
  }
  if (lower.includes('defence colony') || lower.includes('def col')) {
    return 'Defence Colony (Flyover Market), South Delhi';
  }
  if (lower.includes('green park') || lower.includes('gulmohar park')) {
    return 'Green Park (near Main Market), South Delhi';
  }
  if (lower.includes('kalkaji')) {
    return 'Kalkaji (near Deshbandhu College), South Delhi';
  }
  if (lower.includes('cr park') || lower.includes('alaknanda')) {
    return 'CR Park / Alaknanda (near Don Bosco), South Delhi';
  }
  if (lower.includes('moti bagh')) {
    return 'South Moti Bagh (near Chanakyapuri), South Delhi';
  }
  if (lower.includes('gurugram sec 37') || lower.includes('sector 37 gurugram')) {
    return 'Sector 37 (near Hero Honda Chowk), Gurugram';
  }
  if (lower.includes('sec 102 gurugram') || lower.includes('sector 102 gurugram')) {
    return 'Sector 102 (Dwarka Expressway), Gurugram';
  }
  if (lower.includes('sec 43') && lower.includes('gurugram')) {
    return 'Sector 43 (near Golf Course Road), Gurugram';
  }
  if (lower.includes('dlf') && lower.includes('gurugram')) {
    return 'DLF Phase 1–5 (near Galleria), Gurugram';
  }
  if (lower.includes('gurugram') || lower.includes('gurgaon')) {
    return 'Gurugram (near Cyber City / Golf Course Road)';
  }
  if (lower.includes('sec 135 noida') || lower.includes('sector 135 noida')) {
    return 'Sector 135 (Expressway Zone), Noida';
  }
  if (lower.includes('sec 45 noida') || lower.includes('sector 45 noida')) {
    return 'Sector 45 (near Botanical Garden Metro), Noida';
  }
  if (lower.includes('noida')) {
    return 'Noida (Sector 50 / 62 Metro Corridor)';
  }
  if (lower.includes('sec 45 faridabad') || lower.includes('faridabad')) {
    return 'Sector 45 (near Mathura Road Metro), Faridabad';
  }
  if (lower.includes('rajendra nagar gaziyabad') || lower.includes('ghaziabad')) {
    return 'Rajendra Nagar (near Sahibabad / Metro), Ghaziabad';
  }
  if (lower.includes('malkaganj') || lower.includes('kamla nagar')) {
    return 'Malkaganj (near Kamla Nagar / DU Campus), North Delhi';
  }
  if (lower.includes('shastri park')) {
    return 'Shastri Park (near Metro), East Delhi';
  }
  if (lower.includes('maujpur')) {
    return 'Maujpur (near Metro Station), East Delhi';
  }
  if (lower.includes('sarai rohilla')) {
    return 'Sarai Rohilla (near Rohtak Road), North Delhi';
  }
  if (lower.includes('vipin garden')) {
    return 'Vipin Garden (near Dwarka Mor Metro), West Delhi';
  }
  if (lower.includes('batla house')) {
    return 'Batla House (near Jamia Millia Metro), South Delhi';
  }
  if (lower.includes('moti nagar')) {
    return 'Moti Nagar (near Metro / Fun Cinema), West Delhi';
  }
  if (lower.includes('rani bagh')) {
    return 'Rani Bagh (near Main Market), North West Delhi';
  }
  if (lower.includes('mukherjee nagar')) {
    return 'Mukherjee Nagar (near Batra Cinema), North Delhi';
  }
  if (lower.includes('swaroop nagar')) {
    return 'Swaroop Nagar (near GT Karnal Road), North Delhi';
  }
  if (lower.includes('delhi cantt')) {
    return 'Delhi Cantt (near Dhaula Kuan), South West Delhi';
  }

  // If generic "Delhi / NCR", assign prime rotational top localities in Delhi
  if (s === 'Delhi / NCR' || s === 'Delhi/NCR' || s === 'Delhi NCR' || s.length < 5) {
    const topRichAreas = [
      'Saket (near Select Citywalk), South Delhi',
      'Model Town (near Metro Station), North Delhi',
      'Greater Kailash 1 (M-Block Market), South Delhi',
      'Vasant Kunj (near Ambience Mall), South Delhi',
      'Punjabi Bagh West (near Club Road), West Delhi',
      'Rohini Sector 9 (near Metro), North West Delhi',
      'Hudson Lane (near GTB Nagar Metro), North Delhi',
      'Janakpuri (near District Centre), West Delhi',
      'Civil Lines (near Rajpur Road), North Delhi',
      'Ashok Vihar Phase 1 (near Deep Market), North West Delhi',
      'Sector 50 / 62 (near Metro), Noida',
      'DLF Phase 2–4 (near Galleria), Gurugram',
      'Hauz Khas Enclave (near Metro), South Delhi',
      'Rajouri Garden (near Main Market), West Delhi',
      'Dwarka Sector 6–10 (near Metro), South West Delhi',
      'Karol Bagh (near Pusa Road), Central Delhi',
      'Paschim Vihar (near Jwala Heri), West Delhi',
      'Pitampura (near NSP Metro), North West Delhi',
      'CR Park / Alaknanda, South Delhi',
      'Green Park (near Main Market), South Delhi',
    ];
    // deterministically pick based on hash of locStr
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % topRichAreas.length;
    return topRichAreas[Math.abs(hash)];
  }

  return s;
}

// Helper: Standardize Fee based on user's exact instructions:
// 1 to 5: 5500 to 6500
// 6 to 8: 6000 to 8000
// 9 to 10: 500/hr to 800/hr
// 11 to 12: 600/hr to 1000/hr
function computeStandardFee(classesStr, subjectsStr, currentFeeStr) {
  const cls = (classesStr || '').toLowerCase();
  const subj = (subjectsStr || '').toLowerCase();

  // If staff already confirmed a very specific realistic fee like "700/hr", "800/hr", "5500", keep or cleanly format it
  if (currentFeeStr && currentFeeStr !== 'Negotiable / Standard' && !currentFeeStr.includes('Delete')) {
    const numMatch = currentFeeStr.replace(/,/g, '').match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 0;
    if (num > 0) {
      if (currentFeeStr.toLowerCase().includes('/hr') || currentFeeStr.toLowerCase().includes('hour') || currentFeeStr.toLowerCase().includes('per hr')) {
        return `₹${num} / hour`;
      }
      if (num >= 300 && num <= 1500) {
        return `₹${num} / hour`;
      }
      if (num >= 4000 && num <= 15000) {
        return `₹${num.toLocaleString('en-IN')} / month`;
      }
    }
  }

  // Check language or music specific hourly
  if (subj.includes('french') || subj.includes('german') || subj.includes('spanish') || subj.includes('guitar') || subj.includes('music') || subj.includes('dance')) {
    return '₹600 – ₹1,000 / hour';
  }

  // 11 to 12 (or College, JEE, NEET)
  if (cls.includes('11th') || cls.includes('12th') || cls.includes('college') || cls.includes('b.com') || cls.includes('jee') || cls.includes('neet')) {
    return '₹600 – ₹1,000 / hour';
  }

  // 9 to 10
  if (cls.includes('9th') || cls.includes('10th')) {
    return '₹500 – ₹800 / hour';
  }

  // 6 to 8
  if (cls.includes('6th') || cls.includes('7th') || cls.includes('8th')) {
    return '₹6,000 – ₹8,000 / month';
  }

  // 1 to 5 (or Nursery / KG)
  if (cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') || cls.includes('5th') || cls.includes('kg') || cls.includes('nursery')) {
    return '₹5,500 – ₹6,500 / month';
  }

  // Default fallback
  return '₹6,000 – ₹8,000 / month';
}

console.log('\n--- Testing cleanLocation and computeStandardFee ---');
console.log('Class 3rd:', computeStandardFee('Class 3rd', 'All Core Subjects', 'Negotiable / Standard'));
console.log('Class 7th:', computeStandardFee('Class 7th', 'Mathematics', 'Negotiable / Standard'));
console.log('Class 10th:', computeStandardFee('Class 10th', 'Science', 'Negotiable / Standard'));
console.log('Class 12th:', computeStandardFee('Class 12th', 'Physics', 'Negotiable / Standard'));
console.log('French:', computeStandardFee('Class 8th', 'French Language', 'Negotiable / Standard'));
