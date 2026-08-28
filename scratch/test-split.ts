import { splitWhatsAppDump } from "../lib/staff-lead-parser";

const sampleChat = `26/08/26, 11:09 am - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. *Learn more*
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

const segments = splitWhatsAppDump(sampleChat);
console.log("Segments count:", segments.length);
console.log("Segments:", segments);
