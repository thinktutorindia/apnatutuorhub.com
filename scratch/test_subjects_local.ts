import { expandTutorSubjectsAndClasses } from '@/lib/whatsapp-bot/auto-register';

console.log('=== Test 1: class 11 and 12, math and computer science ===');
const r1 = expandTutorSubjectsAndClasses({
  rawSubjects: ['math', 'computer science'],
  rawClassLevel: 'class 11 and 12',
});
console.log('Subjects:', r1.subjects.join(', '));
console.log('Classes:', r1.classLevels.join(', '));

console.log('\n=== Test 2: science (class 6-10) - should NOT trigger CS ===');
const r2 = expandTutorSubjectsAndClasses({
  rawSubjects: ['science'],
  rawClassLevel: 'class 6 to 10',
});
const hasCS = r2.subjects.some(s => s.toLowerCase().includes('computer'));
console.log('Has CS (should be false):', hasCS);
console.log('Has Science:', r2.subjects.some(s => s.toLowerCase().includes('science')));

console.log('\n=== Test 3: computer science only class 11 12 ===');
const r3 = expandTutorSubjectsAndClasses({
  rawSubjects: ['computer science'],
  rawClassLevel: '11th and 12th',
});
const hasPhysics = r3.subjects.some(s => s.toLowerCase().includes('physic'));
const hasChem = r3.subjects.some(s => s.toLowerCase().includes('chem'));
console.log('Has Physics (should be false):', hasPhysics);
console.log('Has Chemistry (should be false):', hasChem);
console.log('Subjects:', r3.subjects.join(', '));
