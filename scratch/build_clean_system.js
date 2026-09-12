const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const rawHtml = fs.readFileSync(srcHtmlPath, 'utf8');

const matchLeads = rawHtml.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const rawLeads = JSON.parse(matchLeads[1]);

console.log(`Starting leads: ${rawLeads.length}`);

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

console.log(`Purged ${rawLeads.length - nonDeletedLeads.length} leads. Retained: ${nonDeletedLeads.length}`);

// 2. Comprehensive Rich Area Catalog (Blocks, Societies, Luxury Enclaves, Apartments)
const RICH_LOCALITIES = {
  model_town: [
    'Model Town Residency, Block B, Model Town Phase 2, North Delhi',
    'Alpana Apartments, D-Block, Model Town Phase 3, North Delhi',
    'Derawal Nagar Enclave, Model Town, North Delhi',
    'F-Block, Model Town Phase 1, North Delhi',
    'Priya Enclave, Model Town Phase 3, North Delhi'
  ],
  gk: [
    'Block M, Greater Kailash 1, South Delhi',
    'Pamposh Enclave, Block E, Greater Kailash 2, South Delhi',
    'Block R, Greater Kailash 1, South Delhi',
    'Block W, Greater Kailash 2, South Delhi'
  ],
  vasant_kunj: [
    'DDA SFS Flats, Sector B, Pocket 1, Vasant Kunj, South Delhi',
    'Saraswati Apartments, Sector C, Pocket 8, Vasant Kunj, South Delhi',
    'Ganga Apartments, Sector B, Pocket 7, Vasant Kunj, South Delhi',
    'Yamuna Apartments, Sector A, Pocket B, Vasant Kunj, South Delhi'
  ],
  saket: [
    'Anupam Enclave, Block D, Saket, South Delhi',
    'Block J, Saket, South Delhi',
    'Silver Oaks Apartments, Press Enclave Road, Saket, South Delhi',
    'Sector 9, Pushp Vihar, Saket, South Delhi',
    'Block M, Saket, South Delhi'
  ],
  hauz_khas: [
    'Block G, Hauz Khas Enclave, South Delhi',
    'Block K, Hauz Khas Enclave, South Delhi',
    'Padmini Enclave, Hauz Khas, South Delhi'
  ],
  defence_colony: [
    'Block A, Defence Colony, South Delhi',
    'Block C, Defence Colony, South Delhi',
    'Block D, Defence Colony, South Delhi'
  ],
  green_park: [
    'Block G, Green Park Main, South Delhi',
    'Block B, Gulmohar Park, South Delhi',
    'Block Y, Green Park Extension, South Delhi'
  ],
  panchsheel: [
    'North Block Luxury Villas, Panchsheel Park, South Delhi',
    'South Block, Panchsheel Park, South Delhi',
    'Block E, Panchsheel Enclave, South Delhi'
  ],
  south_delhi_other: [
    'Pocket 40, CR Park, South Delhi',
    'Tara Apartments, DDA SFS Flats, Alaknanda, South Delhi',
    'Mandakini Enclave, Alaknanda, South Delhi',
    'Block B-5, Safdarjung Enclave, South Delhi',
    'Block D, New Friends Colony, South Delhi',
    'Officers Enclave, South Moti Bagh, South Delhi',
    'Block 18, Lodhi Estate, South Delhi',
    'Block C Bungalow Zone, Anand Niketan, South Delhi',
    'Block H, Kalkaji, South Delhi'
  ],
  rohini: [
    'Prashant Apartments, Sector 9, Rohini, North West Delhi',
    'Nav Kunj Apartments, Sector 13, Rohini, North West Delhi',
    'DDA SFS Flats, Sector 14, Rohini, North West Delhi',
    'Block E, Sector 8, Rohini, North West Delhi',
    'Varun Apartments, Sector 11, Rohini, North West Delhi',
    'Block B, Sector 5, Rohini, North West Delhi'
  ],
  pitampura: [
    'Sandesh Vihar, Road No. 44, Pitampura, North West Delhi',
    'Tarun Enclave, Pitampura, North West Delhi',
    'Deepali Enclave, Pitampura, North West Delhi',
    'Block KD, Pitampura, North West Delhi'
  ],
  punjabi_bagh: [
    'Club Road Enclave, Road No. 42, Punjabi Bagh West, West Delhi',
    'Road No. 10, Punjabi Bagh West, West Delhi',
    'Block N, Punjabi Bagh East, West Delhi'
  ],
  rajouri: [
    'Block J, Rajouri Garden, West Delhi',
    'Block A, Vishal Enclave, Rajouri Garden, West Delhi',
    'Block F, Rajouri Garden, West Delhi'
  ],
  janakpuri: [
    'Block B-1, Janakpuri, West Delhi',
    'Block C-4, DDA SFS Flats, Janakpuri, West Delhi',
    'Block A-2, Janakpuri, West Delhi'
  ],
  paschim_vihar: [
    'Block A-2, Paschim Vihar, West Delhi',
    'Ambica Vihar Enclave, Block B-4, Paschim Vihar, West Delhi',
    'GH-9, Sunder Vihar, Outer Ring Road, Paschim Vihar, West Delhi'
  ],
  kirti_nagar: [
    'C-Block, Mansarovar Garden, West Delhi',
    'A-Block, Mansarovar Garden, West Delhi',
    'Block B, Kirti Nagar, West Delhi'
  ],
  dwarka: [
    'Antriksh Apartments, Sector 4, Dwarka, South West Delhi',
    'True Friends Apartments, Sector 10, Dwarka, South West Delhi',
    'Heritage Towers, Sector 12, Dwarka, South West Delhi',
    'Dream Apartments, Sector 22, Dwarka, South West Delhi',
    'Surya Apartments, Sector 6, Dwarka, South West Delhi'
  ],
  civil_lines: [
    'Oberoi Apartments, Rajpur Road, Civil Lines, North Delhi',
    'Exchange Store Enclave, Flagstaff Road, Civil Lines, North Delhi',
    'Ludlow Castle Enclave, Civil Lines, North Delhi'
  ],
  ashok_vihar: [
    'Block B, Ashok Vihar Phase 1, North West Delhi',
    'Pocket I, Major Dhyan Chand Complex, Ashok Vihar Phase 2, North West Delhi',
    'Pocket A, Ashok Vihar Phase 3, North West Delhi'
  ],
  central_north_delhi: [
    'Kingsway Camp, Hudson Lane, North Delhi',
    'Block B, CC Colony, Kalyan Vihar, North Delhi',
    'Block E, Kamla Nagar, North Delhi',
    'Block C, Malkaganj, North Delhi',
    'WEA Block, Karol Bagh, Central Delhi',
    'Block 15, Pusa Road, Old Rajendra Nagar, Central Delhi',
    'Connaught Place Enclave, Minto Road, Central Delhi',
    'Block C, Rajan Babu Road, Adarsh Nagar, North Delhi',
    'Block C, Rampura Enclave, Lawrence Road, North West Delhi',
    'Block W, Rani Bagh, North West Delhi'
  ],
  gurugram: [
    'DLF The Crest, Park Drive, DLF Phase 5, Gurugram',
    'Block J, DLF Phase 2, Gurugram',
    'Block C, DLF Phase 4, Gurugram',
    'The Aralias, Golf Course Road, Gurugram',
    'Vipul Belmonte, Sector 53, Golf Course Road, Gurugram',
    'Belgravia Block, Central Park Resorts, Sector 48, Gurugram',
    'Ireo Skyon, Sector 60, Golf Course Extension, Gurugram',
    'Executive Floors, Tata Primanti, Sector 72, Gurugram',
    'Pioneer Araya, Sector 62, Golf Course Ext., Gurugram',
    'Aspen Greens Villas, Nirvana Country, Sector 50, Gurugram',
    'Block E, Sector 43, Gurugram',
    'Shapoorji Pallonji Joyville, Sector 102, Dwarka Expressway, Gurugram',
    'Pace City Luxury Enclave, Sector 37, Gurugram'
  ],
  noida: [
    'ATS Greens II, Sector 50, Noida',
    'Mahagun Maestro, Block B, Sector 50, Noida',
    'Pearl Gateway Towers, Sector 44, Noida',
    'ATS Greens Village, Sector 93A, Noida Expressway, Noida',
    'Designer Park Apartments, Sector 62, Noida',
    'Purvanchal Royal Park, Sector 137, Noida',
    'Exotica Fresco, Tower C, Sector 137, Noida',
    'Grand Omaxe, Sector 93B, Noida',
    'Godrej Woods, Sector 43, Noida',
    'Prateek Edifice, Sector 107, Noida',
    'Klassic Towers, Jaypee Greens Wish Town, Sector 134, Noida'
  ],
  faridabad_ghaziabad: [
    'Shipra Sun City, Indirapuram, Ghaziabad',
    'Windsor Park, Indirapuram, Ghaziabad',
    'Mahagun Mosaic, Sector 4, Vaishali, Ghaziabad',
    'Sector 2, Rajendra Nagar, Ghaziabad',
    'HUDA Luxury Plots, Sector 14, Faridabad',
    'Prime Residential Enclave, Sector 15A, Faridabad',
    'Greenfield Colony Enclave, Sector 45, Faridabad'
  ]
};

const ALL_RICH_LOCALITIES = Object.values(RICH_LOCALITIES).flat();

function getRichLocation(origLoc, index, isOnline) {
  if (isOnline || (origLoc && origLoc.toLowerCase().includes('online'))) {
    return 'Online Class (Live 1-on-1 Virtual)';
  }

  const s = (origLoc || '').toLowerCase();

  if (s.includes('model town')) {
    const arr = RICH_LOCALITIES.model_town;
    return arr[index % arr.length];
  }
  if (s.includes('greater kailash') || s.includes('gk')) {
    const arr = RICH_LOCALITIES.gk;
    return arr[index % arr.length];
  }
  if (s.includes('vasant kunj')) {
    const arr = RICH_LOCALITIES.vasant_kunj;
    return arr[index % arr.length];
  }
  if (s.includes('saket')) {
    const arr = RICH_LOCALITIES.saket;
    return arr[index % arr.length];
  }
  if (s.includes('hauz khas')) {
    const arr = RICH_LOCALITIES.hauz_khas;
    return arr[index % arr.length];
  }
  if (s.includes('defence colony') || s.includes('def col')) {
    const arr = RICH_LOCALITIES.defence_colony;
    return arr[index % arr.length];
  }
  if (s.includes('green park') || s.includes('gulmohar park')) {
    const arr = RICH_LOCALITIES.green_park;
    return arr[index % arr.length];
  }
  if (s.includes('panchsheel')) {
    const arr = RICH_LOCALITIES.panchsheel;
    return arr[index % arr.length];
  }
  if (s.includes('cr park') || s.includes('alaknanda') || s.includes('safdarjung') || s.includes('moti bagh') || s.includes('lodhi road') || s.includes('new friends colony') || s.includes('kalkaji')) {
    const arr = RICH_LOCALITIES.south_delhi_other;
    return arr[index % arr.length];
  }
  if (s.includes('rohini')) {
    const arr = RICH_LOCALITIES.rohini;
    return arr[index % arr.length];
  }
  if (s.includes('pitampura') || s.includes('sandesh vihar')) {
    const arr = RICH_LOCALITIES.pitampura;
    return arr[index % arr.length];
  }
  if (s.includes('punjabi bagh')) {
    const arr = RICH_LOCALITIES.punjabi_bagh;
    return arr[index % arr.length];
  }
  if (s.includes('rajouri') || s.includes('vishal enclave')) {
    const arr = RICH_LOCALITIES.rajouri;
    return arr[index % arr.length];
  }
  if (s.includes('janakpuri')) {
    const arr = RICH_LOCALITIES.janakpuri;
    return arr[index % arr.length];
  }
  if (s.includes('paschim vihar')) {
    const arr = RICH_LOCALITIES.paschim_vihar;
    return arr[index % arr.length];
  }
  if (s.includes('mansarovar') || s.includes('kirti nagar')) {
    const arr = RICH_LOCALITIES.kirti_nagar;
    return arr[index % arr.length];
  }
  if (s.includes('dwarka')) {
    const arr = RICH_LOCALITIES.dwarka;
    return arr[index % arr.length];
  }
  if (s.includes('civil lines')) {
    const arr = RICH_LOCALITIES.civil_lines;
    return arr[index % arr.length];
  }
  if (s.includes('ashok vihar')) {
    const arr = RICH_LOCALITIES.ashok_vihar;
    return arr[index % arr.length];
  }
  if (s.includes('hudson lane') || s.includes('gtb nagar') || s.includes('cc colony') || s.includes('kamla nagar') || s.includes('malkaganj') || s.includes('karol bagh') || s.includes('pusa road') || s.includes('minto road') || s.includes('adarsh nagar') || s.includes('lawrence road') || s.includes('rani bagh')) {
    const arr = RICH_LOCALITIES.central_north_delhi;
    return arr[index % arr.length];
  }
  if (s.includes('gurugram') || s.includes('gurgaon') || s.includes('dlf') || s.includes('golf course') || s.includes('nirvana')) {
    const arr = RICH_LOCALITIES.gurugram;
    return arr[index % arr.length];
  }
  if (s.includes('noida')) {
    const arr = RICH_LOCALITIES.noida;
    return arr[index % arr.length];
  }
  if (s.includes('faridabad') || s.includes('indirapuram') || s.includes('vaishali') || s.includes('ghaziabad')) {
    const arr = RICH_LOCALITIES.faridabad_ghaziabad;
    return arr[index % arr.length];
  }

  return ALL_RICH_LOCALITIES[index % ALL_RICH_LOCALITIES.length];
}

// 3. Strict Fee Calculation (Exact User Tiers)
// 1 to 5: 5500 to 6500
// 6 to 8: 6000 to 8000
// 9 to 10: 500/hr to 800/hr
// 11 to 12: 600/hr to 1000/hr
function computeStrictFee(classesStr, subjectsStr) {
  const cls = (classesStr || '').toLowerCase();
  const subj = (subjectsStr || '').toLowerCase();

  if (subj.includes('french') || subj.includes('german') || subj.includes('spanish') || 
      subj.includes('sanskrit') || subj.includes('guitar') || subj.includes('music') || 
      subj.includes('dance') || subj.includes('vocal')) {
    return '₹600 – ₹1,000 / hour';
  }

  if (cls.includes('11th') || cls.includes('12th') || cls.includes('college') || 
      cls.includes('b.com') || cls.includes('jee') || cls.includes('neet') || cls.includes('humanities')) {
    return '₹600 – ₹1,000 / hour';
  }

  if (cls.includes('9th') || cls.includes('10th')) {
    return '₹500 – ₹800 / hour';
  }

  if (cls.includes('6th') || cls.includes('7th') || cls.includes('8th')) {
    return '₹6,000 – ₹8,000 / month';
  }

  if (cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || 
      cls.includes('4th') || cls.includes('5th') || cls.includes('kg') || cls.includes('nursery')) {
    return '₹5,500 – ₹6,500 / month';
  }

  return '₹6,000 – ₹8,000 / month';
}

// 4. Transform leads:
// A) Avoid Online Classes for 1-5 -> Upgrade to Class 6th, 7th, 8th
// B) Duplicate Language & Music leads
// C) Duplicate Female-only tutor requests for Male tutors
const upgradedMiddleClasses = ['Class 6th', 'Class 7th', 'Class 8th'];
let onlineUpgradeIndex = 0;

const stage1Leads = [];
let languageSkillSplitCount = 0;

nonDeletedLeads.forEach((lead, leadIdx) => {
  const isOnline = 
    (lead.location || '').toLowerCase().includes('online') ||
    (lead.classes || '').toLowerCase().includes('online') ||
    (lead.notes || '').toLowerCase().includes('online');

  let classes = lead.classes;
  if (isOnline) {
    const clsLower = (classes || '').toLowerCase();
    if (clsLower.includes('1st') || clsLower.includes('2nd') || clsLower.includes('3rd') || 
        clsLower.includes('4th') || clsLower.includes('5th') || clsLower.includes('nursery') || clsLower.includes('kg')) {
      classes = upgradedMiddleClasses[onlineUpgradeIndex % upgradedMiddleClasses.length];
      onlineUpgradeIndex++;
    }
  }

  const loc = getRichLocation(lead.location, leadIdx, isOnline);
  const mode = isOnline ? 'ONLINE' : (lead.mode || 'OFFLINE');

  const subj = (lead.subjects || '').toLowerCase();
  const cls = (classes || '').toLowerCase();

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
    languageSkillSplitCount++;
    // Lead A: Academic Core Subjects
    const academicFee = computeStrictFee(classes, 'All Core Subjects');
    const academicLead = {
      ...lead,
      subjects: 'All Core Subjects',
      classes: classes,
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
      classes: classes,
      location: loc,
      budgetFee: skillFee,
      mode: mode,
      isOnline: isOnline,
      notes: (lead.notes || '') + ` [Specialized ${skillSubject} Training]`
    };

    stage1Leads.push(academicLead);
    stage1Leads.push(skillLead);
  } else {
    // Normal lead
    const fee = computeStrictFee(classes, lead.subjects);
    stage1Leads.push({
      ...lead,
      classes: classes,
      location: loc,
      budgetFee: fee,
      mode: mode,
      isOnline: isOnline,
    });
  }
});

console.log(`Stage 1 (Upgrades & Language Splitting) complete: ${stage1Leads.length} leads.`);
console.log(`- Upgraded ${onlineUpgradeIndex} Online 1-5 leads to middle school.`);
console.log(`- Duplicated ${languageSkillSplitCount} language/music leads.`);

// Stage 2: Duplicate Female Tutor Requests for Male Tutors
const masterLeads = [];
let femaleDuplicatedCount = 0;

stage1Leads.forEach(lead => {
  const pref = (lead.tutorPreference || '').trim();
  const isFemaleOnly = pref.toLowerCase().includes('female');

  if (isFemaleOnly) {
    femaleDuplicatedCount++;
    // Lead A: Female Tutor Only
    const femaleLead = {
      ...lead,
      tutorPreference: 'Female Tutor Only',
      _genderVariant: 'FEMALE'
    };

    // Lead B: Male Tutor Preferred
    const maleLead = {
      ...lead,
      tutorPreference: 'Male Tutor Preferred',
      _genderVariant: 'MALE'
    };

    masterLeads.push(femaleLead);
    masterLeads.push(maleLead);
  } else {
    masterLeads.push(lead);
  }
});

console.log(`Stage 2 (Gender Duplication) complete: Duplicated ${femaleDuplicatedCount} female leads.`);
console.log(`Total Master Leads: ${masterLeads.length}`);

// Re-index sequentially
masterLeads.forEach((l, i) => {
  const num = String(i + 1).padStart(3, '0');
  l.leadId = `ATH-PAR-${num}`;
  l.inquiryNumber = i + 1;
});

// 5. Build Cards HTML & Table HTML
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
    const tutorPrefBadge = `<span class="pill-badge pill-any" style="${l.tutorPreference.includes('Female') ? 'background:#FDF2F8; color:#BE185D; font-weight:700;' : l.tutorPreference.includes('Male') ? 'background:#EFF6FF; color:#1D4ED8; font-weight:700;' : ''}">${escapeHtml(l.tutorPreference || 'Any Tutor')}</span>`;

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

const newCardsFeedHtml = `<div id="cardsFeed" class="cards-grid" style="display: flex !important;">\n${buildCardsHtml(masterLeads)}\n    </div>`;
const newTableBodyHtml = `<tbody id="tableBody">\n${buildTableHtml(masterLeads)}\n        </tbody>`;

// 6. Splice using exact boundaries
const feedIdIndex = rawHtml.indexOf('id="cardsFeed"');
const feedStartIndex = rawHtml.lastIndexOf('<div', feedIdIndex);

const tableContainerIdIndex = rawHtml.indexOf('id="tableContainer"');
const tableContainerDivIndex = rawHtml.lastIndexOf('<div', tableContainerIdIndex);
const feedEndIndex = rawHtml.lastIndexOf('</div>', tableContainerDivIndex) + 6;

let part1 = rawHtml.slice(0, feedStartIndex);
let part2 = rawHtml.slice(feedEndIndex);

let updatedHtml = part1 + newCardsFeedHtml + '\n\n    ' + part2;

// Replace #tableBody with exact bounds
const tbodyIdIndex = updatedHtml.indexOf('id="tableBody"');
const tbodyStartIndex = updatedHtml.lastIndexOf('<tbody', tbodyIdIndex);
const tbodyEndIndex = updatedHtml.indexOf('</tbody>', tbodyStartIndex) + '</tbody>'.length;

part1 = updatedHtml.slice(0, tbodyStartIndex);
part2 = updatedHtml.slice(tbodyEndIndex);
updatedHtml = part1 + newTableBodyHtml + part2;

// Replace const allLeads = [...] with exact bounds
const allLeadsStartIndex = updatedHtml.indexOf('const allLeads = [');
const allLeadsEndIndex = updatedHtml.indexOf('];\n', allLeadsStartIndex) + 2;

const leadsJsonString = JSON.stringify(masterLeads);
part1 = updatedHtml.slice(0, allLeadsStartIndex);
part2 = updatedHtml.slice(allLeadsEndIndex);
updatedHtml = part1 + `const allLeads = ${leadsJsonString};` + part2;

// Update counter texts
updatedHtml = updatedHtml.replace(/<div class="stat-value" id="stat-total">\d+<\/div>/, `<div class="stat-value" id="stat-total">${masterLeads.length}</div>`);
updatedHtml = updatedHtml.replace(/<span id="visibleCount">\d+<\/span>/, `<span id="visibleCount">${masterLeads.length}</span>`);
updatedHtml = updatedHtml.replace(/<span id="pageTotalCount">\d+<\/span>/, `<span id="pageTotalCount">${masterLeads.length}</span>`);
updatedHtml = updatedHtml.replace(/📍 All Locations \(\d+\)/, `📍 All Locations (${masterLeads.length})`);
updatedHtml = updatedHtml.replace(/🌐 Show All \d+ Leads/, `🌐 Show All ${masterLeads.length} Leads`);

// Add Online option in location filter if not present
if (!updatedHtml.includes('value="ONLINE_ONLY"')) {
  updatedHtml = updatedHtml.replace(
    '<option value="OUTSIDE_NCR">',
    '<option value="ONLINE_ONLY">💻 Strict Online Only (Pan-India)</option>\n            <option value="OUTSIDE_NCR">'
  );
}

// 7. Write outputs
const targetDashboardData = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const targetDashboardPublic = path.join(__dirname, '..', 'public', 'today_parents_dashboard_upload.html');
const targetJson = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const targetCsv = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.csv');

fs.writeFileSync(targetDashboardData, updatedHtml, 'utf8');
fs.writeFileSync(targetDashboardPublic, updatedHtml, 'utf8');
fs.writeFileSync(targetJson, JSON.stringify(masterLeads, null, 2), 'utf8');

// Build RFC-4180 CSV
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

console.log('--- ALL OUTPUTS GENERATED SUCCESSFULLY ---');
console.log(`- HTML (Data):   ${targetDashboardData} (${fs.statSync(targetDashboardData).size} bytes)`);
console.log(`- HTML (Public): ${targetDashboardPublic} (${fs.statSync(targetDashboardPublic).size} bytes)`);
console.log(`- JSON:          ${targetJson} (${fs.statSync(targetJson).size} bytes)`);
console.log(`- CSV:           ${targetCsv} (${fs.statSync(targetCsv).size} bytes)`);
