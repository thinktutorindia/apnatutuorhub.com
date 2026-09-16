import { FLATTENED_TAXONOMY_SUBJECTS, parseGradeNumbers } from '../lib/subject-taxonomy';

// Test building searchKeys and querying
const ROMAN_MAP: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
};

const indexed = FLATTENED_TAXONOMY_SUBJECTS.map(item => {
  const grades = parseGradeNumbers(item.subject);
  const aliases: string[] = [];

  for (const g of grades) {
    aliases.push(`class ${g}`, `class${g}`, `grade ${g}`, `${g}th`, `std ${g}`, `${g}`);
    const lowerSub = item.subject.toLowerCase();
    if (lowerSub.includes('math')) {
      aliases.push(`math ${g}`, `maths ${g}`, `mathematics ${g}`, `maths class ${g}`, `math class ${g}`, `class ${g} math`, `class ${g} maths`);
    }
    if (lowerSub.includes('science')) {
      aliases.push(`science ${g}`, `science class ${g}`, `class ${g} science`, `sci ${g}`);
    }
    if (lowerSub.includes('physics')) {
      aliases.push(`physics ${g}`, `physics class ${g}`, `class ${g} physics`, `phy ${g}`);
    }
    if (lowerSub.includes('chemistry')) {
      aliases.push(`chemistry ${g}`, `chemistry class ${g}`, `class ${g} chemistry`, `chem ${g}`);
    }
    if (lowerSub.includes('biology')) {
      aliases.push(`biology ${g}`, `biology class ${g}`, `class ${g} biology`, `bio ${g}`);
    }
    if (lowerSub.includes('social') || lowerSub.includes('history') || lowerSub.includes('geography')) {
      aliases.push(`sst ${g}`, `social studies ${g}`, `social science ${g}`, `class ${g} sst`);
    }
    if (lowerSub.includes('english')) {
      aliases.push(`english ${g}`, `english class ${g}`, `class ${g} english`, `eng ${g}`);
    }
    if (lowerSub.includes('hindi')) {
      aliases.push(`hindi ${g}`, `hindi class ${g}`, `class ${g} hindi`);
    }
    if (lowerSub.includes('all subjects') || lowerSub.includes('combo')) {
      aliases.push(`all subjects ${g}`, `class ${g} all subjects`, `combo ${g}`, `class ${g} combo`);
    }
  }

  const searchKey = `${item.subject} ${item.breadcrumb} ${aliases.join(' ')}`.toLowerCase();
  return { ...item, searchKey, grades };
});

const testQueries = [
  'math 6',
  'maths 6',
  'math 7',
  'maths 7',
  'math 10',
  'science 6',
  'physics 11',
  'chemistry 12',
  'class 6',
  'class 10',
  'english 7',
  'hindi 6',
  'all subjects 5'
];

for (const q of testQueries) {
  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = indexed.filter(item => tokens.every(t => item.searchKey.includes(t)));
  console.log(`Query "${q}" -> ${matches.length} matches:`);
  matches.slice(0, 4).forEach(m => console.log('   -', m.subject));
}
