const LOCALITY_LANDMARK_MAP: Record<string, string> = {
  "sangam vihar": "Sangam Vihar, Gali No. 16 (near Kumar Sweets)",
  saket: "Saket, Block J (near Central Market)",
  "malviya nagar": "Malviya Nagar, Shivalik Road (near Mother Dairy)",
  pitampura: "Pitampura, Saraswati Vihar (near Aggarwal Sweets)",
  "patel nagar": "Patel Nagar, West Patel Nagar, Gali No. 4 (near Metro Gate 2)",
  "kamla nagar": "Kamla Nagar, Bungalow Road (near Spark Mall)",
  "civil lines": "Civil Lines, Rajpur Road (near Metro Station)",
  "rani bagh": "Rani Bagh, Main Market (near Shiva Mandir)",
  "gautam nagar": "Gautam Nagar, Gulmohar Enclave (near Father Agnel School)",
  kalkaji: "Kalkaji, Block B (near Rampuri Gurudwara)",
  "lajpat nagar": "Lajpat Nagar, Part 4 (near National Market)",
  rohini: "Rohini, Sector 9 (near DC Chowk)",
  dwarka: "Dwarka, Sector 12 (near City Centre)",
  janakpuri: "Janakpuri, Block C2 (near District Centre)",
  "hauz khas": "Hauz Khas, E Block (near Aurobindo Market)",
  "vasant kunj": "Vasant Kunj, Sector B (near Fortis Hospital)",
  "mayur vihar": "Mayur Vihar, Phase 1, Pocket 4 (near Acharya Niketan)",
  "laxmi nagar": "Laxmi Nagar, Vijay Block (near Metro Gate 1)",
  "paschim vihar": "Paschim Vihar, B3 Block (near Jwala Heri Market)",
  "punjabi bagh": "Punjabi Bagh, West Punjabi Bagh (near Club Road)",
  "rajouri garden": "Rajouri Garden, Block F (near Main Market)",
  vikaspuri: "Vikaspuri, Block G (near Oxford School)",
  "uttam nagar": "Uttam Nagar, Mohan Garden (near Pillar 745)",
  "preet vihar": "Preet Vihar, G Block (near Metro Station)",
  "anand vihar": "Anand Vihar, C Block (near Railway Station)",
  "nehru place": "Nehru Place (near Paras Cinema)",
  noida: "Noida, Sector 15 (near Gulmohar Market)",
  gurgaon: "Gurugram, Sector 14 (near Main Market)",
  gurugram: "Gurugram, Sector 14 (near Main Market)",
  faridabad: "Faridabad, Sector 16 (near Old Faridabad Metro)",
  ghaziabad: "Ghaziabad, Raj Nagar (near RDC Market)",
  indirapuram: "Indirapuram, Niti Khand 1 (near Swarna Jayanti Park)",
  vaishali: "Vaishali, Sector 4 (near Metro Gate 2)",
  shahdara: "Shahdara, Naveen Shahdara (near Shyam Lal College)",
  "geeta colony": "Geeta Colony, Block 7 (near Taj Enclave)",
  "krishna nagar": "Krishna Nagar, Lal Quarter (near Ghondli Chowk)",
  "karol bagh": "Karol Bagh, Padam Singh Road (near Metro Gate 3)",
  "subhash nagar": "Subhash Nagar, Block 8 (near Pacific Mall)",
  "tilak nagar": "Tilak Nagar, Main Market (near Metro Gate 1)",
  "shalimar bagh": "Shalimar Bagh, BP Block (near Club)",
  "model town": "Model Town, Phase 2 (near Gujranwala Town)",
  "ashok vihar": "Ashok Vihar, Phase 1 (near Deep Market)",
};

export function formatRichNearbyLocation(rawLoc: string | null): string {
  if (!rawLoc) return "Nearby Local Area";
  const trimmed = rawLoc.trim();
  const lower = trimmed.toLowerCase();

  if (/\b(?:near|gali|block|sec|sector|pocket|phase|road|floor|opp|behind)\b/i.test(trimmed)) {
    return trimmed;
  }

  for (const [key, richLoc] of Object.entries(LOCALITY_LANDMARK_MAP)) {
    if (lower.includes(key)) {
      return richLoc;
    }
  }

  const primaryLoc = trimmed.split(",")[0].trim();
  return `${primaryLoc}, Main Block (Near Central Market)`;
}
