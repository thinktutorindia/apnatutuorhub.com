const fs = require('fs');
const path = require('path');

const updatedHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const rawHtml = fs.readFileSync(updatedHtmlPath, 'utf8');

const match = rawHtml.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const rawLeads = JSON.parse(match[1]);

// Delete marker check
const deleteMarkers = ['delete this rohit', 'delete this', 'delete', 'junk'];
const filteredLeads = rawLeads.filter(l => {
  return !(
    deleteMarkers.some(m => (l.classes || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.location || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.budgetFee || '').toLowerCase().includes(m)) ||
    deleteMarkers.some(m => (l.subjects || '').toLowerCase().includes(m))
  );
});

console.log('Filtered valid leads count:', filteredLeads.length);

const duplicatedResults = [];
let splitCount = 0;

filteredLeads.forEach(lead => {
  const subj = (lead.subjects || '').toLowerCase();
  const cls = (lead.classes || '').toLowerCase();

  const isLanguageOrSkill = 
    subj.includes('french') || subj.includes('german') || subj.includes('spanish') || 
    subj.includes('sanskrit') || subj.includes('guitar') || subj.includes('dance') || 
    subj.includes('music');

  // Check if it has an academic grade to split
  const hasAcademicGrade = 
    cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') ||
    cls.includes('5th') || cls.includes('6th') || cls.includes('7th') || cls.includes('8th') ||
    cls.includes('9th') || cls.includes('10th') || cls.includes('11th') || cls.includes('12th') ||
    cls.includes('nursery') || cls.includes('kg');

  if (isLanguageOrSkill && hasAcademicGrade) {
    splitCount++;
    // Lead 1: Academic All Core Subjects
    const academicLead = {
      ...lead,
      _splitFrom: lead.leadId,
      _variant: 'ACADEMIC',
      subjects: 'All Core Subjects',
      rawEnquiry: (lead.rawEnquiry ? lead.rawEnquiry + ' ' : '') + '[Academic Curriculum Requirement]',
    };

    // Lead 2: Specialized Language / Music
    let skillSubject = lead.subjects;
    if (subj.includes('french')) skillSubject = 'French Language';
    else if (subj.includes('german')) skillSubject = 'German Language';
    else if (subj.includes('spanish')) skillSubject = 'Spanish Language';
    else if (subj.includes('sanskrit')) skillSubject = 'Sanskrit Language';
    else if (subj.includes('guitar')) skillSubject = 'Guitar & Western Music';
    else if (subj.includes('dance')) skillSubject = 'Dance & Performing Arts';
    else if (subj.includes('music')) skillSubject = 'Music & Vocal Instruments';

    const skillLead = {
      ...lead,
      _splitFrom: lead.leadId,
      _variant: 'SKILL_LANGUAGE',
      subjects: skillSubject,
      rawEnquiry: (lead.rawEnquiry ? lead.rawEnquiry + ' ' : '') + `[Specialized ${skillSubject} Training]`,
    };

    duplicatedResults.push(academicLead);
    duplicatedResults.push(skillLead);
  } else {
    duplicatedResults.push(lead);
  }
});

console.log(`Leads split into 2: ${splitCount}`);
console.log(`Total leads after duplication: ${duplicatedResults.length}`);

// Sample of split leads
const samples = duplicatedResults.filter(l => l._splitFrom);
console.log('\n--- Sample of duplicated leads (first 6 pairs) ---');
for (let i = 0; i < Math.min(12, samples.length); i += 2) {
  const a = samples[i];
  const b = samples[i+1];
  console.log(`Pair [Original ${a._splitFrom}]:`);
  console.log(`  Lead A (Academic): Subj="${a.subjects}" | Class="${a.classes}" | Phone=${a.phone}`);
  console.log(`  Lead B (Skill):    Subj="${b.subjects}" | Class="${b.classes}" | Phone=${b.phone}`);
}
