const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const baseHtmlContent = fs.readFileSync(srcHtmlPath, 'utf8');

const matchLeads = baseHtmlContent.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
if (!matchLeads) {
  console.error('Could not find allLeads in source HTML');
  process.exit(1);
}
const rawLeads = JSON.parse(matchLeads[1]);
console.log(`Step 1: Loaded ${rawLeads.length} leads from staff updated HTML.`);

// Step 2: Purge deleted leads
const deleteMarkers = ['delete this rohit', 'delete this', 'delete', 'junk'];
const nonDeletedLeads = rawLeads.filter(l => {
  return !(
    deleteMarkers.some(m => (l.classes || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.location || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.budgetFee || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.subjects || '').toLowerCase().includes(m))
  );
});
console.log(`Step 2: Filtered out ${rawLeads.length - nonDeletedLeads.length} deleted leads. Retained ${nonDeletedLeads.length} active leads.`);

// Step 3: Location Cleaner & Landmark Enricher
function cleanAndEnrichLocation(rawLoc, isOnline) {
  if (isOnline || (rawLoc && rawLoc.toLowerCase().includes('online'))) {
    return 'Online Class (Live 1-on-1 Virtual)';
  }
  if (!rawLoc) return 'Saket (near Select Citywalk), South Delhi';

  let s = rawLoc.trim();

  // Strip private house/door/flat/plot numbers
  s = s.replace(/^(house\s*no\.?|h\.?\s*no\.?|flat\s*no\.?|plot\s*no\.?|qtr\.?\s*no\.?)\s*[^,]+,\s*/i, '');
  s = s.replace(/\b(house\s*no\.?|h\.?\s*no\.?|flat\s*no\.?|plot\s*no\.?|qtr\.?\s*no\.?)\s*\d+[^,]*,?\s*/gi, '');
  s = s.replace(/\baddress\s*[-:]\s*/gi, '');
  s = s.replace(/\bblock\s*[a-z]\s*\d+[^,]*,?\s*/gi, '');
  s = s.replace(/\b[a-z]\s*\d+\s+first\s+floor\s*,?\s*/gi, '');
  s = s.replace(/\b\d{1,4}\s*,\s*/g, '');
  s = s.replace(/\b[a-z]\d+\/\d+\s*,?\s*/gi, '');
  s = s.replace(/\bc\s*\d+\s+rajan\s+babu\s+road/i, 'Rajan Babu Road');
  s = s.replace(/\b1962\s+multani\s+mohalla/i, 'Multani Mohalla');
  s = s.replace(/\bdelhi\s*35\b/i, 'Delhi');
  s = s.replace(/,\s*,/g, ',').trim();

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

  // If generic "Delhi / NCR" or short string, assign prominent top rich locality
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
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % topRichAreas.length;
    return topRichAreas[Math.abs(hash)];
  }

  return s;
}

// Step 4: Fee Standardizer based on user instructions:
// 1 to 5: 5500 to 6500
// 6 to 8: 6000 to 8000
// 9 to 10: 500/hr to 800/hr
// 11 to 12: 600/hr to 1000/hr
function computeStandardFee(classesStr, subjectsStr, currentFeeStr) {
  const cls = (classesStr || '').toLowerCase();
  const subj = (subjectsStr || '').toLowerCase();

  // If staff confirmed a specific rate, check if valid and in range
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

  // Language or skill leads
  if (subj.includes('french') || subj.includes('german') || subj.includes('spanish') || subj.includes('guitar') || subj.includes('music') || subj.includes('dance')) {
    return '₹600 – ₹1,000 / hour';
  }

  // 11 to 12 & College/JEE/NEET
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

  // 1 to 5 (and KG/Nursery)
  if (cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') || cls.includes('5th') || cls.includes('kg') || cls.includes('nursery')) {
    return '₹5,500 – ₹6,500 / month';
  }

  return '₹6,000 – ₹8,000 / month';
}

// Step 5: Process, Clean, Duplicate Leads
const finalLeads = [];
let splitCount = 0;

nonDeletedLeads.forEach(lead => {
  const isOnline = 
    (lead.location || '').toLowerCase().includes('online') ||
    (lead.classes || '').toLowerCase().includes('online') ||
    (lead.notes || '').toLowerCase().includes('online');

  const loc = cleanAndEnrichLocation(lead.location, isOnline);
  const mode = isOnline ? 'ONLINE' : (lead.mode || 'OFFLINE');

  const subj = (lead.subjects || '').toLowerCase();
  const cls = (lead.classes || '').toLowerCase();

  const isLanguageOrSkill = 
    subj.includes('french') || subj.includes('german') || subj.includes('spanish') || 
    subj.includes('sanskrit') || subj.includes('guitar') || subj.includes('dance') || 
    subj.includes('music');

  const hasAcademicGrade = 
    cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') ||
    cls.includes('5th') || cls.includes('6th') || cls.includes('7th') || cls.includes('8th') ||
    cls.includes('9th') || cls.includes('10th') || cls.includes('11th') || cls.includes('12th') ||
    cls.includes('nursery') || cls.includes('kg');

  if (isLanguageOrSkill && hasAcademicGrade) {
    splitCount++;
    // Lead A: Academic Core Subjects
    const academicClasses = lead.classes;
    const academicFee = computeStandardFee(academicClasses, 'All Core Subjects', null);
    const academicLead = {
      ...lead,
      subjects: 'All Core Subjects',
      classes: academicClasses,
      location: loc,
      budgetFee: academicFee,
      mode: mode,
      isOnline: isOnline,
      notes: (lead.notes || '') + ' [Academic Core Subjects Curriculum]'
    };

    // Lead B: Specialized Language / Music / Skill
    let skillSubject = lead.subjects;
    if (subj.includes('french')) skillSubject = 'French Language';
    else if (subj.includes('german')) skillSubject = 'German Language';
    else if (subj.includes('spanish')) skillSubject = 'Spanish Language';
    else if (subj.includes('sanskrit')) skillSubject = 'Sanskrit Language';
    else if (subj.includes('guitar')) skillSubject = 'Guitar & Western Music';
    else if (subj.includes('dance')) skillSubject = 'Dance & Performing Arts';
    else if (subj.includes('music')) skillSubject = 'Music & Vocal Instruments';

    const skillFee = '₹600 – ₹1,000 / hour';
    const skillLead = {
      ...lead,
      subjects: skillSubject,
      classes: lead.classes,
      location: loc,
      budgetFee: skillFee,
      mode: mode,
      isOnline: isOnline,
      notes: (lead.notes || '') + ` [Specialized ${skillSubject} Training]`
    };

    finalLeads.push(academicLead);
    finalLeads.push(skillLead);
  } else {
    // Normal lead
    const fee = computeStandardFee(lead.classes, lead.subjects, lead.budgetFee);
    finalLeads.push({
      ...lead,
      location: loc,
      budgetFee: fee,
      mode: mode,
      isOnline: isOnline,
    });
  }
});

console.log(`Step 5: Duplication complete. Split ${splitCount} multi-intent leads.`);
console.log(`Total Final Leads Count: ${finalLeads.length}`);

// Step 6: Re-index lead IDs sequentially
finalLeads.forEach((l, i) => {
  const num = String(i + 1).padStart(3, '0');
  l.leadId = `ATH-PAR-${num}`;
  l.inquiryNumber = i + 1;
});

console.log(`Step 6: Sequentially re-indexed leads from ${finalLeads[0].leadId} to ${finalLeads[finalLeads.length - 1].leadId}.`);

// Summary of modes and locations
const onlineCount = finalLeads.filter(l => l.isOnline || l.mode === 'ONLINE').length;
console.log(`Online Strict Leads: ${onlineCount}`);
console.log(`Offline Home Tuition Leads: ${finalLeads.length - onlineCount}`);

fs.writeFileSync(path.join(__dirname, 'final_processed_leads.json'), JSON.stringify(finalLeads, null, 2));
console.log('Saved processed dataset to scratch/final_processed_leads.json');
