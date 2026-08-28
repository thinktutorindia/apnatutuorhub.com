import { splitWhatsAppDump, parseWhatsAppDump } from "../lib/staff-lead-parser";
import { regexExtract } from "../lib/gemini-lead-extractor";

// Let's test a slice of user messages
const testData = `
26/08/26, 11:09 am - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. *Learn more*
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
26/08/26, 2:09 pm - +91 85069 51507: +91 84488 59361

Name:Siddhi
Qualification : Perusing Graduation in Bsc(hons) Computer Science (3rd year)
Subjects :All subjects 
Class :1st to 8th(All subjects) 9 and 10th(Maths Science),11-12th(computer science)
Experience :4+
Prefered Location: Shalimar Bagh,Adarsh Nagar ,Model Town
26/08/26, 4:43 pm - studyhelpline co in: Code. C102
Name:divarkar Pandey
Phone.no.8789682519
26/08/26, 4:47 pm - studyhelpline co in: 9811550855
26/08/26, 4:47 pm - studyhelpline co in: 9950009231
26/08/26, 4:47 pm - studyhelpline co in: 9958287145
26/08/26, 3:59 pm - studyhelpline co in: 8587022506
9999218333
8802756134
8287640053
8810695910
9599033418
9643647147
8700216389
`;

const segments = splitWhatsAppDump(testData);
console.log("Segments found:", segments.length);
for (const s of segments) {
  const extracted = regexExtract(s);
  console.log("---");
  console.log("RAW:", s.slice(0, 60).replace(/\n/g, " "));
  console.log("EXTRACTED:", {
    name: extracted.name,
    phone: extracted.phone,
    email: extracted.email,
    location: extracted.location,
    subjects: extracted.subjects,
    classes: extracted.classes,
    leadType: extracted.leadType
  });
}
