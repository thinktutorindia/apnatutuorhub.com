import { PARSED_TAXONOMY_INDEX } from '../lib/subject-taxonomy';

for (let g = 1; g <= 12; g++) {
  const math = PARSED_TAXONOMY_INDEX.filter(item => item.domain === 'maths' && item.grades.includes(g)).map(m => m.subject);
  const sci = PARSED_TAXONOMY_INDEX.filter(item => (item.domain === 'science' || item.domain === 'physics' || item.domain === 'chemistry' || item.domain === 'biology') && item.grades.includes(g)).map(m => m.subject);
  const eng = PARSED_TAXONOMY_INDEX.filter(item => item.domain === 'english' && item.grades.includes(g)).map(m => m.subject);
  const sst = PARSED_TAXONOMY_INDEX.filter(item => item.domain === 'social_studies' && item.grades.includes(g)).map(m => m.subject);
  const combo = PARSED_TAXONOMY_INDEX.filter(item => item.domain === 'combo' && item.grades.includes(g)).map(m => m.subject);
  console.log('Grade ' + g + ':');
  console.log('   Math:', math);
  console.log('   Science:', sci);
  console.log('   English:', eng);
  console.log('   SST:', sst);
  console.log('   Combo:', combo);
}
