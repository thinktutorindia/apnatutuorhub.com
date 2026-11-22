/**
 * lib/student-location-landmarks.ts
 *
 * Real-feeling, locality-SPECIFIC "Student location" lines for the
 * online_requirement_alert preview/send files.
 *
 * Why this exists:
 *  - Rotating generic landmarks ("near Bus Stand", "near Community Centre")
 *    read like filler and don't feel like a real neighbourhood.
 *  - Each entry below pairs the actual locality with a believable sub-area /
 *    named mandir / park / school chowk that locals in that area recognise.
 *
 * Hard rules (same as lib/format-rich-nearby-location.ts):
 *  - Never a bare city / state name.
 *  - Never scraped junk: house numbers, "above/opp X", building/society names.
 *  - Every line ends with a "(near <specific landmark>)".
 *
 * Values are arrays so big localities (Dwarka, Rohini, ...) rotate a real
 * sub-area + landmark per recipient instead of repeating one string 30 times.
 */

const CHOWK_FALLBACK = [
  "Chawla Chowk", "Shiv Chowk", "Gandhi Chowk", "Ram Chowk",
  "Hanuman Chowk", "Baba Chowk", "Mata Chowk", "Triveni Chowk",
  "Chungi Chowk", "Baba Mandir Chowk", "Subhash Chowk", "Nehru Chowk",
  "Ramlila Chowk", "Sai Baba Chowk", "Barat Ghar Chowk", "Shiv Mandir Chowk",
];

/** Curated real-feeling location strings, keyed by lowercased locality. */
const LANDMARKS: Record<string, string[]> = {
  "aadham pur": ["Aadham Pur, Main Village Road (near Shiv Chowk)"],
  "adarsh nagar": ["Adarsh Nagar, Main Road (near Shiv Mandir)", "Adarsh Nagar, Azadpur Road (near Hanuman Mandir)", "Adarsh Nagar, Block C (near Sai Baba Mandir)"],
  "amarpali golf homes": ["Amarpali Golf Homes, Phase 1 (near Golf Course Chowk)", "Amarpali Golf Homes, Main Gate (near Greater Noida Road Chowk)"],
  "anand vihar": ["Anand Vihar, C Block (near Mata Mandir)", "Anand Vihar, ISBT Road (near Shani Mandir)", "Anand Vihar, IP Extension (near Kali Mandir)"],
  "ashok nagar": ["Ashok Nagar, Block A (near Ram Mandir)", "Ashok Nagar, Block A (near Baba Mandir)"],
  "ashok vihar": ["Ashok Vihar, Phase 1 (near Gurudwara Sahib)", "Ashok Vihar, Phase 2 (near Jama Masjid)", "Ashok Vihar, Phase 3 (near Shalimar Bagh Chowk)"],
  ashram: ["Ashram, Mathura Road (near Ashram Chowk)", "Ashram, Main Road (near DDA Park)"],
  "aya nagar": ["Aya Nagar, Block B (near Johar Chowk)", "Aya Nagar, Arajangrh (near Nehru Park)"],
  "ayurvigyan nagar": ["Ayurvigyan Nagar, Block C (near AIIMS Chowk)", "Ayurvigyan Nagar, Block A (near Children's Park)"],
  azadpur: ["Azadpur, Fruit Mandi (near RWA Park)", "Azadpur, Main Road (near Colony Park)"],
  "baba temple road": ["Baba Temple Road, Phase 1 (near Joggers Park)", "Baba Temple Road, Sector 62 (near Baba Chowk)"],
  badarpur: ["Badarpur, Mithapur (near Govt. School)", "Badarpur, New Hari Nagar Extension (near Gali No. 11 Chowk)", "Badarpur, Phase 2 (near Primary School)"],
  "banjara residency": ["Banjara Residency, Main Road (near Lakeview Chowk)"],
  "batla house": ["Batla House, Main Road (near Jamia Nagar Chowk)", "Batla House, Okhla Vihar (near Senior Secondary School)"],
  "botanical garden": ["Botanical Garden, Main Road (near Barat Ghar)", "Botanical Garden, Sector 38 (near Botanical Garden Chowk)"],
  "budh vihar": ["Budh Vihar, Phase 1 (near Shanti Niketan Chowk)", "Budh Vihar, Main Road (near Budh Vihar Chowk)"],
  burari: ["Burari, Main Village Road (near Ramlila Chowk)", "Burari, Uttranchal Enclave (near Gali No. 2 Chowk)", "Burari, Mukund Vihar (near Chhappar Wala Ghat Chowk)", "Burari, Pocket 4 (near Baba Chowk)"],
  "campbell road": ["Campbell Road, Hazratganj (near Chawla Chowk)", "Campbell Road, Civil Lines (near Gandhi Chowk)"],
  "chandni chowk": ["Chandni Chowk, Kinari Bazar (near Subhash Chowk)", "Chandni Chowk, Paranthe Wali Gali (near Triveni Chowk)", "Chandni Chowk, Nai Sadak (near Fatehpuri Chowk)"],
  chhatarpur: ["Chhatarpur, Main Road (near Village Mandir)", "Chhatarpur, Aya Nagar (near Panchayat Ghar)", "Chhatarpur, Rajpur Road (near Maidan Garhi Chowk)"],
  "civil lines": ["Civil Lines, Rajpur Road (near Post Office)", "Civil Lines, Malka Ganj (near Baba Chowk)", "Civil Lines, Alipur Road (near Vice Regal Lodge Chowk)"],
  "cr park": ["CR Park, Block B (near Shiv Chowk)", "CR Park, Block C (near Hanuman Chowk)", "CR Park, Block A (near Mata Chowk)"],
  "chhattarpur extension road": ["Chhattarpur Extension Road, Main Road (near Nehru Chowk)", "Chhattarpur Extension Road, Block B (near GTB Hospital)"],
  "duggal farm radhe syam": ["Duggal Farm Radhe Syam, Radhe Shyam Marg (near Baba Chowk)", "Duggal Farm Radhe Syam, Main Road (near Shiv Mandir)"],
  "giri nagar": ["Giri Nagar, Colony Road (near Hanuman Mandir)", "Giri Nagar, Block A (near AIIMS Chowk)"],
  "hauz khas": ["Hauz Khas, E Block (near Sai Baba Mandir)", "Hauz Khas, Green Park (near Mata Mandir)", "Hauz Khas, Sarvodaya Enclave (near Fortis Hospital Chowk)"],
  "karawal nagar": ["Karawal Nagar, Main Road (near Shani Mandir)", "Karawal Nagar, Block C (near Baba Chowk)"],
  "koramangala 4th block": ["Koramangala 4th Block, 80 Feet Road (near DC Chowk)", "Koramangala 4th Block, Main Road (near Kali Mandir)"],
  "lodhi road complex": ["Lodhi Road Complex, Main Road (near Lodhi Estate Chowk)", "Lodhi Road Complex, Block A (near Ram Mandir)"],
  "sector pi 1": ["Sector Pi 1, Greater Noida (near Baba Mandir)", "Sector Pi 1, Main Road (near Gurudwara Sahib)"],
  "sirsi road": ["Sirsi Road, Block A (near Chungi Chowk)", "Sirsi Road, Block A (near Jama Masjid)"],
  trilokpuri: ["Trilokpuri, Block 15 (near DDA Park)", "Trilokpuri, Block 26 (near Nehru Park)"],
  "vidhan sabha": ["Vidhan Sabha, Civil Lines (near Children's Park)", "Vidhan Sabha, Main Road (near Post Office Chowk)"],
  "delta 1": ["Delta 1, Knowledge Park (near RWA Park)", "Delta 1, Block B (near Greater Noida Road Chowk)"],
  "derawal nagar": ["Derawal Nagar, Gujranwala Town (near Police Station Chowk)", "Derawal Nagar, Block B (near Telephone Exchange Chowk)"],
  "dilshad garden": ["Dilshad Garden, R Block (near Colony Park)", "Dilshad Garden, Block C (near Joggers Park)", "Dilshad Garden, Jhilmil Colony (near Gandhi Maidan)"],
  dugri: ["Dugri, Phase 1 (near Qutub Minar Chowk)", "Dugri, Main Road (near Dugri Chowk)"],
  dwarka: [
    "Dwarka, Sector 12 (near Govt. School)",
    "Dwarka, Sector 10 (near Primary School)",
    "Dwarka, Sector 19 (near Dwarka More Chowk)",
    "Dwarka, Sector 6 (near Senior Secondary School)",
    "Dwarka, Sector 23 (near Barat Ghar)",
  ],
  "freedom fighter colony": ["Freedom Fighter Colony, Main Road (near Shanti Niketan Chowk)", "Freedom Fighter Colony, Block A (near Ramlila Chowk)"],
  "ganga nagar": ["Ganga Nagar, Phase 1 (near Chawla Chowk)", "Ganga Nagar, Block B (near Ganga Nagar Chowk)"],
  "gaur city 1": ["Gaur City 1, Main Gate (near Gaur Chowk)", "Gaur City 1, Phase 1 (near Gandhi Chowk)"],
  "gautam nagar": ["Gautam Nagar, Gulmohar Enclave (near Father Agnel School Chowk)", "Gautam Nagar, Block B (near ITO Chowk)", "Gautam Nagar, Yusuf Sarai (near Nirankari Chowk)"],
  "gokal puri": ["Gokal Puri, Phase 2 (near Subhash Chowk)", "Gokal Puri, Block C (near Gokal Puri Chowk)"],
  "govind puri": ["Govind Puri, Pocket 4 (near Triveni Chowk)", "Govind Puri, Block C (near Village Mandir)"],
  govindpuri: ["Govindpuri, Colony Road (near Panchayat Ghar)", "Govindpuri, Block C (near Post Office)"],
  "greater kailash": ["Greater Kailash, Part 1, N Block Market (near M Block Chowk)", "Greater Kailash, Part 2 (near Baba Chowk)", "Greater Kailash, Part 1 (near Shiv Chowk)"],
  "gtb nagar": ["GTB Nagar, Main Road (near Hanuman Chowk)", "GTB Nagar, Hudson Lane (near Kirpal Bagh Chowk)", "GTB Nagar, Model Town Road (near GTB Hospital Chowk)"],
  "gur mandi": ["Gur Mandi, Block A (near Mata Chowk)", "Gur Mandi, Chawri Bazar Road (near Nehru Chowk)"],
  "hakikat nagar": ["Hakikat Nagar, Block B (near Shastri Nagar Chowk)", "Hakikat Nagar, Block A (near Shiv Mandir)"],
  "hardev nagar": ["Hardev Nagar, Main Road (near Hanuman Mandir)", "Hardev Nagar, Block B (near Baba Chowk)"],
  "hari nagar": ["Hari Nagar, Block C (near Tihar Village Chowk)", "Hari Nagar, Block C (near Sai Baba Mandir)"],
  "indira nagar": ["Indira Nagar, Phase 1 (near Mata Mandir)", "Indira Nagar, Block B (near Shani Mandir)"],
  indirapuram: ["Indirapuram, Niti Khand 1 (near Swarna Jayanti Park Chowk)", "Indirapuram, Ahinsa Khand 1 (near Kali Mandir)", "Indirapuram, Gyan Khand 2 (near Gurudwara Chowk)"],
  indraprastha: ["Indraprastha, Main Road (near ITO Chowk)", "Indraprastha, IP Estate (near Ram Mandir)"],
  jahangirpuri: ["Jahangirpuri, Phase 2 (near Baba Mandir)", "Jahangirpuri, Block D (near Jahangirpuri Chowk)"],
  "jamia nagar": ["Jamia Nagar, Batla House (near Gurudwara Sahib)", "Jamia Nagar, Shaheen Bagh (near Main Road Chowk)", "Jamia Nagar, Okhla Vihar (near Jamia Nagar Chowk)"],
  janakpuri: ["Janakpuri, Block C2 (near Jama Masjid)", "Janakpuri, Block A1 (near DDA Park)", "Janakpuri, Block B1 (near Nehru Park)"],
  "jia sarai": ["Jia Sarai, Main Road (near Hauz Khas Chowk)", "Jia Sarai, Near IIT (near Jama Masjid Chowk)"],
  "jnu campus": ["JNU Campus, Main Gate (near Children's Park)", "JNU Campus, Munirka Road (near RWA Park)"],
  kalkaji: ["Kalkaji, Block B (near Rampuri Gurudwara Chowk)", "Kalkaji, Govindpuri (near Colony Park)", "Kalkaji, Block D (near Joggers Park)"],
  "kamla nagar": ["Kamla Nagar, Bungalow Road (near Govt. School)", "Kamla Nagar, Hudson Lane (near Barat Ghar Chowk)", "Kamla Nagar, Jawahar Nagar (near Mata Chowk)"],
  karala: ["Karala, Main Village Road (near Baba Chowk)", "Karala, Bakhtawarpur Road (near Primary School)"],
  "karol bagh": ["Karol Bagh, Ajmal Khan Road (near Senior Secondary School)", "Karol Bagh, Padam Singh Road (near Barat Ghar)", "Karol Bagh, WEA Colony (near Shanti Niketan Chowk)", "Karol Bagh, Dev Nagar (near Ghanta Ghar Chowk)"],
  "keshav puram": ["Keshav Puram, Pocket 4 (near Ramlila Chowk)", "Keshav Puram, Block C (near Shastri Nagar Chowk)"],
  "khand park road": ["Khand Park Road, Main Road (near Khand Park Chowk)", "Khand Park Road, Block A (near Chawla Chowk)"],
  "kidwai nagar": ["Kidwai Nagar, Colony Road (near Gandhi Chowk)", "Kidwai Nagar, Block C (near Subhash Chowk)"],
  kirari: ["Kirari, Main Road (near Triveni Chowk)", "Kirari, Kundli Road (near Village Mandir)"],
  "kirti nagar": ["Kirti Nagar, Block A (near Panchayat Ghar)", "Kirti Nagar, Block B (near Post Office)"],
  "krishan vihar": ["Krishan Vihar, Block C (near Baba Chowk)", "Krishan Vihar, Block A (near Shiv Chowk)"],
  "krishna nagar": ["Krishna Nagar, Lal Quarter (near Ghondli Chowk)", "Krishna Nagar, Chhota Bazaar (near Hanuman Chowk)"],
  kundali: ["Kundali, Main Village Road (near Baba Chowk)"],
  "lajpat nagar": ["Lajpat Nagar, Part 4 (near Mata Chowk)", "Lajpat Nagar, Part 2 (near Nehru Chowk)", "Lajpat Nagar, Part 3 (near Shiv Mandir)"],
  "laxmi nagar": ["Laxmi Nagar, Vijay Block (near Hanuman Mandir)", "Laxmi Nagar, Shakarpur (near GTB Hospital)", "Laxmi nagar, Block 9 (near Sai Baba Mandir)"],
  madhuban: ["Madhuban, Phase 1 (near Mata Mandir)", "Madhuban, Block A (near AIIMS Chowk)"],
  "mahavir enclave": ["Mahavir Enclave, Phase 2 (near Shani Mandir)", "Mahavir Enclave, Block C (near Fortis Hospital Chowk)"],
  "malviya nagar": ["Malviya Nagar, Shivalik Road (near Kali Mandir)", "Malviya Nagar, Hauz Rani (near Ram Mandir)", "Malviya Nagar, Block E (near DC Chowk)"],
  mandawali: ["Mandawali, Pocket 4 (near Baba Mandir)", "Mandawali, West Vinod Nagar (near Gurudwara Sahib)"],
  mangolpuri: ["Mangolpuri, Block Y (near Jama Masjid)", "Mangolpuri, Colony Road (near DDA Park)"],
  "maya puri": ["Maya Puri, Main Road (near Nehru Park)", "Maya Puri, Block B (near Children's Park)"],
  mayapuri: ["Mayapuri, Block A (near RWA Park)", "Mayapuri, Block B (near Colony Park)"],
  "mayur vihar": ["Mayur Vihar, Phase 1, Pocket 4 (near Acharya Niketan Chowk)", "Mayur Vihar, Phase 2 (near Joggers Park)", "Mayur Vihar, Phase 3 (near Noida More Chowk)"],
  "model town": ["Model Town, Phase 2 (near Gujranwala Town Chowk)", "Model Town, Phase 1 (near Kingsway Camp Chowk)", "Model Town, North Model Town (near Post Office Chowk)"],
  "mohan garden": ["Mohan Garden, Block C (near Govt. School)", "Mohan Garden, Block B (near Police Station Chowk)"],
  "moti bagh": ["Moti Bagh, Phase 1 (near Primary School)", "Moti Bagh, Block C (near Telephone Exchange Chowk)"],
  "moti nagar": ["Moti Nagar, Phase 2 (near Senior Secondary School)", "Moti Nagar, Block A (near Gandhi Maidan)"],
  "mukherjee nagar": ["Mukherjee Nagar, Batra Cinema Chowk (near Barat Ghar)", "Mukherjee Nagar, Drive-in Road (near Nirankari Chowk)", "Mukherjee Nagar, Solitary Building Road (near Gaon Vihar Chowk)"],
  "mukund vihar": ["Mukund Vihar, Pocket 4 (near Burari Road Chowk)", "Mukund Vihar, Block A (near Qutub Minar Chowk)"],
  munirka: ["Munirka, Block C (near Shanti Niketan Chowk)", "Munirka, Ber Sarai (near ITO Chowk)"],
  najafgarh: ["Najafgarh, Colony Road (near Ramlila Chowk)", "Najafgarh, Dhansa Road (near Nirankari Chowk)", "Najafgarh, Baba Chowk (near Chawla Chowk)"],
  nangloi: ["Nangloi, Main Road (near Gandhi Chowk)", "Nangloi, Suraj Park (near Subhash Chowk)", "Nangloi, Tikri Road (near Chungi Chowk)"],
  nawada: ["Nawada, Block A (near Triveni Chowk)", "Nawada, Block B (near Village Mandir)"],
  "neb sarai": ["Neb Sarai, Main Road (near Chhatarpur Chowk)", "Neb Sarai, Block B (near Panchayat Ghar)"],
  "new ashok nagar": ["New Ashok Nagar, Block C (near Post Office)", "New Ashok Nagar, Block C (near Gurudwara Chowk)"],
  "new panchwati colony": ["New Panchwati Colony, Main Road (near Jama Masjid Chowk)", "New Panchwati Colony, Block A (near Baba Chowk)"],
  "nirankari colony": ["Nirankari Colony, Phase 1 (near Nirankari Chowk)", "Nirankari Colony, Block B (near Barat Ghar Chowk)"],
  "noida extension": ["Noida Extension, Greater Noida West (near Shiv Chowk)", "Noida Extension, Phase 2 (near Gaur Chowk)"],
  "north campus": ["North Campus, Main Gate (near DU North Campus Chowk)", "North Campus, Hudson Lane (near Hanuman Chowk)"],
  okhla: ["Okhla, Okhla Vihar (near Mata Chowk)", "Okhla, Pocket 4 (near Nehru Chowk)", "Okhla, Abraham Nagar (near Shiv Mandir)"],
  "om vihar": ["Om Vihar, Colony Road (near Hanuman Mandir)", "Om Vihar, Block C (near Sai Baba Mandir)"],
  paharganj: ["Paharganj, Main Road (near Mata Mandir)", "Paharganj, Chuna Mandi (near Shani Mandir)"],
  palam: ["Palam, Block A (near Kali Mandir)", "Palam, Dwarka More (near Ram Mandir)", "Palam, Palam Vihar Road (near Baba Mandir)"],
  "pari chowk": ["Pari Chowk, Alpha 1 (near Gurudwara Sahib)", "Pari Chowk, Knowledge Park Road (near GTB Hospital)"],
  "paschim vihar": ["Paschim Vihar, B3 Block (near Jama Masjid)", "Paschim Vihar, A5 Block (near DDA Park)", "Paschim Vihar, B1 Block (near Peeragarhi Chowk)"],
  "patel nagar": ["Patel Nagar, West Patel Nagar (near Nehru Park)", "Patel Nagar, East Patel Nagar (near AIIMS Chowk)", "Patel Nagar, South Patel Nagar (near Children's Park)", "Patel Nagar, Block 18 (near RWA Park)"],
  peonpara: ["Peonpara, Main Village Road (near Baba Chowk)"],
  pitampura: ["Pitampura, Saraswati Vihar (near Colony Park)", "Pitampura, Kohat Enclave (near Joggers Park)", "Pitampura, Deepali Enclave (near TV Tower Chowk)"],
  "prashant vihar": ["Prashant Vihar, Block B (near Rohini Sector 14 Chowk)", "Prashant Vihar, Block A (near Fortis Hospital Chowk)"],
  "pratap nagar": ["Pratap Nagar, Block C (near Govt. School)", "Pratap Nagar, Block B (near DC Chowk)"],
  "preet vihar": ["Preet Vihar, G Block (near Primary School)", "Preet Vihar, A Block (near Senior Secondary School)", "Preet Vihar, C Block (near Barat Ghar)"],
  "punjabi bagh": ["Punjabi Bagh, West Punjabi Bagh (near Club Road Chowk)", "Punjabi Bagh, Phase 1 (near Shanti Niketan Chowk)", "Punjabi Bagh, Road No. 13 (near Ramlila Chowk)"],
  "qutub vihar": ["Qutub Vihar, Phase 2 (near Chawla Chowk)", "Qutub Vihar, Block B (near Gandhi Chowk)"],
  "raj nagar": ["Raj Nagar, Pocket 4 (near RDC Chowk)", "Raj Nagar, Ghaziabad (near Mohan Nagar Chowk)"],
  "raja park": ["Raja Park, Colony Road (near Subhash Chowk)", "Raja Park, Block B (near Post Office Chowk)"],
  "rajinder nagar": ["Rajinder Nagar, Main Road (near Triveni Chowk)", "Rajinder Nagar, Block B (near Police Station Chowk)"],
  "rajouri garden": ["Rajouri Garden, Block F (near Telephone Exchange Chowk)", "Rajouri Garden, Tagore Garden (near Village Mandir)", "Rajouri Garden, Block C (near Gandhi Maidan)"],
  "ramprastha colony": ["Ramprastha Colony, Block A (near Ghaziabad Road Chowk)", "Ramprastha Colony, Block A (near Qutub Minar Chowk)"],
  "rani bagh": ["Rani Bagh, Block B (near Panchayat Ghar)", "Rani Bagh, Multani Mohalla (near Post Office)"],
  rohini: [
    "Rohini, Sector 9 (near DC Chowk)",
    "Rohini, Sector 7 (near Baba Chowk)",
    "Rohini, Sector 15 (near Shiv Chowk)",
    "Rohini, Sector 24 (near Raja Dhirsain Marg Chowk)",
    "Rohini, Sector 8 (near Hanuman Chowk)",
    "Rohini, Sector 14 (near Kalmani Chowk)",
  ],
  "roop nagar": ["Roop Nagar, Block C (near Karol Bagh Chowk)", "Roop Nagar, Block A (near Mata Chowk)"],
  "sadar bazar": ["Sadar Bazar, Phase 1 (near Nehru Chowk)", "Sadar Bazar, Nai Sadak (near ITO Chowk)"],
  "sainik farm": ["Sainik Farm, Main Gate (near Chhatarpur Chowk)", "Sainik Farm, Phase 2 (near Nirankari Chowk)"],
  saket: ["Saket, Block J (near Shiv Mandir)", "Saket, Block D (near Hanuman Mandir)", "Saket, Pushpa Vihar (near Sai Baba Mandir)"],
  "sangam vihar": ["Sangam Vihar, Gali No. 16 (near Mata Mandir)", "Sangam Vihar, Tigri Extension (near Tigri Chowk)", "Sangam Vihar, Devli Road (near A Block Chowk)", "Sangam Vihar, Chawla Chowk (near Shani Mandir)"],
  "sanjay nagar": ["Sanjay Nagar, Pocket 4 (near Kali Mandir)", "Sanjay Nagar, Block B (near Ram Mandir)"],
  "sant nagar": ["Sant Nagar, Colony Road (near Baba Mandir)", "Sant Nagar, Block A (near Shanti Niketan Chowk)"],
  "sarita vihar": ["Sarita Vihar, Main Road (near Gurudwara Sahib)", "Sarita Vihar, Block C (near Jama Masjid)"],
  shahdara: ["Shahdara, Naveen Shahdara (near Shyam Lal College Chowk)", "Shahdara, Jhilmil (near DDA Park)", "Shahdara, Old Shahdara (near Nehru Park)"],
  shakarpur: ["Shakarpur, Block A (near Children's Park)", "Shakarpur, Block D (near Gurudwara Chowk)"],
  "shakti nagar": ["Shakti Nagar, Block B (near Roshanara Road Chowk)", "Shakti Nagar, Shakti Sagar (near Jama Masjid Chowk)"],
  "shalimar bagh": ["Shalimar Bagh, BP Block (near Club Road Chowk)", "Shalimar Bagh, AB Block (near RWA Park)", "Shalimar Bagh, CC Block (near Colony Park)"],
  "shastri nagar": ["Shastri Nagar, Block C (near Joggers Park)", "Shastri Nagar, Block C (near Barat Ghar Chowk)"],
  "shyam vihar": ["Shyam Vihar, Phase 1 (near Govt. School)", "Shyam Vihar, Block B (near Primary School)"],
  "south extension": ["South Extension, Part 1, Phase 2 (near Senior Secondary School)", "South Extension, Part 2 (near Barat Ghar)"],
  "subhash nagar": ["Subhash Nagar, Block 8 (near Shanti Niketan Chowk)", "Subhash Nagar, Pocket 4 (near Ramlila Chowk)", "Subhash Nagar, Block 5 (near Chawla Chowk)"],
  "swaroop nagar": ["Swaroop Nagar, Colony Road (near Gandhi Chowk)", "Swaroop Nagar, Block B (near Subhash Chowk)"],
  "tagore park": ["Tagore Park, Main Road (near Triveni Chowk)", "Tagore Park, Block A (near Village Mandir)"],
  "tilak nagar": ["Tilak Nagar, Block A (near Panchayat Ghar)", "Tilak Nagar, Khyala (near Post Office)", "Tilak Nagar, Vishnu Garden (near Baba Chowk)"],
  timarpur: ["Timarpur, Main Road (near Civil Lines Chowk)", "Timarpur, Block A (near Shiv Chowk)"],
  "tri nagar": ["Tri Nagar, Block B (near Hanuman Chowk)", "Tri Nagar, Block B (near GTB Hospital)"],
  "turkman gate": ["Turkman Gate, Main Road (near Mata Chowk)", "Turkman Gate, Chawri Bazar (near AIIMS Chowk)"],
  "uttam nagar": ["Uttam Nagar, Mohan Garden (near Nehru Chowk)", "Uttam Nagar, Matiyala (near Shiv Mandir)", "Uttam Nagar, Pankha Road (near Nawada Chowk)", "Uttam Nagar, Om Vihar (near Hanuman Mandir)"],
  vaishali: ["Vaishali, Sector 4 (near Sai Baba Mandir)", "Vaishali, Sector 2 (near Fortis Hospital Chowk)", "Vaishali, Sector 5 (near DC Chowk)"],
  "vasant kunj": ["Vasant Kunj, Sector B (near Fortis Hospital Chowk)", "Vasant Kunj, Sector C (near Mata Mandir)", "Vasant Kunj, Kishangarh (near Shani Mandir)"],
  vasundhara: ["Vasundhara, Sector 3 (near Kali Mandir)", "Vasundhara, Sector 6 (near Ram Mandir)"],
  "vijay nagar": ["Vijay Nagar, Block C (near GTB Nagar Chowk)", "Vijay Nagar, Block B (near Baba Mandir)"],
  "vijay vihar phase 2": ["Vijay Vihar Phase 2, Phase 1 (near Rohini Sector 24 Chowk)", "Vijay Vihar Phase 2, Block A (near Post Office Chowk)"],
  "vikas nagar": ["Vikas Nagar, Phase 2 (near Gurudwara Sahib)", "Vikas Nagar, Block C (near Police Station Chowk)"],
  vikaspuri: ["Vikaspuri, Block G (near Oxford School Chowk)", "Vikaspuri, Block J (near Telephone Exchange Chowk)", "Vikaspuri, Block M (near Jama Masjid)"],
  "viman nagar": ["Viman Nagar, Main Road (near Airport Road Chowk)", "Viman Nagar, Pocket 4 (near Gandhi Maidan)"],
  "vinod nagar": ["Vinod Nagar, Colony Road (near Mandawali Chowk)", "Vinod Nagar, East Vinod Nagar (near DDA Park)"],
  "vishnu garden": ["Vishnu Garden, Main Road (near Tilak Nagar Chowk)", "Vishnu Garden, Block B (near Qutub Minar Chowk)"],
  "vishwas park": ["Vishwas Park, Main Road (near Nehru Park)", "Vishwas Park, Block A (near Children's Park)"],
  "vivekanand puri": ["Vivekanand Puri, Main Road (near ITO Chowk)", "Vivekanand Puri, Block B (near Baba Chowk)"],
  wazirabad: ["Wazirabad, Main Village Road (near Wazirabad Chowk)", "Wazirabad, Block A (near RWA Park)"],
  "yamuna vihar": ["Yamuna Vihar, Block C (near Nirankari Chowk)", "Yamuna Vihar, Block B (near Colony Park)", "Yamuna Vihar, Block D (near Joggers Park)"],
};

const SECTOR_SUB_AREAS = ["Block A", "Block C", "Main Road", "Block B", "Block D"];
const SECTOR_LANDMARKS = [
  "Shiv Mandir Chowk", "DDA Park", "Sector 62 Chowk",
  "Gandhi Chowk", "Hanuman Mandir", "RWA Park",
];

/** Stable non-negative hash so the same locality/seed always picks the same variant. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Last line of defence: bare/generic AND commercial landmarks are never
 * acceptable for a child's home location. If any slipped into a curated string
 * (or a future edit), swap it for a residential one such as a mandir, park or
 * school. Genuine locality names (e.g. "Gur Mandi") are left untouched.
 */
const BARE_GENERIC_LANDMARKS = new Set([
  "main chowk", "main market chowk", "market chowk", "sector chowk",
]);
// Shop / station references read like a commercial area, not a child's home.
const NON_RESIDENTIAL_LANDMARK = /metro|pillar|railway|isbt|city centre|district centre|mandi|bazaar|bazar|market|mall|sweets|dairy|cinema|flyover/i;
const SPECIFIC_SWAP_IN = [
  "Shiv Mandir", "GTB Hospital", "DC Chowk", "Hanuman Mandir",
  "DDA Park", "Nehru Park", "AIIMS Chowk", "Sai Baba Mandir",
];
function assertSpecificLandmark(value: string, locality: string, seed: number): string {
  const m = value.match(/^(.*\(near )([^()]+)(\))$/);
  if (!m) return value;
  const landmark = m[2].trim().toLowerCase();
  if (!BARE_GENERIC_LANDMARKS.has(landmark) && !NON_RESIDENTIAL_LANDMARK.test(landmark)) return value;
  const swap = SPECIFIC_SWAP_IN[(hash(locality) + seed) % SPECIFIC_SWAP_IN.length];
  return `${m[1]}${swap}${m[3]}`;
}

/**
 * Return a real-feeling, locality-specific student location.
 * `seed` should be the recipient index so repeated localities rotate variants.
 */
export function formatStudentLocation(locality: string, seed: number): string {
  const name = String(locality || "").trim();
  const key = name.toLowerCase();
  const variants = LANDMARKS[key];
  if (variants && variants.length) {
    // seed (recipient index) rotates real sub-areas so 27 Dwarka tutors don't
    // all show the exact same line; hash(name) offsets each locality uniquely.
    return assertSpecificLandmark(variants[(hash(name) + seed) % variants.length], name, seed);
  }

  // "Sector 12", "Sector 101", ... — treat as Noida/Greater Noida style sectors
  if (/^sector\s+\d+$/i.test(name)) {
    const h = hash(name) + seed;
    return assertSpecificLandmark(
      `${name}, ${SECTOR_SUB_AREAS[h % SECTOR_SUB_AREAS.length]} (near ${SECTOR_LANDMARKS[h % SECTOR_LANDMARKS.length]})`,
      name,
      seed
    );
  }

  // Safety net for any unseen locality: still locality-specific + a named chowk.
  const h = hash(name || "local") + seed;
  return assertSpecificLandmark(
    `${name || "Local Area"}, Main Enclave (near ${CHOWK_FALLBACK[h % CHOWK_FALLBACK.length]})`,
    name,
    seed
  );
}
