// Comprehensive Indian Location Dictionary
const LOCATION_MAPPINGS = [
  // North Delhi
  { pattern: /\b(?:gtb(?:\s*ngr|\s*nagar)?|guru\s*teg\s*bahadur\s*nagar)\b/i, canonical: "GTB Nagar, North Delhi" },
  { pattern: /\b(?:model\s*town(?:\s*[123]|[\s-]*[a-h]\s*block)?)\b/i, canonical: "Model Town, North Delhi" },
  { pattern: /\b(?:mukherjee\s*nagar|mukharjee\s*nagar|mukharji\s*nagar)\b/i, canonical: "Mukherjee Nagar, North Delhi" },
  { pattern: /\b(?:kamla\s*nagar|kamal\s*nagar)\b/i, canonical: "Kamla Nagar, North Delhi" },
  { pattern: /\b(?:shakti\s*nagar|shakit\s*nagar)\b/i, canonical: "Shakti Nagar, North Delhi" },
  { pattern: /\b(?:roop\s*nagar|roopa\s*nagar)\b/i, canonical: "Roop Nagar, North Delhi" },
  { pattern: /\b(?:malka\s*ganj|malkagaj|malk\s*ganj)\b/i, canonical: "Malka Ganj, North Delhi" },
  { pattern: /\b(?:derawal(?:\s*nagar)?|dera\s*wal)\b/i, canonical: "Derawal Nagar, North Delhi" },
  { pattern: /\b(?:gujranwala(?:\s*town)?|gugrawala(?:\s*town)?|gujrawala(?:\s*town)?)\b/i, canonical: "Gujranwala Town, North Delhi" },
  { pattern: /\b(?:adarsh\s*nagar|adharsh\s*nagagr|adarsh\s*anand)\b/i, canonical: "Adarsh Nagar, North Delhi" },
  { pattern: /\b(?:azadpur|aazadpur)\b/i, canonical: "Azadpur, North Delhi" },
  { pattern: /\b(?:jahangir\s*puri|jahangirpuri|jhangirpuri)\b/i, canonical: "Jahangirpuri, North Delhi" },
  { pattern: /\b(?:burari|sant\s*nagar(?:\s*burari)?)\b/i, canonical: "Sant Nagar, Burari, North Delhi" },
  { pattern: /\b(?:wazirabad|wazirabaad|wajirabad)\b/i, canonical: "Wazirabad, North Delhi" },
  { pattern: /\b(?:nirankari(?:\s*colony)?)\b/i, canonical: "Nirankari Colony, North Delhi" },
  { pattern: /\b(?:timarpur|timar\s*pur)\b/i, canonical: "Timarpur, North Delhi" },
  { pattern: /\b(?:majlis\s*park)\b/i, canonical: "Majlis Park, North Delhi" },
  { pattern: /\b(?:kalyan\s*vihar|kalan\s*vihar)\b/i, canonical: "Kalyan Vihar, North Delhi" },
  { pattern: /\b(?:cc\s*colony|old\s*gupta\s*colony|gupta\s*colony)\b/i, canonical: "Old Gupta Colony / CC Colony, North Delhi" },
  { pattern: /\b(?:kingsway\s*camp|dhaka(?:\s*village)?|indra\s*vikas(?:\s*colony)?|gandhi\s*vihar|nehru\s*vihar)\b/i, canonical: "North Campus, Delhi University" },
  { pattern: /\b(?:north\s*campus|vishwavidyalaya|vishv\s*vidyalaya)\b/i, canonical: "North Campus, Delhi University" },
  { pattern: /\b(?:rana\s*pratap\s*bagh|rp\s*bagh)\b/i, canonical: "Rana Pratap Bagh, North Delhi" },
  { pattern: /\b(?:gulabi\s*bagh|pratap\s*nagar|shastri\s*nagar)\b/i, canonical: "Shastri Nagar / Gulabi Bagh, North Delhi" },
  { pattern: /\b(?:civil\s*lines|vidhan\s*sabha|vidha\s*sabha|vidhana\s*sabah)\b/i, canonical: "Civil Lines / Vidhan Sabha, North Delhi" },
  { pattern: /\b(?:mkt|majnu\s*ka\s*tilla)\b/i, canonical: "Majnu Ka Tilla, North Delhi" },
  { pattern: /\b(?:outum\s*lane|otrum\s*lane|outram\s*line(?:s)?)\b/i, canonical: "Outram Lines, GTB Nagar, North Delhi" },
  { pattern: /\b(?:sawan\s*park|ashok\s*nagar)\b/i, canonical: "Ashok Vihar, North Delhi" },

  // Central Delhi
  { pattern: /\b(?:karol\s*bagh|karol\s*vagh|regarpura|dev\s*nagar|tank\s*road)\b/i, canonical: "Karol Bagh, Central Delhi" },
  { pattern: /\b(?:paharganj|pahadganj|pahar\s*gunj)\b/i, canonical: "Paharganj, Central Delhi" },
  { pattern: /\b(?:daryaganj|dariya\s*ganj|ansari\s*road)\b/i, canonical: "Daryaganj, Central Delhi" },
  { pattern: /\b(?:cp|connaught\s*place|canaught(?:\s*place)?)\b/i, canonical: "Connaught Place, Central Delhi" },
  { pattern: /\b(?:patel\s*nagar|west\s*patel\s*nagar|east\s*patel\s*nagar|baljeet\s*nagar|ranjit\s*nagar|ranjeet\s*nagar)\b/i, canonical: "Patel Nagar, Central Delhi" },
  { pattern: /\b(?:rajendra\s*nagar|rajender\s*nagar|old\s*rajinder\s*nagar|orn|pusa\s*road)\b/i, canonical: "Old Rajinder Nagar, Central Delhi" },
  { pattern: /\b(?:sadar\s*bazar|sadar\s*bazar|chawri\s*bazar|chawadi\s*bazar|chwari\s*bzar|chandni\s*chowk|mori\s*gate|kashmiri\s*gate|kashmere\s*gate|jama\s*masjid|aazad\s*market|azad\s*market|bada\s*hindu\s*rao|hindu\s*rao|tis\s*hazari|tishazari)\b/i, canonical: "Old Delhi / Kashmiri Gate / Sadar Bazar" },
  { pattern: /\b(?:rk\s*ashram|mandi\s*house|hailey\s*road)\b/i, canonical: "Central Delhi (Mandi House / RK Ashram)" },

  // West Delhi
  { pattern: /\b(?:punjabi\s*bagh|panjabi\s*bagh|west\s*punjabi\s*bagh|east\s*punjabi\s*bagh)\b/i, canonical: "Punjabi Bagh, West Delhi" },
  { pattern: /\b(?:paschim\s*vihar|pashim\s*vihar|pachim\s*vihar|behra\s*enclave|ambika\s*vihar|jwala\s*heri)\b/i, canonical: "Paschim Vihar, West Delhi" },
  { pattern: /\b(?:rajouri(?:\s*garden)?|raja\s*garden|tagore\s*garden(?:\s*ext(?:ension)?)?|subhash\s*nagar|subhas\s*nagar)\b/i, canonical: "Rajouri Garden / Tagore Garden / Subhash Nagar, West Delhi" },
  { pattern: /\b(?:tilak\s*nagar|tilakngr|tilal\s*ngr|hari\s*nagar(?:\s*ghanta\s*ghar)?|virender\s*nagar|ghanta\s*ghar)\b/i, canonical: "Tilak Nagar / Hari Nagar, West Delhi" },
  { pattern: /\b(?:janakpuri|janak\s*puri|jankpuri|chawla)\b/i, canonical: "Janakpuri, West Delhi" },
  { pattern: /\b(?:vikaspuri|vikash\s*puri|vilashpuri)\b/i, canonical: "Vikaspuri, West Delhi" },
  { pattern: /\b(?:uttam\s*nagar|uttam\s*ngr|mohan\s*garden|bindapur|dabri\s*mo[dr]|jeevan\s*park|om\s*vihar)\b/i, canonical: "Uttam Nagar / Mohan Garden, West Delhi" },
  { pattern: /\b(?:dwarka|dwaraka|dawarka)(?:\s*(?:sec(?:tor)?\s*(\d+)|mor|mod))?\b/i, canonical: "Dwarka, South West Delhi" },
  { pattern: /\b(?:vipin\s*garden)\b/i, canonical: "Vipin Garden, Dwarka Mor, Delhi" },
  { pattern: /\b(?:vishnu\s*garden|vishnu\s*park)\b/i, canonical: "Vishnu Garden, West Delhi" },
  { pattern: /\b(?:kirti\s*nagar|kriti\s*nagar|moti\s*nagar|karampura|karanpura|shadipur|mansarovar\s*garden|naraina(?:\s*vihar)?|narina|mayapuri|maya\s*puri)\b/i, canonical: "Kirti Nagar / Moti Nagar / Naraina, West Delhi" },
  { pattern: /\b(?:nangloi|nagloi|mundka|mundaka|nilwal|baprola|najafgarh|najfgadh)\b/i, canonical: "Nangloi / Najafgarh, West Delhi" },
  { pattern: /\b(?:palam|mahavir\s*enclave|sagarpur|sagar\s*pur|nangal\s*raya|delhi\s*cantt|delhi\s*cant)\b/i, canonical: "Palam / Sagarpur / Delhi Cantt" },

  // South Delhi
  { pattern: /\b(?:saket|malviya\s*nagar|panchsheel(?:\s*park)?|adhchini|savitri\s*nagar)\b/i, canonical: "Saket / Malviya Nagar, South Delhi" },
  { pattern: /\b(?:hauz\s*khas|haus\s*khas|green\s*park|safdarjung(?:\s*enclave)?|sda)\b/i, canonical: "Hauz Khas / Green Park / Safdarjung, South Delhi" },
  { pattern: /\b(?:south\s*ex(?:tension)?|defence\s*colony|lajpat\s*nagar|lajapt\s*nagar|kotla(?:\s*mubarakpur)?|amar\s*colony|dayanand\s*colony|andrews\s*ganj|moolchand)\b/i, canonical: "Lajpat Nagar / Defence Colony / South Ex, South Delhi" },
  { pattern: /\b(?:greater\s*kailash|gk-?[12]|cr\s*park|kalkaji|kalka\s*ji|govindpuri|govind\s*puri|nehru\s*nagar|ashram|bhogal|nizamuddin|jangpura|maharani\s*bagh)\b/i, canonical: "GK / Kalkaji / Ashram / Maharani Bagh, South Delhi" },
  { pattern: /\b(?:nfc|new\s*friends\s*colony|zakir\s*nagar|batla\s*house|jamia(?:\s*nagar)?|jamiya|okhla|jasola|sarita\s*vihar|sarira\s*vihar)\b/i, canonical: "New Friends Colony / Jamia / Sarita Vihar / Okhla, South Delhi" },
  { pattern: /\b(?:vasant\s*kunj|vasant\s*vihar|rk\s*puram|munirka|munrika|ber\s*sarai|jia\s*sarai|jnu|iit(?:\s*delhi)?)\b/i, canonical: "Vasant Kunj / Munirka / JNU, South Delhi" },
  { pattern: /\b(?:chattarpur|chatarpur|chattrpur|sangam\s*vihar|devli|khanpur|madangir|dakshin\s*puri|tughlakabad|tughlakabaad|badarpur|jaitpur|mehrauli)\b/i, canonical: "Chhatarpur / Sangam Vihar / Badarpur / Mehrauli, South Delhi" },
  { pattern: /\b(?:anand\s*niketan|chanakyapuri|moti\s*bagh|moth\s*bagh|niti\s*bagh|lodhi\s*colony|ina(?:\s*colony)?|pandara\s*park)\b/i, canonical: "Chanakyapuri / Moti Bagh / Lodhi Colony, South Delhi" },
  { pattern: /\b(?:sainik\s*farm|sanik\s*farm)\b/i, canonical: "Sainik Farm, South Delhi" },

  // East Delhi
  { pattern: /\b(?:laxmi\s*nagar|laxminagar|preet\s*vihar|nirman\s*vihar|shakarpur|pandav\s*nagar|patparganj|padparjanj|ip\s*ext(?:ension)?)\b/i, canonical: "Laxmi Nagar / Preet Vihar / IP Extension, East Delhi" },
  { pattern: /\b(?:mayur\s*vihar(?:\s*(?:phase\s*[123]|ext(?:ension)?))?|new\s*ashok\s*nagar|trilok\s*puri|trilokpuri)\b/i, canonical: "Mayur Vihar, East Delhi" },
  { pattern: /\b(?:anand\s*vihar|karkardooma|kadkadduma|surajmal\s*vihar|dayanand\s*vihar|rishabh\s*vihar|vivek\s*vihar)\b/i, canonical: "Anand Vihar / Karkardooma / Surajmal Vihar, East Delhi" },
  { pattern: /\b(?:geeta\s*colony|krishna\s*nagar|gandhi\s*nagar)\b/i, canonical: "Krishna Nagar / Geeta Colony, East Delhi" },
  { pattern: /\b(?:shahdara|shadhara|shahadra|rohtash\s*nagar|mansarovar\s*park|nand\s*nagri|brijpuri|yamuna\s*vihar|bhajanpura|brahmpuri|maujpur|gokalpuri|khajuri\s*khas|dayalpur|sonia\s*vihar|soniya\s*vihar|dilshad\s*garden|shastri\s*park|seelampur|sheelampur|usmanpur)\b/i, canonical: "Shahdara / Dilshad Garden / Yamuna Vihar, East Delhi" },

  // North West Delhi
  { pattern: /\b(?:pitampura|pritampura|pritam\s*pura|preetampura|rani\s*bagh|kohat(?:\s*enclave)?|saraswati\s*vihar|saraswati\s*garden)\b/i, canonical: "Pitampura / Rani Bagh / Saraswati Vihar, North West Delhi" },
  { pattern: /\b(?:shalimar\s*bagh|salimar\s*bagh|prashant\s*vihar|mangolpuri|mongolpuri|sultanpuri|pooth\s*kalan|kirari|budh\s*vihar|rithala)\b/i, canonical: "Shalimar Bagh / Rohini / Mangolpuri, North West Delhi" },
  { pattern: /\b(?:rohini)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+))?\b/i, canonical: "Rohini, North West Delhi" },
  { pattern: /\b(?:ashok\s*vihar|aashok\s*vihar|keshav\s*puram|keshavpuram)\b/i, canonical: "Ashok Vihar / Keshav Puram, North West Delhi" },
  { pattern: /\b(?:narela|swatantra\s*nagar|alipur|swaroop\s*nagar|samaypur\s*badli|samaypuri\s*badli|libaspur)\b/i, canonical: "Narela / Swaroop Nagar / Badli, North Delhi" },

  // NCR - Noida & Greater Noida
  { pattern: /\b(?:noida|nodia)(?:\s*(?:sec(?:tor)?\s*(\d+)|sector\s*\d+|extension))?\b/i, canonical: "Noida, UP" },
  { pattern: /\b(?:greater\s*noida|gr\s*noida|gr\s*nodia|gaur\s*city|noida\s*extension|ace\s*city|chi\s*v|supertech\s*romano)\b/i, canonical: "Greater Noida, UP" },

  // NCR - Ghaziabad
  { pattern: /\b(?:ghaziabad|gaziabad|ghaziyabaad|gaziyabad|ghz|gyz|gaz|gzy|indirapuram|indrapuram|indrapura|vaishali|vasundhara|vasundra|kaushambi|mohan\s*nagar|surya\s*nagar|sahibabad|raj\s*nagar(?:\s*ext(?:ension)?)?|pratap\s*vihar|khora\s*colony|ahinsa\s*khand)\b/i, canonical: "Ghaziabad, Delhi NCR" },

  // NCR - Gurgaon / Gurugram
  { pattern: /\b(?:gurgaon|gurugram)(?:\s*(?:sec(?:tor)?\s*(\d+)|dlf(?:\s*phase\s*\d+)?|sohna|badshahpur|gwal\s*pahari|south\s*city))?\b/i, canonical: "Gurugram, Haryana" },
  { pattern: /\b(?:dlf\s*phase\s*[1-5]|south\s*city\s*[12]|gwal\s*pahari|darbaripur)\b/i, canonical: "Gurugram, Haryana" },

  // NCR - Faridabad
  { pattern: /\b(?:faridabad|faridabaad)(?:\s*(?:sec(?:tor)?\s*(\d+)|dabua|tilpat|greenfields))?\b/i, canonical: "Faridabad, Haryana" },

  // Mumbai & Other Regions
  { pattern: /\b(?:thane|patlipada|patli\s*para|kasarvadavali|ghodbunder)\b/i, canonical: "Thane, Mumbai NCR" },
  { pattern: /\b(?:navi\s*mumbai|seawoods?|sea\s*wood|nerul|ghansoli|ulwe|vashi|kharghar)\b/i, canonical: "Navi Mumbai, Maharashtra" },
  { pattern: /\b(?:mumbai|malad|andheri|borivali|kandivali|versova|dadar|bandra|goregaon)\b/i, canonical: "Mumbai, Maharashtra" },
  { pattern: /\b(?:pune|chandigarh|mohali|dehradun|dheradun|shimla|lucknow|kanpur|prayagraj|allahabad|patna|guwahati|assam|bhopal|raipur|bangalore|banglore|hyderabad|hyd)\b/i, canonical: "Other Metro / Outstation" },
];

console.log("Locations total rules:", LOCATION_MAPPINGS.length);
