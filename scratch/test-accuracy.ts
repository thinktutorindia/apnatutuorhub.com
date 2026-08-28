import { splitWhatsAppDump } from "../lib/staff-lead-parser";
import { extractLeadDataFast } from "../lib/gemini-lead-extractor";

// Let's test smart message stitching and extraction on the WhatsApp chat
const testChat = `26/08/26, 11:09 am - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. *Learn more*
26/08/26, 11:09 am - You created this group
26/08/26, 1:43 pm - +91 85069 51507 joined using a group link.
26/08/26, 1:43 pm - Anyone in this group can invite new members using a group link.
26/08/26, 1:44 pm - ~ Bhim Bhatia added studyhelpline co in
26/08/26, 1:41 pm - +91 75595 63565: Data sending soon
26/08/26, 1:44 pm - +91 85069 51507: ...
26/08/26, 2:02 pm - +91 85069 51507: +917862929000

KG 

Vipin garden
26/08/26, 2:02 pm - +91 85069 51507: Nerul
26/08/26, 2:02 pm - +91 85069 51507: +91 81781 04035
Nodia registration
26/08/26, 2:02 pm - +91 85069 51507: +91 90168 73835
Noida
26/08/26, 2:02 pm - +91 85069 51507: +91 98109 15485

Rani bagh
26/08/26, 2:02 pm - +91 85069 51507: +91 79821 26049

1962 multani mohalla rani bagh

Maths JEE
26/08/26, 2:02 pm - +91 85069 51507: Hello
Add: Qtr. No. 2, Karol bagh police station, opposite Baptist Church,delhi


+91 97990 45787

Class 3rd
26/08/26, 2:02 pm - +91 85069 51507: Pqpm beach 

Gold crest school 

8121251919
26/08/26, 2:02 pm - +91 85069 51507: +91 98182 84577
Arts
26/08/26, 2:02 pm - +91 85069 51507: +91 88827 16869


Fee 4000

Anushka parents
26/08/26, 2:02 pm - +91 85069 51507: +91 84708 52590

Parents 7th
Chor 
Bhumika
26/08/26, 2:02 pm - +91 85069 51507: +91 84708 52590

7th
Outum lane
26/08/26, 2:02 pm - +91 85069 51507: +91 88105 65073

Sanik farm
26/08/26, 2:02 pm - +91 85069 51507: 9711125020
Daryaganj 

February
26/08/26, 2:02 pm - +91 85069 51507: 8130698303
26/08/26, 2:02 pm - +91 85069 51507: +91 84485 55756

Maths
26/08/26, 2:02 pm - +91 85069 51507: +917503657621
Adarsh nagar
26/08/26, 2:02 pm - +91 85069 51507: +917488077322
Keshavpuram
26/08/26, 2:02 pm - +91 85069 51507: +917217819306

Kamla nagar
26/08/26, 2:02 pm - +91 85069 51507: +91 97178 35045

Parents 

Gurugram sec 5
26/08/26, 2:02 pm - +91 85069 51507: +91 97176 61509
Dipika
26/08/26, 2:02 pm - +91 85069 51507: +91 93150 94235

Dwaraka
26/08/26, 2:02 pm - +91 85069 51507: Sarita vihar 
Khusboo 
8447593801
26/08/26, 2:02 pm - +91 85069 51507: 8448332600
Female 
Pritampura
26/08/26, 2:02 pm - +91 85069 51507: 9667447331
26/08/26, 2:02 pm - +91 85069 51507: Shukurpur parents
26/08/26, 2:02 pm - +91 85069 51507: 9967447331
Vijay nagar parents
26/08/26, 2:02 pm - +91 85069 51507: 8882716869
26/08/26, 2:02 pm - +91 85069 51507: Vijay nagar parents
26/08/26, 2:02 pm - +91 85069 51507: 8010538360
Neha Thane
26/08/26, 2:02 pm - +91 85069 51507: 9958277430
Keshav puram
26/08/26, 2:02 pm - +91 85069 51507: +91 99108 58785
Parents karol vagh
`;

const segs = splitWhatsAppDump(testChat);
console.log(`Total segments: ${segs.length}`);
for (const s of segs) {
  const l = extractLeadDataFast(s);
  if (!l.isJunk) {
    console.log({
      name: l.name,
      phone: l.phone,
      location: l.location,
      subjects: l.subjects,
      classes: l.classes,
      leadType: l.leadType,
      notes: l.operationalNotes,
      budget: l.budgetFee,
      raw: s.replace(/\n/g, " | ").slice(0, 70)
    });
  }
}
