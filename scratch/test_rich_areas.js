const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const leads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Total leads to enhance:', leads.length);

// Rich Area Block & Society Enhancer
const RICH_LOCALITIES = {
  model_town: [
    'Block B, Model Town 2 (near Metro Station), North Delhi',
    'D-Block, Model Town 3 (near Alpana Cinema), North Delhi',
    'Derawal Nagar Enclave (near Model Town), North Delhi',
    'F-Block, Model Town 1 (near Nanda Hospital), North Delhi',
    'Priya Enclave, Model Town Phase 3, North Delhi'
  ],
  gk: [
    'Greater Kailash 1 (Block M, near M-Block Market), South Delhi',
    'Greater Kailash 2 (Block E, Pamposh Enclave), South Delhi',
    'Greater Kailash 1 (Block R, near Hansraj College), South Delhi',
    'Greater Kailash 2 (Block W, near Savitri Cinema), South Delhi'
  ],
  vasant_kunj: [
    'Vasant Kunj (Sector B, Pocket 1 - DDA SFS Flats), South Delhi',
    'Vasant Kunj (Sector C, Pocket 8 - Saraswati Apartments), South Delhi',
    'Vasant Kunj (Sector B, Pocket 7 - Ganga Apartments), South Delhi',
    'Vasant Kunj (Sector A, Pocket B, near Ambience Mall), South Delhi'
  ],
  saket: [
    'Saket (Block D, Anupam Enclave near Select Citywalk), South Delhi',
    'Saket (Block J, near PVR Anupam Complex), South Delhi',
    'Silver Oaks Apartments, Press Enclave Road, Saket, South Delhi',
    'Pushp Vihar (Sector 9, near Saket Metro Station), South Delhi',
    'Saket (Block M, near Max Super Speciality Hospital), South Delhi'
  ],
  hauz_khas: [
    'Hauz Khas Enclave (Block G, near Deer Park), South Delhi',
    'Hauz Khas Enclave (Block K, near Metro Station), South Delhi',
    'Padmini Enclave, Hauz Khas (near Aurobindo Market), South Delhi'
  ],
  defence_colony: [
    'Defence Colony (Block A, near Flyover Market), South Delhi',
    'Defence Colony (Block C, near Moets Club), South Delhi',
    'Defence Colony (Block D, near Lajpat Nagar Metro), South Delhi'
  ],
  green_park: [
    'Green Park Main (Block G, near Metro Station), South Delhi',
    'Gulmohar Park (Block B, near Gulmohar Club), South Delhi',
    'Green Park Extension (Block Y, near Evergreen Sweet Shop), South Delhi'
  ],
  panchsheel: [
    'Panchsheel Park (North Block Luxury Villas), South Delhi',
    'Panchsheel Park (South Block, near Panchsheel Club), South Delhi',
    'Panchsheel Enclave (Block E, near Soami Nagar), South Delhi'
  ],
  south_delhi_other: [
    'CR Park (Pocket 40, near K-Block Market), South Delhi',
    'Alaknanda (Tara Apartments / DDA SFS Flats), South Delhi',
    'Alaknanda (Mandakini Enclave, near Don Bosco School), South Delhi',
    'Safdarjung Enclave (Block B-5, near Kamal Cinema), South Delhi',
    'New Friends Colony (Block D, near Community Centre), South Delhi',
    'South Moti Bagh (Officers Enclave, near Chanakyapuri), South Delhi',
    'Lodhi Road (Sai Baba Temple Enclave, Block 18), South Delhi',
    'Anand Niketan (Block C Bungalow Zone), South Delhi',
    'Kalkaji (Block H, near Deshbandhu College), South Delhi'
  ],
  rohini: [
    'Rohini Sector 9 (Prashant Apartments, near D-Mall), North West Delhi',
    'Rohini Sector 13 (Nav Kunj Apartments, near Ring Road), North West Delhi',
    'Rohini Sector 14 (DDA SFS Flats, near Swarn Jayanti Park), North West Delhi',
    'Rohini Sector 8 (Block E, near Sai Baba Chowk), North West Delhi',
    'Rohini Sector 11 (Varun Apartments, near Rithala Metro), North West Delhi',
    'Rohini Sector 5 (Block B, near Ring Road), North West Delhi'
  ],
  pitampura: [
    'Pitampura (Sandesh Vihar, Road No. 44 near NSP Metro), North West Delhi',
    'Pitampura (Tarun Enclave, near Kohat Enclave Metro), North West Delhi',
    'Pitampura (Deepali Enclave, near Outer Ring Road), North West Delhi',
    'Pitampura (Block KD, near Netaji Subhash Place), North West Delhi'
  ],
  punjabi_bagh: [
    'Punjabi Bagh West (Road No. 42, Club Road Enclave), West Delhi',
    'Punjabi Bagh West (Road No. 10, near Central Market), West Delhi',
    'Punjabi Bagh East (Block N, near Punjabi Bagh Club), West Delhi'
  ],
  rajouri: [
    'Rajouri Garden (Block J, near Main Market / Metro), West Delhi',
    'Vishal Enclave (Block A, opp. Rajouri Garden Metro), West Delhi',
    'Rajouri Garden (Block F, near TDI Mall), West Delhi'
  ],
  janakpuri: [
    'Janakpuri (Block B-1, near District Centre / Metro), West Delhi',
    'Janakpuri (Block C-4, DDA SFS Flats), West Delhi',
    'Janakpuri (Block A-2, near Bharti College), West Delhi'
  ],
  paschim_vihar: [
    'Paschim Vihar (Block A-2, near Radisson Hotel), West Delhi',
    'Paschim Vihar (Block B-4, Ambica Vihar Enclave), West Delhi',
    'Paschim Vihar (GH-9, Sunder Vihar / Outer Ring Road), West Delhi'
  ],
  kirti_nagar: [
    'Mansarovar Garden (C-Block, near Kirti Nagar Metro), West Delhi',
    'Mansarovar Garden (A-Block, near Mayapuri Flyover), West Delhi',
    'Kirti Nagar (Block B, near Furniture Market / Ring Road), West Delhi'
  ],
  dwarka: [
    'Dwarka Sector 4 (Antriksh Apartments, near Metro Station), South West Delhi',
    'Dwarka Sector 10 (True Friends Apartments, near City Centre), South West Delhi',
    'Dwarka Sector 12 (Heritage Towers, near Sector 12 Metro), South West Delhi',
    'Dwarka Sector 22 (Dream Apartments, near Golf Course), South West Delhi',
    'Dwarka Sector 6 (Surya Apartments, near Market), South West Delhi'
  ],
  civil_lines: [
    'Civil Lines (Rajpur Road, Oberoi Apartments), North Delhi',
    'Civil Lines (Exchange Store Enclave, Flagstaff Road), North Delhi',
    'Civil Lines (Ludlow Castle Road Enclave), North Delhi'
  ],
  ashok_vihar: [
    'Ashok Vihar Phase 1 (Block B, near Deep Market), North West Delhi',
    'Ashok Vihar Phase 2 (Pocket I, Major Dhyan Chand Complex), North West Delhi',
    'Ashok Vihar Phase 3 (Pocket A, near Satyawati College), North West Delhi'
  ],
  central_north_delhi: [
    'Hudson Lane (Kingsway Camp, near GTB Nagar Metro), North Delhi',
    'CC Colony (Block B, Kalyan Vihar near North Campus), North Delhi',
    'Kamla Nagar (Block E, near Spark Mall / DU North Campus), North Delhi',
    'Malkaganj (Block C, near Hansraj College / DU Campus), North Delhi',
    'Karol Bagh (WEA Block, near Ganga Ram Hospital / Metro), Central Delhi',
    'Pusa Road (Block 15, Old Rajendra Nagar), Central Delhi',
    'Minto Road (Connaught Place Enclave), Central Delhi',
    'Rajan Babu Road (Block C, Adarsh Nagar), North Delhi',
    'Lawrence Road (Block C, Rampura Enclave / Ring Road), North West Delhi',
    'Rani Bagh (Block W, near Commercial Complex), North West Delhi'
  ],
  gurugram: [
    'DLF The Crest, Park Drive, DLF Phase 5, Gurugram',
    'DLF Phase 2 (Block J, near Cyber Hub), Gurugram',
    'DLF Phase 4 (Block C, near Galleria Market), Gurugram',
    'The Aralias, Golf Course Road, Gurugram',
    'Vipul Belmonte, Sector 53, Golf Course Road, Gurugram',
    'Central Park Resorts, Belgravia Block, Sector 48, Gurugram',
    'Ireo Skyon, Sector 60, Golf Course Extension, Gurugram',
    'Tata Primanti, Executive Floors, Sector 72, Gurugram',
    'Pioneer Araya, Sector 62, Golf Course Ext., Gurugram',
    'Nirvana Country (Aspen Greens Villas, Sector 50), Gurugram',
    'Sector 43 (Block E, near Golf Course Road / Metro), Gurugram',
    'Sector 102 (Shapoorji Pallonji Joyville, Dwarka Expressway), Gurugram',
    'Sector 37 (Pace City Luxury Enclave), Gurugram'
  ],
  noida: [
    'ATS Greens II, Sector 50, Noida',
    'Mahagun Maestro, Block B, Sector 50, Noida',
    'Pearl Gateway Towers, Sector 44, Noida',
    'ATS Greens Village, Sector 93A (Expressway), Noida',
    'Designer Park Apartments, Sector 62, Noida',
    'Purvanchal Royal Park, Sector 137, Noida',
    'Exotica Fresco, Tower C, Sector 137, Noida',
    'Grand Omaxe, Sector 93B, Noida',
    'Godrej Woods, Sector 43, Noida',
    'Prateek Edifice, Sector 107, Noida',
    'Jaypee Greens Wish Town (Klassic Towers, Sector 134), Noida'
  ],
  faridabad_ghaziabad: [
    'Indirapuram (Shipra Sun City / Windsor Park), Ghaziabad',
    'Vaishali (Sector 4, Mahagun Mosaic / Metro), Ghaziabad',
    'Rajendra Nagar (Sector 2, near Sahibabad Metro), Ghaziabad',
    'Sector 14 (HUDA Luxury Plots, near Modern School), Faridabad',
    'Sector 15A (Prime Residential Enclave), Faridabad',
    'Sector 45 (Greenfield Colony Enclave), Faridabad'
  ]
};

// Flatten list of all rich localities for rotational distribution
const ALL_RICH_LOCALITIES = Object.values(RICH_LOCALITIES).flat();
console.log('Total rich societies & blocks catalogued:', ALL_RICH_LOCALITIES.length);

function getRichLocation(origLoc, index, isOnline) {
  if (isOnline || (origLoc && origLoc.toLowerCase().includes('online'))) {
    return 'Online Class (Live 1-on-1 Virtual)';
  }

  const s = (origLoc || '').toLowerCase();

  // Match specific neighborhoods
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

  // If low-income or generic area was in raw data (e.g. Burari, Uttam Nagar, Okhla, Sangam Vihar, etc.):
  // Map deterministically to top rich areas
  return ALL_RICH_LOCALITIES[index % ALL_RICH_LOCALITIES.length];
}

console.log('\nTesting Rich Area assignments for sample 15 leads:');
leads.slice(0, 15).forEach((l, i) => {
  const enriched = getRichLocation(l.location, i, l.mode === 'ONLINE' || l.isOnline);
  console.log(`[${l.leadId}] "${l.location}" -> "${enriched}"`);
});
