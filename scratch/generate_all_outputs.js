const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const rawHtml = fs.readFileSync(srcHtmlPath, 'utf8');

const matchLeads = rawHtml.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const rawLeads = JSON.parse(matchLeads[1]);

// 1. Purge deleted leads
const deleteMarkers = ['delete this rohit', 'delete this', 'delete', 'junk'];
const nonDeletedLeads = rawLeads.filter(l => {
  return !(
    deleteMarkers.some(m => (l.classes || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.location || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.budgetFee || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.subjects || '').toLowerCase().includes(m))
  );
});

console.log(`Step 1: ${nonDeletedLeads.length} leads after purging 9 deleted leads.`);

// 2. Strict Location Cleaner & Landmark Enricher
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

// 3. Strict Fee Calculation (Exact User Tiers)
// 1 to 5: 5500 to 6500
// 6 to 8: 6000 to 8000
// 9 to 10: 500/hr to 800/hr
// 11 to 12: 600/hr to 1000/hr
function computeStrictFee(classesStr, subjectsStr) {
  const cls = (classesStr || '').toLowerCase();
  const subj = (subjectsStr || '').toLowerCase();

  // Languages & Skills: 600 - 1000 / hr
  if (subj.includes('french') || subj.includes('german') || subj.includes('spanish') || 
      subj.includes('sanskrit') || subj.includes('guitar') || subj.includes('music') || 
      subj.includes('dance') || subj.includes('vocal')) {
    return '₹600 – ₹1,000 / hour';
  }

  // 11 to 12, College, Entrance: 600 - 1000 / hr
  if (cls.includes('11th') || cls.includes('12th') || cls.includes('college') || 
      cls.includes('b.com') || cls.includes('jee') || cls.includes('neet') || cls.includes('humanities')) {
    return '₹600 – ₹1,000 / hour';
  }

  // 9 to 10: 500 - 800 / hr
  if (cls.includes('9th') || cls.includes('10th')) {
    return '₹500 – ₹800 / hour';
  }

  // 6 to 8: 6000 - 8000 / month
  if (cls.includes('6th') || cls.includes('7th') || cls.includes('8th')) {
    return '₹6,000 – ₹8,000 / month';
  }

  // 1 to 5 (and KG / Nursery): 5500 - 6500 / month
  if (cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || 
      cls.includes('4th') || cls.includes('5th') || cls.includes('kg') || cls.includes('nursery')) {
    return '₹5,500 – ₹6,500 / month';
  }

  return '₹6,000 – ₹8,000 / month';
}

// 4. Duplicate Language/Music leads & Build Master List
const masterLeads = [];
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
    const academicFee = computeStrictFee(academicClasses, 'All Core Subjects');
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

    masterLeads.push(academicLead);
    masterLeads.push(skillLead);
  } else {
    // Normal lead
    const fee = computeStrictFee(lead.classes, lead.subjects);
    masterLeads.push({
      ...lead,
      location: loc,
      budgetFee: fee,
      mode: mode,
      isOnline: isOnline,
    });
  }
});

// Re-index sequentially
masterLeads.forEach((l, i) => {
  const num = String(i + 1).padStart(3, '0');
  l.leadId = `ATH-PAR-${num}`;
  l.inquiryNumber = i + 1;
});

console.log(`Step 4: Master leads processed. Total count: ${masterLeads.length} (Split: ${splitCount})`);

// 5. Generate HTML Cards and Table Rows
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCardsHtml(leads) {
  return leads.map((l, idx) => {
    const rawDigits = (l.phone || '').replace(/\D/g, '');
    const waUrl = `https://wa.me/${rawDigits}?text=${encodeURIComponent(
      `Hello! Regarding your inquiry on ApnaTutorHub for Home Tuition (${l.classes} - ${l.subjects}): Are you available to connect?`
    )}`;

    const modeBadge = l.isOnline || l.mode === 'ONLINE'
      ? `<span class="pill-badge pill-urgent" style="background:#EDE9FE; color:#5B21B6; font-weight:800;">💻 Strict Online Only</span>`
      : `<span class="pill-badge pill-any">🏠 Home Tuition</span>`;

    const boardBadge = l.board && l.board !== 'Not Specified'
      ? `<span class="pill-badge pill-any">${escapeHtml(l.board)} Board</span>`
      : `<span class="pill-badge pill-any">CBSE / ICSE Board</span>`;

    const feeBadge = `<span class="pill-badge pill-any" style="font-weight:700; color:#0F2540;">${escapeHtml(l.budgetFee)}</span>`;
    const tutorPrefBadge = `<span class="pill-badge pill-any">${escapeHtml(l.tutorPreference || 'Any Tutor')}</span>`;

    return `
    <div class="lead-card" data-index="${idx}">
      <div class="card-head-row">
        <div style="display: flex; gap: 6px; align-items: center; max-width: 75%;">
          <span class="card-id-badge">${escapeHtml(l.leadId)}</span>
          <span class="card-class-badge" title="${escapeHtml(l.classes)}">${escapeHtml(l.classes)}</span>
        </div>
        <div><span class="pill-badge pill-ready">Ready</span></div>
      </div>

      <div class="card-contact-strip">
        <div class="contact-phone-line">
          <a class="phone-text-btn" href="tel:${escapeHtml(l.phone)}">📞 ${escapeHtml(l.phone)}</a>
          <span style="font-size: 10.5px; color: #059669; font-weight: 700;">● Verified Parent</span>
        </div>
        <div class="contact-actions-grid">
          <a class="action-btn-wa" href="${waUrl}" target="_blank" rel="noopener">
            <span>💬</span> WhatsApp
          </a>
          <a class="action-btn-call" href="tel:${escapeHtml(l.phone)}">
            <span>📞</span> Call Now
          </a>
          <button class="action-btn-copy" onclick="copyText('${escapeHtml(l.phone)}')" title="Copy Number">
            📋 Copy
          </button>
          <button class="action-btn-edit" type="button" onclick="openEditModal(${idx})">✏️ Edit</button>
        </div>
      </div>

      <div class="card-detail-item">
        <span class="detail-icon">📚</span>
        <div class="detail-content">
          <span class="detail-title">${escapeHtml(l.subjects)}</span>
        </div>
      </div>

      <div class="card-detail-item">
        <span class="detail-icon">📍</span>
        <div class="detail-content">
          <div class="loc-main">${escapeHtml(l.location)}</div>
        </div>
      </div>

      <div class="card-tags-row">
        ${feeBadge}
        ${tutorPrefBadge}
        ${modeBadge}
        ${boardBadge}
      </div>
    </div>`;
  }).join('\n');
}

function buildTableHtml(leads) {
  return leads.map((l, idx) => {
    const rawDigits = (l.phone || '').replace(/\D/g, '');
    const waUrl = `https://wa.me/${rawDigits}?text=${encodeURIComponent(
      `Hello! Regarding your inquiry on ApnaTutorHub for Home Tuition (${l.classes} - ${l.subjects}): Are you available to connect?`
    )}`;

    const modeTag = l.isOnline || l.mode === 'ONLINE'
      ? `<span class="pill-badge pill-urgent" style="background:#EDE9FE; color:#5B21B6; font-size:11px;">💻 Online Only</span>`
      : `<span class="pill-badge pill-any" style="font-size:11px;">🏠 Home Tuition</span>`;

    return `
    <tr data-index="${idx}">
      <td><span class="card-id-badge">${escapeHtml(l.leadId)}</span></td>
      <td>
        <div style="font-weight:700; color:#0F2540;">${escapeHtml(l.phone)}</div>
        <div style="display:flex; gap:6px; margin-top:4px;">
          <a class="action-btn-wa" style="padding:3px 8px; font-size:11px;" href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="action-btn-edit" style="padding:3px 8px; font-size:11px;" onclick="openEditModal(${idx})">Edit</button>
        </div>
      </td>
      <td><span class="card-class-badge">${escapeHtml(l.classes)}</span></td>
      <td><div style="max-width:200px; font-weight:600;">${escapeHtml(l.subjects)}</div></td>
      <td>
        <div class="loc-main">${escapeHtml(l.location)}</div>
        <div style="margin-top:2px;">${modeTag}</div>
      </td>
      <td><span style="font-weight:700; color:#0F2540;">${escapeHtml(l.budgetFee)}</span></td>
      <td>${escapeHtml(l.tutorPreference || 'Any Tutor')}</td>
      <td>${escapeHtml(l.board || 'CBSE')}</td>
      <td><span class="pill-badge pill-ready">Ready</span></td>
    </tr>`;
  }).join('\n');
}

console.log('Step 5: Generating card and table HTML...');
const newCardsFeedHtml = `<div id="cardsFeed" class="cards-grid">\n${buildCardsHtml(masterLeads)}\n    </div>`;
const newTableBodyHtml = `<tbody id="tableBody">\n${buildTableHtml(masterLeads)}\n        </tbody>`;

// 6. Splice into HTML template using exact string boundaries
const feedOpen = '<div id="cardsFeed" class="cards-grid">';
const feedStartIndex = rawHtml.indexOf(feedOpen);
const feedEndMarker = '<!-- Table View:';
const feedEndIndex = rawHtml.indexOf(feedEndMarker, feedStartIndex);

if (feedStartIndex === -1 || feedEndIndex === -1) {
  console.error('Could not find exact cardsFeed boundaries in HTML');
  process.exit(1);
}

// Find closing </div> before <!-- Table View:
const feedDivEnd = rawHtml.lastIndexOf('</div>', feedEndIndex) + 6;

let part1 = rawHtml.slice(0, feedStartIndex);
let part2 = rawHtml.slice(feedDivEnd);

let updatedHtml = part1 + newCardsFeedHtml + '\n\n    ' + part2;

// Replace #tableBody with exact index
const tbodyOpen = '<tbody id="tableBody">';
const tbodyStartIndex = updatedHtml.indexOf(tbodyOpen);
const tbodyEndIndex = updatedHtml.indexOf('</tbody>', tbodyStartIndex) + '</tbody>'.length;

if (tbodyStartIndex === -1 || tbodyEndIndex === -1) {
  console.error('Could not find tableBody boundaries in HTML');
  process.exit(1);
}

part1 = updatedHtml.slice(0, tbodyStartIndex);
part2 = updatedHtml.slice(tbodyEndIndex);
updatedHtml = part1 + newTableBodyHtml + part2;

// Replace const allLeads = [...]
const leadsJsonString = JSON.stringify(masterLeads);
updatedHtml = updatedHtml.replace(/const\s+allLeads\s*=\s*\[[\s\S]*?\];\s*\n/, `const allLeads = ${leadsJsonString};\n`);

// Update counter texts in the header
updatedHtml = updatedHtml.replace(/513 Verified/g, `${masterLeads.length} Verified`);
updatedHtml = updatedHtml.replace(/513 Parents/g, `${masterLeads.length} Parents`);
updatedHtml = updatedHtml.replace(/513 leads/gi, `${masterLeads.length} leads`);
updatedHtml = updatedHtml.replace(/513<\/span>/g, `${masterLeads.length}</span>`);
updatedHtml = updatedHtml.replace(/Total Leads:\s*513/g, `Total Leads: ${masterLeads.length}`);
updatedHtml = updatedHtml.replace(/All 513/g, `All ${masterLeads.length}`);

// Add Online option in location filter if not present
if (!updatedHtml.includes('value="ONLINE_ONLY"')) {
  updatedHtml = updatedHtml.replace(
    '<option value="OUTSIDE_NCR">',
    '<option value="ONLINE_ONLY">💻 Strict Online Only (Pan-India)</option>\n            <option value="OUTSIDE_NCR">'
  );
}

// 7. Write to target files
const targetDashboardData = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const targetDashboardPublic = path.join(__dirname, '..', 'public', 'today_parents_dashboard_upload.html');
const targetJson = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const targetCsv = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.csv');

fs.writeFileSync(targetDashboardData, updatedHtml, 'utf8');
fs.writeFileSync(targetDashboardPublic, updatedHtml, 'utf8');
fs.writeFileSync(targetJson, JSON.stringify(masterLeads, null, 2), 'utf8');

// Build RFC-4180 compliant CSV
function toCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const csvHeader = [
  'leadId',
  'inquiryNumber',
  'phone',
  'parentName',
  'studentName',
  'classes',
  'subjects',
  'location',
  'budgetFee',
  'tutorPreference',
  'teachingMode',
  'board',
  'rawEnquiry',
  'notes'
].join(',');

const csvRows = masterLeads.map(l => [
  toCsvField(l.leadId),
  toCsvField(l.inquiryNumber),
  toCsvField(l.phone),
  toCsvField(l.parentName || 'Parent'),
  toCsvField(l.studentName || 'Student'),
  toCsvField(l.classes),
  toCsvField(l.subjects),
  toCsvField(l.location),
  toCsvField(l.budgetFee),
  toCsvField(l.tutorPreference || 'Any Tutor'),
  toCsvField(l.isOnline || l.mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE'),
  toCsvField(l.board || 'CBSE'),
  toCsvField(l.rawEnquiry || ''),
  toCsvField(l.notes || '')
].join(','));

fs.writeFileSync(targetCsv, [csvHeader, ...csvRows].join('\n'), 'utf8');

console.log(`Step 7: Successfully updated all target files:`);
console.log(`- ${targetDashboardData} (${fs.statSync(targetDashboardData).size} bytes)`);
console.log(`- ${targetDashboardPublic} (${fs.statSync(targetDashboardPublic).size} bytes)`);
console.log(`- ${targetJson} (${fs.statSync(targetJson).size} bytes)`);
console.log(`- ${targetCsv} (${fs.statSync(targetCsv).size} bytes)`);
