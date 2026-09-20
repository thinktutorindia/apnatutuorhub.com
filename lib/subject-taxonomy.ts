/**
 * Centralized Subject Taxonomy for ApnaTutorHub
 * Single source of truth for all subjects across Tutor Profiles, Student Requirements,
 * Staff CRM, Search Filters, and Matching Algorithms.
 * Hard-pinned canonical taxonomy across the entire platform.
 */

export type CategoryNode = {
  name: string;
  subcategories?: { name: string; subjects: string[] }[];
  subjects?: string[];
};

export const TRUEMYTUTOR_TREE: CategoryNode[] = [
  {
    name: "Combo Subjects KG to 10th",
    subjects: [
      "All Subjects",
      "All Subjects (Class 1-8)",
      "All Subjects (Class 1-5)",
      "All Subjects (Class 6-8)",
      "All Subjects for Preparatory",
      "All Subjects For KG (Kindergarten)",
      "All Subjects For Class I",
      "All Subjects For Class II",
      "All Subjects For Class III",
      "All Subjects For Class IV",
      "All Subjects For Class V",
      "All Subjects For Class VI",
      "All Subjects For Class VII",
      "All Subjects For Class VIII",
      "All Subjects For Class IX",
      "All Subjects For Class X",
      "Abacus",
      "Jolly Phonics",
      "Phonetics",
      "Nursery",
      "PYP Units of Inquiry (UoI)",
      "Kalfun",
      "Science & Maths",
    ],
  },
  {
    name: "Science Subjects",
    subcategories: [
      {
        name: "Science",
        subjects: [
          "Science upto Class V",
          "Science for Class VI",
          "Science for Class VII",
          "Science for Class VIII",
          "Science for Class IX",
          "Science for Class X",
          "Design & Technology",
          "ACT Science",
          "ASSET Science",
        ],
      },
      {
        name: "Physics",
        subjects: [
          "Physics upto Class VIII",
          "Physics For Class IX",
          "Physics For Class X",
          "Physics For Class XI",
          "Physics For Class XII",
          "Physics",
          "Physics For College",
          "Physics for IITJEE",
          "GRE Physics",
          "Physics for Engineering Entrance",
          "Physics for Medical Entrance",
          "Thermodynamics",
          "Optics",
          "Solid State Physics",
          "Astrophysics",
          "Environmental Engineering",
          "AP Physics",
          "Molecular Physics",
          "Atomic Physics",
          "Physics for NEET",
          "Engineering Physics",
          "Astronomy",
          "Biophysics",
          "Geophysics",
          "Acoustics",
        ],
      },
      {
        name: "Chemistry",
        subjects: [
          "Chemistry For Class VIII",
          "Chemistry For Class IX",
          "Chemistry For Class X",
          "Chemistry For Class XI",
          "Chemistry For Class XII",
          "Chemistry For College",
          "Chemistry For Post Graduation",
          "Chemistry for IITJEE",
          "Chemistry for NEET",
          "Chemistry for Engineering",
          "Chemistry for Medical Entrance",
          "Evolution",
          "Recombinant DNA Technology",
          "Physical Chemistry",
          "Organic Chemistry",
          "Inorganic Chemistry",
          "Chemistry for IIT-JEE Advance",
          "Spectroscopy",
          "Engineering Chemistry",
          "Material Science",
          "Process Engineering",
        ],
      },
      {
        name: "Biology",
        subjects: [
          "Biology for Class VIII",
          "Biology for Class IX",
          "Biology for Class X",
          "Biology for Class XI",
          "Biology for Class XII",
          "Biology for Medical Entrance",
          "Biology for NEET",
          "Botany",
          "Zoology",
          "Ecology",
          "Genetics",
          "Physiology",
          "Molecular Biology",
          "Immunology",
          "Cell Biology",
          "Microbiology",
          "Plant Physiology",
          "Life Science",
          "Biotechnology",
          "Animal Physiology",
          "BioInformatics",
          "BioChemistry",
          "Environmental Science",
          "Anatomy",
          "Ophthalmology",
          "Obstetrics Gynecology Nursing",
          "Psychiatric Nursing",
          "Pediatric Nursing",
          "Pharmacology",
          "Pathology",
          "Physiotherapy",
          "Biomedical informatics",
          "Biosciences",
          "Dermatology",
          "Epidemiology",
          "Neurology",
          "Gynecology",
          "Otorhinolaryngology",
          "Pathalogy",
          "Radiology",
          "Urology",
          "Agriculture",
          "Marine Science",
          "Pharmaceutics",
          "Aerobiology",
          "Biomedical Engineering",
          "Homeopathy",
          "Medical Morphology",
          "Histopathology",
          "Histology",
          "Virology",
          "Paleontology",
          "Osteology",
          "Neuroscience",
        ],
      },
    ],
  },
  {
    name: "Maths",
    subcategories: [
      {
        name: "School Level Math",
        subjects: [
          "Maths for Class III",
          "Maths for Class IV",
          "Maths for Class V",
          "Maths for Class VI",
          "Maths for Class VII",
          "Maths for Class VIII",
          "Maths for Class IX",
          "Maths for Class X",
          "Maths for Class XI",
          "Maths for Class XII",
          "Maths for IITJEE",
          "Maths for Olympiad (IMO)",
          "Maths",
          "IGCSE Maths",
          "Vedic Maths",
          "Abacus",
          "Geometry",
          "IB PYP Maths",
          "IBDP Mathematical Studies",
          "IBDP Mathematics SL",
          "IBDP Mathematics HL",
          "IB MYP Mathematics",
          "Elementary Maths",
          "Algebra",
          "PreCalculus",
          "GED Maths",
          "Basic Maths",
          "High School Math",
          "Further Mathematics",
          "Mathematical Literacy",
          "Additional Maths",
        ],
      },
      {
        name: "College Level Math",
        subjects: [
          "Maths for College",
          "Maths for Actuarial Science",
          "Business Maths",
          "Logical Reasoning",
          "Engineering Maths",
          "Mathematical Physics",
          "Data Interpretation",
          "Network Theory",
          "Polytechnic Maths",
          "Linear Algebra",
          "Calculus",
          "Applied Maths",
          "Integration & Differentiation",
          "Operational Research",
          "Differential Equations",
          "Real Analysis",
          "Numerical Method",
          "Probability",
          "Abstract Algebra",
          "Vector Spaces",
          "Financial Mathematics",
          "Topology",
          "Linear Mathematics",
          "Research Methodology",
          "Discrete Mathematics",
          "Linear Programming",
          "Quantitative Techniques",
          "Quantitative Methods",
          "Mathematical Methods in Economics",
          "Graph Theory",
          "Number Theory",
          "Coding Theory",
          "Ring Theory",
          "Group Theory",
          "Approximation Theory",
        ],
      },
      {
        name: "Competitive Math",
        subjects: [
          "ACT Maths",
          "Quantitative Aptitude Maths",
          "Maths for CAT",
          "Maths for BBA Entrance Exam",
          "NTSE Maths",
          "SSC Maths",
          "Maths for Engineering Entrance",
          "ASSET Maths",
          "Aryabhatta",
          "SAT Maths",
          "CA CPT Maths",
          "CSAT Maths",
          "DSSSB Maths",
          "Mental Maths",
        ],
      },
    ],
  },
  {
    name: "Social Studies",
    subcategories: [
      {
        name: "Social Science",
        subjects: [
          "Social Studies for Class VI",
          "Social Studies for Class VII",
          "Social Studies for Class VIII",
          "Social Studies for Class IX",
          "Social Studies for Class X",
          "IB MYP Individuals And Societies",
          "Social Science",
        ],
      },
    ],
  },
  {
    name: "Social Science & Humanities",
    subcategories: [
      {
        name: "History",
        subjects: [
          "History for Class XI - XII",
          "World History",
          "Indian History",
          "European History",
          "History for College",
          "History for Competitive Exams",
          "American History",
          "Ancient History",
          "African History",
        ],
      },
      {
        name: "Geography",
        subjects: [
          "Geography for Class XI - XII",
          "Geography for College",
          "Topography",
          "Cartography",
          "Map Design",
          "Geographic Information System GIS",
          "Geoinformatics",
          "Earth Science",
          "Geology",
          "Oceanography",
          "Meteorology",
        ],
      },
      {
        name: "Political Science",
        subjects: [
          "Political Science for Class XI",
          "Political Science for Class XII",
          "Political Science for Class XI - XII",
          "Political Science for College",
          "International Relations",
          "Politics",
        ],
      },
      {
        name: "Sociology",
        subjects: [
          "Sociology for Class XI",
          "Sociology for Class XII",
          "Sociology",
          "Sociology for College",
          "African Studies",
        ],
      },
      {
        name: "Home Science",
        subjects: [
          "Home Science for Class XI",
          "Home Science for Class XII",
          "Home Science",
          "Home Science for College",
        ],
      },
      {
        name: "Philosophy",
        subjects: [
          "Philosophy for Class XI",
          "Philosophy for Class XII",
          "Philosophy for class XI or XII",
          "Philosophy for Graduation",
          "Philosophical Logic",
          "Theory of Knowledge (ToK)",
          "Aesthetics",
          "Epistemology",
        ],
      },
      {
        name: "Psychology",
        subjects: [
          "Psychology for Class XI",
          "Psychology for Class XII",
          "Psychology for School Level",
          "Psychology",
          "Psychology for College",
          "Clinical Psychology",
          "Psychometric Testing",
          "Statiscal Method in Psychology",
          "Biopsychology",
          "Counselling Psychology",
        ],
      },
      {
        name: "Other Subjects",
        subjects: [
          "Environmental Studies",
          "Environmental Studies(EVS)",
          "Mass Communication for Class XI or XII",
          "Civics",
          "Mass Communication for Graduation",
          "Anthropology",
          "Education",
          "Human Rights",
          "Public Administration",
          "Environmental Management",
          "Indian Heritage",
          "Indian Culture",
          "Pedagogy",
          "Archaeology",
          "Gender Studies",
          "Religious Studies",
          "Archeology",
          "Global Studies",
          "International Studies",
          "Urban studies",
          "Global Perspectives",
          "Disaster Management",
          "Social Work",
          "Media Studies",
          "Environmental Systems and Societies",
        ],
      },
    ],
  },
  {
    name: "Languages",
    subcategories: [
      {
        name: "English",
        subjects: [
          "English upto V",
          "English for VI to VIII",
          "English for IX - X",
          "English for XI - XII",
          "Beginner Level English Speaking",
          "Shakespeare English",
          "English for College",
          "English",
          "Cursive Writing",
          "IELTS(International English Language Testing System",
          "TOEFEL(Test Of English as a Foreign Language)",
          "SAT English",
          "English Verbal Ability",
          "English Grammar",
          "English for GMAT",
          "English Language",
          "English Literature",
          "English for ACT",
          "Diction",
          "News Paper Reading",
          "Voice Accent Training (American)",
          "Voice Accent Training (British)",
          "Pearson Test of English PTE",
          "Syntax",
          "Advance Level English Speaking",
          "English (ESL)",
          "Julius Caesar - William Shakespeare",
          "UPSC CSAT English",
          "English Reading",
          "OET Occupational English Test",
          "IB MYP Language And Literature",
          "Literary Theory",
          "Linguistic",
          "LNAT English",
          "CELPIP",
          "International English Olympiad (IEO)",
          "GRE Analytical Writing Assessment (AWA)",
          "ASSET English",
          "Linguistic Morphology",
        ],
      },
      {
        name: "Hindi & Sanskrit",
        subjects: [
          "Hindi for Class upto V",
          "Hindi for Class VI to VIII",
          "Hindi for Class IX or X",
          "Hindi for Class XI or XII",
          "Hindi Speaking",
          "Hindi for College",
          "Hindi",
          "Hindi for UPSC exams",
          "Sanskrit",
          "Hindi Reading",
          "Hindi as a Foreign Language",
        ],
      },
      {
        name: "International",
        subjects: [
          "Arabic Language",
          "Italian Language",
          "Portuguese Language",
          "Greek Language",
          "Chinese Language (Mandarin)",
          "French Language",
          "German Language",
          "Russian Language",
          "Spanish Language",
          "Korean Language",
          "Japanese Language",
          "Turkish Language",
          "Dari Language",
          "Persian Language",
          "Belarusian Language",
          "Thai Language",
          "Sign Language",
          "Kashmiri Language",
          "Nepali Language",
          "Maldivian or Dhivehi Language",
          "Assamese Language",
          "Awadhi Language",
          "Polish Language",
          "Dutch Language",
          "Finnish Language",
          "Pashto Language",
          "Hebrew Language",
          "Tibetan Language",
          "Bulgarian Language",
          "Serbian Language",
          "Sinhala Language",
          "Latin",
          "Castellano (Castilian)",
          "Malay Language",
          "Swahili Language",
          "Vietnamese Language",
          "Deutsch Language",
          "Indonesian Language",
          "Hungarian Language",
          "Ukrainian Language",
          "Swedish Language",
          "Kazakh Language",
          "Afrikaans Language",
          "Czech Language",
          "Estonian Language",
          "Uzbek Language",
          "Lithuanian Language",
        ],
      },
      {
        name: "Indian Regional",
        subjects: [
          "Punjabi Language",
          "Bengali Language",
          "Telugu Language",
          "Tamil Langauge",
          "Urdu Language",
          "Malayalam Language",
          "Kannada Language",
          "Gujarati Language",
          "Marathi Language",
          "Odia language",
        ],
      },
      {
        name: "Writing",
        subjects: [
          "Creative writing",
          "Handwriting",
          "Calligraphy",
          "Shorthand",
          "Essay Writing",
          "Stenography",
          "Braille",
          "Dissertation Writing (Thesis)",
        ],
      },
    ],
  },
  {
    name: "Engineering",
    subcategories: [
      {
        name: "Mechanical",
        subjects: [
          "Mechanics",
          "Quantum Mechanics",
          "Electromagnetic Theory",
          "Draftsman",
          "Automotive",
          "Fluid Mechanics",
          "Solid mechanics",
          "AutoCad",
          "Engineering Drawing",
          "Dynamics of Machine",
          "Theory Of Machines",
          "Refrigeration and Air-Conditioning",
          "Heat & Mass Transfer",
          "Industrial Engineering",
          "Automobile Engineering",
          "Quality Assurance & Process Planning",
          "Power Plant Engineering",
          "Vibrations",
          "Production Engineering",
          "Materials Science",
          "Solidworks",
          "Mechanical Design",
          "Mechanical Engineering",
        ],
      },
      {
        name: "Civil",
        subjects: [
          "SOM-Strength of Material",
          "Production",
          "Structural Analysis",
          "Theory of Structure",
          "Design of Steel Structure",
          "Design Of Concrete Structure RCC",
          "Surveying",
          "Estimation and Costing",
          "Advanced Structural Design",
          "Building Design and Drawing",
          "Highway",
          "Structural Engineering",
          "STRAND7",
          "Civil Engineering",
          "Highway Engineering",
        ],
      },
      {
        name: "Electronics/Electrical/Communication",
        subjects: [
          "Circuits",
          "Electronics",
          "Electronic Devices",
          "Analog Electronics",
          "Digital Electronics",
          "Signals and Systems",
          "Circuit Analysis",
          "Analog and Digital Communication",
          "Instrumentation (Electronic Measurements)",
          "Power System",
          "Control System",
          "VLSI-Very Large Scale Integrated System Design",
          "HVDC-High-voltage direct current",
          "Robotics",
          "Remote Sensing",
          "Electrical Machines",
          "Waves and Oscillation",
          "Digital Signal Processing",
          "Digital Signal Analysis",
          "Electrical Technology",
          "Wireless Comminication",
          "VHDL - Very Hard Description Language",
          "STLD - Switching Theory and Logic Design",
          "Electrical Engineering",
          "Embedded System",
          "Multisim",
          "Radio Frequency Engineering",
          "Power Electronics",
          "Renewable Energy",
          "Solar Energy",
          "Wind Energy",
          "Digital System",
        ],
      },
      {
        name: "Other Branches",
        subjects: [
          "Nanotechnology",
          "Energy System Engineering",
          "Mechatronics",
          "Aircraft Maintenance",
          "Textile Engineering",
          "transmission",
          "Acoustical Engineering",
          "Aeronautics",
          "Aerospace Engineering",
          "Surface engineering",
          "Reliability Engineering",
        ],
      },
      {
        name: "Architecture",
        subjects: [
          "Interior Designing",
          "Architectural Design",
          "Theory of Design",
          "Building Construction",
          "Advanced Building Technology",
          "Building Science & Services",
          "Climatology",
          "Building Economics",
          "Urban Planning",
          "Vastu Shastra",
        ],
      },
    ],
  },
  {
    name: "Computer & IT",
    subcategories: [
      {
        name: "Programming",
        subjects: [
          "Informatics Practices IP",
          "Parallel Computing",
          "Microprocessor",
          "Artificial Intelligence AI",
          "Software Engineering",
          "Java",
          "Advance Java",
          "C++",
          "MySQL",
          "asp.Net",
          "ado.Net",
          "CSS",
          "Oracle",
          "Fortran",
          "PHP",
          "Html",
          "Data Structure",
          "DBMS",
          "Android Developing",
          "Computer Coding",
          "App Development",
          "Information Technology(IT)",
          "Data Mining",
          "OOP-Object Oriented Programming",
          "Ecommerce",
          "Automata theory and Compiler Design",
          "Visual Basics",
          "Algorithm Design",
          "System Management",
          "Graphical User Interface",
          "Ruby On Rail",
          "Neural Networks",
          "Scratch",
          "Computer",
          "JavaScript",
          "Theory Of Computation",
          "Swift Programming Language",
          "C Programming Language",
          "Python Programming",
          "QBasic",
          "Computer Science",
          "jQuery",
          "Design and Analysis of Algorithms",
          "CakePHP",
          "Computational Logic",
          "Automation",
          "Data Science",
          "Computational Science",
          "Computer Architecture",
          "Real-Time Operating System RTOS",
          "Microcontrollers",
          "Debugging",
          "Controller Area Network (CAN bus)",
          "Dynamic Programming",
          "Machine Learning",
          "R Programming",
          "PySpark",
          "Software Design Pattern",
          "ABAP",
          "Open Graphics Library (OpenGL)",
          "Kotlin",
          "C# (C-Sharp)",
          "TCL programming",
          "Bash Shell Scripting",
          "Xamarin",
          "Internet of Things (IoT)",
          "DevOps",
          "Perl",
          "MongoDB",
          "BlueJ",
          "Computer Programming",
          "PL/SQL",
          "Natural language processing (NLP) AI",
        ],
      },
      {
        name: "Application Softwares",
        subjects: [
          "Computer Basic",
          "Multimedia & Web Technology",
          "Internet",
          "Ubuntu",
          "Linux",
          "Tally",
          "Operating System",
          "MS Office",
          "Mac",
          "Unix",
          "Flash",
          "Page Maker",
          "Wordpress",
          "Digital Marketing",
          "MS Power Point",
          "Apache Hadoop",
          "SAP ERP Software",
          "BUSY - Business Accounting Software",
          "Hindi Typing",
          "MS Paint",
          "MATLAB",
          "Microsoft Azure",
          "Microsoft Dynamics 365 Finance",
          "AWS",
          "Jira Service Management",
          "Salesforce",
          "Design and Technology",
          "AngularJS",
          "Apache Kafka",
          "Drupal",
          "Spring",
          "Information and Communication Technology (ICT)",
          "Image Processing",
          "Anaconda",
          "Continuous Integration & Delivery (CICD)",
          "Microsoft MS Access",
          "Digital Media & Design",
          "Kubernetes",
          "Docker",
          "Jenkins",
          "Git",
          "Terraform",
          "Ansible",
        ],
      },
      {
        name: "Designing & Animation",
        subjects: [
          "Computer Graphics",
          "Coral Draw",
          "Animation",
          "Photoshop",
          "Web Designing",
          "Graphic Designing",
          "Google Sketchup",
          "Word Art",
          "2D Max",
          "Tux Paint",
          "Autodesk 3ds Max",
          "Lookbook",
          "Pictography",
          "Adobe Illustrator",
          "Rhinoceros 3D",
          "3D Modeling",
          "Figma",
          "Ray Tracing",
          "Vector Art",
          "Blender",
          "InDesign",
          "Adobe XD",
        ],
      },
      {
        name: "Networks & Security",
        subjects: [
          "Computer Networks",
          "CCNA(Cisco Certified Network Associate)",
          "Networking",
          "Internet Security or Hacking",
          "Cyber Security",
        ],
      },
    ],
  },
  {
    name: "Commerce",
    subcategories: [
      {
        name: "Economics",
        subjects: [
          "Economics for Class XI",
          "Economics for Class XII",
          "Economics",
          "Economics for IX - X",
          "Economics for XI",
          "Economics for XII",
          "Economics for College",
          "Economics for Post Graduation",
          "Economics for B.Com(P)",
          "Economics for B.Com(H)",
          "Economics for BA(Economics Honors)",
          "Construction Economics",
          "Economics for MA(Economics)",
          "Macroeconomics",
          "Globalization",
          "Business Economics",
          "Managerial Economics",
          "Econometrics (Ecotrix)",
          "Microeconomics",
          "IB Economics SL",
          "IB Economics HL",
          "Agricultural Economics",
          "Behavioral Economics",
          "Political Economy",
          "Engineering Economics",
          "Land Economics",
        ],
      },
      {
        name: "Business Studies",
        subjects: [
          "Business Studies for Class XI",
          "Business Studies for Class XII",
          "Business Studies",
          "Business Administration",
          "Management Studies",
          "Commerce",
        ],
      },
      {
        name: "Finance & Accounting",
        subjects: [
          "Corporate Finance",
          "Managerial Accounting",
          "Accounting Financial Reporting and Analysis",
          "International Finance",
          "Financial Management",
          "Cost Accounting",
          "Balance Sheet",
          "Security Analysis",
          "Forensic Accounting",
          "Financial Reporting",
          "Portfolio Management",
          "Fund Accounting",
          "Stock Market",
          "Transactions",
          "Production or Operation Management",
          "Tax Accounting",
          "Valuation of Shares",
          "Principles of Banking",
          "Investment Banking",
          "Time value of money",
          "Principles of Finance",
          "CA(Chartered Accountants)",
          "ICWAI(Institute of Cost and Works Accountants of India)",
          "Chartered Institute of Management Accountants (CIMA)",
          "CPCCPT(Common Proficiency Test)",
          "IPCC(Integrated Professional Competence Course Examination)",
          "CS(Company Secretary)",
          "Equity Investment",
          "CFA(Chartered Financial Analyst)",
          "Finance",
          "Corporate Accounts",
          "Financial Accounting",
          "Forex Management",
          "Investment",
          "Management Accounting",
          "Auditing",
          "Company Accounts",
          "Strategic Financial Management SFM",
          "Marketing Management",
          "Principles of Insurance",
          "Finance For XI or XII",
          "Research Methodology",
          "Technical Analysis of Stocks",
          "Strategic Business Reporting (SBR)",
          "Association of Chartered Certified Accountants (ACCA)",
          "Risk management",
          "Modeling & Valuation",
          "Business Accounting",
          "Financial Modeling",
          "Real Estate",
        ],
      },
      {
        name: "Accounts",
        subjects: [
          "Accountancy for Class XI",
          "Accountancy for Class XII",
          "Accounts for IX",
          "Accounts for X",
          "Accounts for XI",
          "Accounts for XII",
          "Accounts for graduation",
          "Accounts for B.Com(P)",
          "Accounts for B.Com(H)",
          "Accounts for College",
          "Accountancy",
          "Basic Accounting for Startups",
          "Basic Accounts for SME",
          "IB-Business Management HL",
          "Commerce",
        ],
      },
      {
        name: "Tax",
        subjects: [
          "Taxation",
          "Direct Tax",
          "Indirect Tax",
          "Income Tax",
          "Goods and Service Tax (GST)",
          "International Taxation",
        ],
      },
      {
        name: "Law",
        subjects: [
          "Corporate Law",
          "Business Law",
          "Company Law",
          "Law",
          "Legal Methods",
          "Law Tort",
          "Criminal Law ( CRPC )",
          "Legal Studies",
          "Labour Law",
          "Industrial Law",
          "Constitution",
          "Mercantile Law",
          "Economic Law",
          "Family Law",
        ],
      },
      {
        name: "Business studies",
        subjects: [
          "Business Studies for IX",
          "Business Studies for X",
          "Business Studies for XI",
          "Business Studies for XII",
          "Entrepreneurship",
          "Enterprise",
        ],
      },
      {
        name: "Business & Management",
        subjects: [
          "Business Communication",
          "Business Ethics",
          "Principle of Management",
          "Human Resource",
          "Marketing",
          "Strategic Management",
          "Consumer Behavior",
          "Service Marketing",
          "Organizational Behaviour",
          "Business administration",
          "Development Communication",
          "Industrial Management",
          "Operation Management",
          "Technology Management",
          "International Business",
          "Corporate Training",
          "Development Studies",
          "Sales and Distribution",
          "International Trade",
          "Project Planning or Evaluation",
          "Organizational Structure",
          "Marketing Research",
          "Fundamental of Investments",
          "International Services Management",
          "Change Management",
          "Organizational Development",
          "Financial Marketing",
          "Business Organization",
          "Hotel Management",
          "Business Management",
          "Advertising Management",
          "Supply Chain Management",
          "Brand Management",
          "Decision Science",
          "Decision Theory",
          "Quantitative Techniques of Decision Making",
          "Risk Analysis",
          "Business Analytics",
          "Process Design",
        ],
      },
    ],
  },
  {
    name: "Music & Dance",
    subcategories: [
      {
        name: "Music",
        subjects: ["Opera", "Jazz", "Classical Music", "Carnatic Music", "Blues", "Music"],
      },
      {
        name: "Dance",
        subjects: [
          "Bharatanatyam",
          "Kathak",
          "Mohiniyattam",
          "Bhangra",
          "Dandiya",
          "Ballroom Dance",
          "Belly dance",
          "Salsa",
          "Hip hop dance",
          "Robot dance",
          "FreeStyle Dance",
          "Zumba",
          "Bollywood Dance",
          "Classical Dance",
          "Aerobic Dance",
          "Folk Dance",
        ],
      },
      {
        name: "Singing",
        subjects: ["Singing", "Vocal music", "Sufi"],
      },
      {
        name: "Instruments",
        subjects: [
          "Guitar",
          "Drums",
          "Saxophone",
          "Harmonium",
          "Piano",
          "Veena",
          "Flute",
          "Violin",
          "Tabla",
          "Keyboard",
          "Sitar",
          "Harmonica",
          "Synthesizer",
          "Dhol",
          "Dholak",
          "Vadhyakala",
          "Djembe",
          "Congas and Bongos",
          "Cajon",
        ],
      },
      {
        name: "Theatre & Film",
        subjects: ["Film Production", "Acting", "FIlm & Theater", "Dramatics", "Television Studies", "Film Studies"],
      },
    ],
  },
  {
    name: "Religious Studies",
    subjects: [
      "Ramayan",
      "Ved",
      "Chanakya Niti",
      "Mahabharat",
      "Purana",
      "Upnishad",
      "Geeta",
      "Astrology (Jyotisha)",
      "Kuran (Quran)",
      "Bible",
      "Islamic Studies",
      "Religious Studies",
      "Hinduism",
      "Abrahamic Religions",
      "Agnosticism",
      "Biblical Studies",
    ],
  },
  {
    name: "Visual Arts",
    subjects: [
      "Art or Craft",
      "Drawing",
      "Painting",
      "Sketching",
      "Fashion Designing",
      "Origami",
      "Rangoli",
      "Oil Painting",
      "Glass Painting",
      "Water Color Painting",
      "Quilling",
      "Handbuilding-Clay Art",
      "Pottery",
      "Fine Art",
      "Fashion Studies",
      "Hula Hoop",
      "Commercial Arts",
      "IB MYP Arts",
      "IB MYP Design",
      "Visual Art",
      "Colour Theory",
      "Typography",
      "Book Design",
      "Digital Painting",
      "Coloring (Colouring)",
    ],
  },
  {
    name: "Exams",
    subcategories: [
      {
        name: "Course Exams",
        subjects: ["B.Ed"],
      },
      {
        name: "Entrance Exams",
        subjects: [
          "GMAT(Graduate Management Admission Test)",
          "GRE(Graduate Record Examinations)",
          "SAT(Scholastic Assessment Test)",
          "MBA Entrance",
          "MCA Entrance",
          "NET",
          "National Institute of Design(NID)",
          "CSAT",
          "NIFT",
          "SSAT Secondary School Admission Test (USA)",
          "PSAT/NMSQT",
          "Law School Admission Test (LSAT)",
          "GAMSAT",
          "MCAT",
          "University Clinical Aptitude Test (UCAT)",
          "ISAT",
          "CUET",
        ],
      },
      {
        name: "Job Exams",
        subjects: [
          "Service Selection Boards(SSB)",
          "NDA (National Defence Academy)",
          "Civil Services",
          "SSC",
          "CDS",
          "General Studies (GS)",
        ],
      },
      {
        name: "Other Exams",
        subjects: [
          "Current Affairs",
          "General Knowledge",
          "Bank Exam",
          "CLAT",
          "NTSE",
          "NATA",
          "Olympiad",
          "Project Work",
          "Case Studies",
          "Assignments Help",
          "Exam Help",
        ],
      },
    ],
  },
  {
    name: "Other",
    subjects: [
      "Nanny For Kids",
      "Journalism",
      "Tourism",
      "Cooking (Cookery)",
      "Mental Retardation",
      "Mnemonics",
      "Photography",
      "Groom Training",
      "Bride Training",
      "Babysitter",
      "Wedding Photographer",
      "Personal Stylist",
      "Dyslexia Student",
      "Special Student",
      "Tailoring-Stitching",
      "Speech Therapy",
      "Slow Learner",
      "Car Driving",
      "Neuro Linguistic Programming NLP",
      "Library Science",
      "Internal Assessment IA",
      "Career Counselling",
      "Shadow Tutor",
    ],
  },
  {
    name: "Corporate Training",
    subjects: [
      "Personality Development",
      "Payroll Training",
      "Compensation or Benefits",
      "Linear Pirate Training",
      "Soft Skills",
      "Negotiation",
      "Body Language",
      "Team Building",
      "Leadership",
      "Public Speaking",
      "Written Communication",
      "Interview Technique",
      "Employee Relation",
    ],
  },
  {
    name: "Health & Wellness",
    subjects: [
      "Physical Education",
      "Tycondo/Taekwondo",
      "Gymnasium Trainer",
      "Marshal Art",
      "Yoga",
      "Karate",
      "Fitness Trainer",
      "Naturopathy",
      "Pilates Exercise",
      "Food and Nutrition",
      "Diabetes Educator",
      "Meditation",
      "Reflexology",
      "Food Science Technology",
      "Kinesiology",
      "Reiki",
      "Sports Nutrition",
      "Public Health Nutrition",
      "Nutritional Biochemistry",
      "Therapeutic Nutrition",
      "Youth Mentor",
      "Life Coach",
      "Pranic Healing",
      "Emotional Intelligence",
    ],
  },
  {
    name: "Statistics",
    subjects: [
      "Statistics",
      "Data Entry",
      "MS Excel",
      "Managerial Statistics",
      "Statistical Methods in Economics",
      "Microsoft Power BI",
      "STATA",
      "Tableau",
      "SPSS",
      "Big Data",
      "SAS Statistical Analysis System",
      "Business Statistics",
      "Statistical Modeling",
      "AMPL",
      "CPLEX",
      "Gurobi",
      "Financial Mathematics",
      "Statistics for Actuarial Science",
      "Chemometrics",
      "Data Analytics",
      "Demography",
      "Game Theory",
      "Biostatistics",
      "Alteryx",
    ],
  },
  {
    name: "Games",
    subjects: [
      "Chess",
      "Carrom",
      "Magic",
      "Pep Talk",
      "Storytelling",
      "Rubik's Cube",
      "Cricket Bowling",
      "Cricket Batting",
      "Playing Cards",
      "Skating",
      "Kinovea",
      "Boxing",
    ],
  },
];

/**
 * Top-level canonical category names in official sequence
 */
export const CATEGORY_NAMES: string[] = TRUEMYTUTOR_TREE.map((c) => c.name);

/**
 * Flat list of all unique canonical subjects across all 18 categories
 */
export const ALL_CANONICAL_SUBJECTS: string[] = Array.from(
  new Set(
    TRUEMYTUTOR_TREE.flatMap((node) => {
      const list: string[] = [];
      if (node.subjects) list.push(...node.subjects);
      if (node.subcategories) {
        node.subcategories.forEach((sub) => {
          if (sub.subjects) list.push(...sub.subjects);
        });
      }
      return list;
    })
  )
).sort((a, b) => a.localeCompare(b));

export interface FlattenedTaxonomySubject {
  subject: string;
  category: string;
  subcategory?: string;
  breadcrumb: string;
  searchKey: string;
  grades: number[];
}

/**
 * Pre-indexed taxonomy subjects with breadcrumbs and numeric class aliases for instant search
 */
export const FLATTENED_TAXONOMY_SUBJECTS: FlattenedTaxonomySubject[] = (() => {
  const result: FlattenedTaxonomySubject[] = [];
  TRUEMYTUTOR_TREE.forEach((node) => {
    if (node.subjects) {
      node.subjects.forEach((subj) => {
        const grades = parseGradeNumbers(subj);
        const aliases: string[] = [];
        for (const g of grades) {
          aliases.push(`class ${g}`, `class${g}`, `grade ${g}`, `${g}th`, `std ${g}`, `${g}`);
          const lowerSub = subj.toLowerCase();
          if (lowerSub.includes("math")) {
            aliases.push(`math ${g}`, `maths ${g}`, `mathematics ${g}`, `maths class ${g}`, `math class ${g}`, `class ${g} math`, `class ${g} maths`);
          }
          if (lowerSub.includes("science")) {
            aliases.push(`science ${g}`, `science class ${g}`, `class ${g} science`, `sci ${g}`);
          }
          if (lowerSub.includes("physics")) {
            aliases.push(`physics ${g}`, `physics class ${g}`, `class ${g} physics`, `phy ${g}`);
          }
          if (lowerSub.includes("chemistry")) {
            aliases.push(`chemistry ${g}`, `chemistry class ${g}`, `class ${g} chemistry`, `chem ${g}`);
          }
          if (lowerSub.includes("biology")) {
            aliases.push(`biology ${g}`, `biology class ${g}`, `class ${g} biology`, `bio ${g}`);
          }
          if (lowerSub.includes("social") || lowerSub.includes("history") || lowerSub.includes("geography")) {
            aliases.push(`sst ${g}`, `social studies ${g}`, `social science ${g}`, `class ${g} sst`);
          }
          if (lowerSub.includes("english")) {
            aliases.push(`english ${g}`, `english class ${g}`, `class ${g} english`, `eng ${g}`);
          }
          if (lowerSub.includes("hindi")) {
            aliases.push(`hindi ${g}`, `hindi class ${g}`, `class ${g} hindi`);
          }
          if (lowerSub.includes("all subjects") || lowerSub.includes("combo")) {
            aliases.push(`all subjects ${g}`, `class ${g} all subjects`, `combo ${g}`, `class ${g} combo`);
          }
        }
        const searchKey = `${subj} ${node.name} ${aliases.join(" ")}`.toLowerCase();
        result.push({
          subject: subj,
          category: node.name,
          breadcrumb: node.name,
          searchKey,
          grades,
        });
      });
    }
    if (node.subcategories) {
      node.subcategories.forEach((sub) => {
        if (sub.subjects) {
          sub.subjects.forEach((subj) => {
            const grades = parseGradeNumbers(subj);
            const aliases: string[] = [];
            for (const g of grades) {
              aliases.push(`class ${g}`, `class${g}`, `grade ${g}`, `${g}th`, `std ${g}`, `${g}`);
              const lowerSub = subj.toLowerCase();
              if (lowerSub.includes("math")) {
                aliases.push(`math ${g}`, `maths ${g}`, `mathematics ${g}`, `maths class ${g}`, `math class ${g}`, `class ${g} math`, `class ${g} maths`);
              }
              if (lowerSub.includes("science")) {
                aliases.push(`science ${g}`, `science class ${g}`, `class ${g} science`, `sci ${g}`);
              }
              if (lowerSub.includes("physics")) {
                aliases.push(`physics ${g}`, `physics class ${g}`, `class ${g} physics`, `phy ${g}`);
              }
              if (lowerSub.includes("chemistry")) {
                aliases.push(`chemistry ${g}`, `chemistry class ${g}`, `class ${g} chemistry`, `chem ${g}`);
              }
              if (lowerSub.includes("biology")) {
                aliases.push(`biology ${g}`, `biology class ${g}`, `class ${g} biology`, `bio ${g}`);
              }
              if (lowerSub.includes("social") || lowerSub.includes("history") || lowerSub.includes("geography")) {
                aliases.push(`sst ${g}`, `social studies ${g}`, `social science ${g}`, `class ${g} sst`);
              }
              if (lowerSub.includes("english")) {
                aliases.push(`english ${g}`, `english class ${g}`, `class ${g} english`, `eng ${g}`);
              }
              if (lowerSub.includes("hindi")) {
                aliases.push(`hindi ${g}`, `hindi class ${g}`, `class ${g} hindi`);
              }
              if (lowerSub.includes("all subjects") || lowerSub.includes("combo")) {
                aliases.push(`all subjects ${g}`, `class ${g} all subjects`, `combo ${g}`, `class ${g} combo`);
              }
            }
            const breadcrumb = `${node.name} > ${sub.name}`;
            const searchKey = `${subj} ${breadcrumb} ${aliases.join(" ")}`.toLowerCase();
            result.push({
              subject: subj,
              category: node.name,
              subcategory: sub.name,
              breadcrumb,
              searchKey,
              grades,
            });
          });
        }
      });
    }
  });
  return result;
})();

/**
 * Intelligent multi-token search for taxonomy subjects.
 * Supports queries like 'math 6', 'math 7', 'science 8', 'physics 11', 'class 6'.
 */
export function searchTaxonomySubjects(
  query: string,
  classLevel?: string
): FlattenedTaxonomySubject[] {
  const q = query.trim().toLowerCase();
  const targetGrades = getGradesForClassLevel(classLevel);

  if (!q && targetGrades.length === 0) return [];

  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const matches = FLATTENED_TAXONOMY_SUBJECTS.filter((item) => {
    if (tokens.length > 0) {
      const allTokensMatch = tokens.every((t) => item.searchKey.includes(t));
      if (!allTokensMatch) return false;
    }
    if (targetGrades.length > 0 && !q) {
      if (!item.grades.some((g) => targetGrades.includes(g))) return false;
    }
    return true;
  });

  return matches.sort((a, b) => {
    const aLower = a.subject.toLowerCase();
    const bLower = b.subject.toLowerCase();

    if (q) {
      if (aLower === q) return -1;
      if (bLower === q) return 1;
      if (aLower.startsWith(q) && !bLower.startsWith(q)) return -1;
      if (bLower.startsWith(q) && !aLower.startsWith(q)) return 1;
    }

    if (targetGrades.length > 0) {
      const aHasGrade = a.grades.some((g) => targetGrades.includes(g));
      const bHasGrade = b.grades.some((g) => targetGrades.includes(g));
      if (aHasGrade && !bHasGrade) return -1;
      if (!aHasGrade && bHasGrade) return 1;
    }

    return a.subject.localeCompare(b.subject);
  });
}

/**
 * High-frequency popular subjects for instant quick-add chips
 */
export const POPULAR_TAXONOMY_SUBJECTS: string[] = [
  "All Subjects (Class 1-8)",
  "All Subjects",
  "Mathematics",
  "Science",
  "English",
  "Social Studies (SST)",
  "Physics (Class 11-12)",
  "Chemistry (Class 11-12)",
  "Mathematics (Class 11-12)",
  "Biology (Class 11-12)",
  "Accountancy",
  "Economics (Micro & Macro)",
  "Business Studies",
  "All Subjects For Class X",
  "All Subjects For Class IX",
  "All Subjects for Preparatory",
  "Computer Science / IT",
  "Spoken English",
  "Hindi",
];

/**
 * Legacy compatibility alias for SUBJECT_CATEGORIES
 */
export interface SubjectCategory {
  category: string;
  subjects: string[];
}

export const SUBJECT_CATEGORIES: SubjectCategory[] = TRUEMYTUTOR_TREE.map((node) => {
  const subjects: string[] = [];
  if (node.subjects) subjects.push(...node.subjects);
  if (node.subcategories) {
    node.subcategories.forEach((sub) => {
      if (sub.subjects) subjects.push(...sub.subjects);
    });
  }
  return {
    category: node.name,
    subjects,
  };
});

/**
 * Synonym dictionary for normalizing free-form user/staff inputs
 */
const SYNONYM_MAP: Record<string, string> = {
  math: "Mathematics",
  maths: "Mathematics",
  mathematics: "Mathematics",
  sci: "Science",
  science: "Science",
  eng: "English",
  english: "English",
  sst: "Social Studies",
  "social science": "Social Studies",
  "social studies": "Social Studies",
  accounts: "Accountancy",
  accountancy: "Accountancy",
  eco: "Economics",
  economics: "Economics",
  bst: "Business Studies",
  "business studies": "Business Studies",
  jee: "IIT-JEE",
  iit: "IIT-JEE",
  iitjee: "IIT-JEE",
  neet: "NEET",
  cs: "Computer Science",
  "computer science": "Computer Science",
  python: "Python",
  "spoken english": "Spoken English",
  "all subjects": "All Subjects",
  "all subject": "All Subjects",
  "all subjects class 1-8": "All Subjects (Class 1-8)",
  "all subjects (class 1-8)": "All Subjects (Class 1-8)",
  "all subject class 1-8": "All Subjects (Class 1-8)",
  "all subjects till 8th": "All Subjects (Class 1-8)",
  "all subjects till 8th class": "All Subjects (Class 1-8)",
  "all subject till 8th": "All Subjects (Class 1-8)",
  "all subjects 1-8": "All Subjects (Class 1-8)",
  "all subjects class 1-5": "All Subjects (Class 1-5)",
  "all subjects class 6-8": "All Subjects (Class 6-8)",
};

/**
 * Normalizes any free-form string to the canonical taxonomy subject
 */
export function normalizeTaxonomySubject(input: string): string {
  if (!input) return "";
  const cleaned = input.trim();
  const lower = cleaned.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Direct exact or synonym lookup
  if (SYNONYM_MAP[cleaned.toLowerCase()]) {
    return SYNONYM_MAP[cleaned.toLowerCase()];
  }
  if (SYNONYM_MAP[lower]) {
    return SYNONYM_MAP[lower];
  }

  // Check if it already exactly matches a canonical subject
  const exact = ALL_CANONICAL_SUBJECTS.find(
    (s) => s.toLowerCase() === cleaned.toLowerCase()
  );
  if (exact) return exact;

  // Check if it partially matches
  const partial = ALL_CANONICAL_SUBJECTS.find((s) =>
    s.toLowerCase().includes(cleaned.toLowerCase())
  );
  if (partial) return partial;

  return cleaned;
}

/**
 * Normalize an array of subjects
 */
export function normalizeTaxonomySubjects(inputs: string[]): string[] {
  if (!Array.isArray(inputs)) return [];
  const normalized = inputs
    .map((s) => normalizeTaxonomySubject(s))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

export type TaxonomyNeedItem = {
  label: string;
  subject: string;
  classLevel: string;
  sub?: string;
  badge?: string;
};

export type TaxonomyNeedGroup = {
  groupName: string;
  items: TaxonomyNeedItem[];
};

export type TaxonomyNeedTabId = "popular" | "school" | "senior" | "exams" | "skills";

export type TaxonomyNeedTab = {
  id: TaxonomyNeedTabId;
  label: string;
  icon: string;
  tagline: string;
  groups: TaxonomyNeedGroup[];
};

export const TAXONOMY_NEED_TABS: TaxonomyNeedTab[] = [
  {
    id: "popular",
    label: "Popular Needs",
    icon: "🌟",
    tagline: "Most requested tuition packages by parents and students",
    groups: [
      {
        groupName: "Top Tuition Packages",
        items: [
          {
            label: "Class 1–5 All Subjects",
            subject: "All Subjects For Class V",
            classLevel: "Class 1-5",
            sub: "English, Maths, EVS, Hindi & Phonics",
            badge: "Primary",
          },
          {
            label: "Class 6–8 All Subjects",
            subject: "All Subjects For Class VIII",
            classLevel: "Class 6-8",
            sub: "Maths, Science, English, SST & Hindi",
            badge: "Middle",
          },
          {
            label: "Class 9–10 Science & Maths",
            subject: "Science & Maths",
            classLevel: "Class 9-10",
            sub: "CBSE & ICSE Board Foundation Duo",
            badge: "High School",
          },
          {
            label: "Class 10 All Subjects (Boards)",
            subject: "All Subjects For Class X",
            classLevel: "Class 10",
            sub: "Complete 10th Board Exam Syllabus",
            badge: "Boards",
          },
          {
            label: "Class 11–12 PCM (Science)",
            subject: "Mathematics",
            classLevel: "Class 11-12",
            sub: "Physics, Chemistry & Mathematics",
            badge: "PCM",
          },
          {
            label: "Class 11–12 PCB (Medical)",
            subject: "Biology",
            classLevel: "Class 11-12",
            sub: "Physics, Chemistry & Biology",
            badge: "PCB",
          },
          {
            label: "Class 11–12 Commerce",
            subject: "Accountancy",
            classLevel: "Class 11-12",
            sub: "Accounts, Economics & Business Studies",
            badge: "Commerce",
          },
          {
            label: "NEET Medical Entrance",
            subject: "NEET",
            classLevel: "NEET",
            sub: "Target NEET UG with Expert Faculty",
            badge: "Medical",
          },
          {
            label: "IIT-JEE Engineering",
            subject: "IIT-JEE",
            classLevel: "IIT-JEE",
            sub: "Mains & Advanced Physics, Chem & Maths",
            badge: "Engineering",
          },
          {
            label: "Spoken English & Fluency",
            subject: "Spoken English",
            classLevel: "Beginner / Spoken",
            sub: "Fluency, Accent, Public Speaking & Confidence",
            badge: "Language",
          },
          {
            label: "Coding & Computer Science",
            subject: "Computer Science",
            classLevel: "School / College",
            sub: "Python, Web Development, Java & C++",
            badge: "Tech",
          },
          {
            label: "CUET / University Entrance",
            subject: "CUET",
            classLevel: "College",
            sub: "General Test & Domain Subjects",
            badge: "Entrance",
          },
        ],
      },
    ],
  },
  {
    id: "school",
    label: "School (KG–10)",
    icon: "🎒",
    tagline: "Pre-primary, Primary, Middle School & 10th Board Preparation",
    groups: [
      {
        groupName: "Early Learning (KG & Nursery)",
        items: [
          {
            label: "Nursery & Kindergarten",
            subject: "Nursery",
            classLevel: "Nursery / KG",
            sub: "Early Learning, Playway & Activity",
          },
          {
            label: "Jolly Phonics & Reading",
            subject: "Jolly Phonics",
            classLevel: "Nursery / KG",
            sub: "Phonetics, Vocabulary & Pronunciation",
          },
          {
            label: "Abacus & Mental Maths",
            subject: "Abacus",
            classLevel: "Class 1-5",
            sub: "Speed Arithmetic & Mental Calculation",
            badge: "Popular",
          },
        ],
      },
      {
        groupName: "Primary School (Class 1–5)",
        items: [
          {
            label: "Class 1–5 All Subjects",
            subject: "All Subjects For Class V",
            classLevel: "Class 1-5",
            sub: "Maths, English, EVS, Hindi",
            badge: "Popular",
          },
          {
            label: "Class 1–5 Mathematics",
            subject: "Maths for Class V",
            classLevel: "Class 1-5",
            sub: "Concept building & foundational arithmetic",
          },
          {
            label: "Class 1–5 English & Grammar",
            subject: "English upto V",
            classLevel: "Class 1-5",
            sub: "Grammar, Reading & Creative Writing",
          },
          {
            label: "Class 1–5 Science / EVS",
            subject: "Science upto Class V",
            classLevel: "Class 1-5",
            sub: "Environmental Science & Nature",
          },
          {
            label: "Class 1–5 Hindi & Regional",
            subject: "Hindi for Class upto V",
            classLevel: "Class 1-5",
            sub: "Reading, Writing & Vyakaran",
          },
        ],
      },
      {
        groupName: "Middle School (Class 6–8)",
        items: [
          {
            label: "Class 6–8 All Subjects",
            subject: "All Subjects For Class VIII",
            classLevel: "Class 6-8",
            sub: "All Core School Subjects",
            badge: "Popular",
          },
          {
            label: "Class 6–8 Mathematics",
            subject: "Maths for Class VIII",
            classLevel: "Class 6-8",
            sub: "Algebra, Geometry & Arithmetic",
          },
          {
            label: "Class 6–8 General Science",
            subject: "Science for Class VIII",
            classLevel: "Class 6-8",
            sub: "Physics, Chemistry & Biology Basics",
          },
          {
            label: "Class 6–8 Social Studies (SST)",
            subject: "Social Studies for Class VIII",
            classLevel: "Class 6-8",
            sub: "History, Civics & Geography",
          },
          {
            label: "Class 6–8 English Literature & Grammar",
            subject: "English for VI to VIII",
            classLevel: "Class 6-8",
            sub: "Comprehensive English Language",
          },
          {
            label: "Class 6–8 Sanskrit / Hindi",
            subject: "Sanskrit",
            classLevel: "Class 6-8",
            sub: "Language & Vyakaran",
          },
        ],
      },
      {
        groupName: "Secondary / Board Foundation (Class 9–10)",
        items: [
          {
            label: "Class 9–10 Science & Maths",
            subject: "Science & Maths",
            classLevel: "Class 9-10",
            sub: "Core Board Duo for CBSE & ICSE",
            badge: "High Demand",
          },
          {
            label: "Class 10 All Subjects (Boards)",
            subject: "All Subjects For Class X",
            classLevel: "Class 10",
            sub: "Complete 10th Board Syllabus Coverage",
            badge: "Boards",
          },
          {
            label: "Class 9–10 Mathematics",
            subject: "Maths for Class X",
            classLevel: "Class 9-10",
            sub: "Standard & Basic Mathematics",
          },
          {
            label: "Class 9–10 Science",
            subject: "Science for Class X",
            classLevel: "Class 9-10",
            sub: "Physics, Chemistry & Biology",
          },
          {
            label: "Class 9–10 Social Science (SST)",
            subject: "Social Studies for Class X",
            classLevel: "Class 9-10",
            sub: "History, Pol Sci, Geo & Economics",
          },
          {
            label: "Class 9–10 English",
            subject: "English for IX - X",
            classLevel: "Class 9-10",
            sub: "Language & Literature",
          },
        ],
      },
    ],
  },
  {
    id: "senior",
    label: "Class 11–12",
    icon: "🔬",
    tagline: "Science, Commerce & Humanities Stream Specializations",
    groups: [
      {
        groupName: "Science Stream (PCM & PCB)",
        items: [
          {
            label: "Physics (Class 11–12)",
            subject: "Physics For Class XII",
            classLevel: "Class 11-12",
            sub: "Mechanics, Electrodynamics & Optics",
            badge: "Core",
          },
          {
            label: "Chemistry (Class 11–12)",
            subject: "Chemistry For Class XII",
            classLevel: "Class 11-12",
            sub: "Physical, Organic & Inorganic",
            badge: "Core",
          },
          {
            label: "Mathematics (Class 11–12)",
            subject: "Maths for Class XII",
            classLevel: "Class 11-12",
            sub: "Calculus, Vectors & Probability",
            badge: "Core",
          },
          {
            label: "Biology (Class 11–12)",
            subject: "Biology for Class XII",
            classLevel: "Class 11-12",
            sub: "Genetics, Physiology & Ecology",
            badge: "Core",
          },
          {
            label: "Computer Science / IP",
            subject: "Computer Science",
            classLevel: "Class 11-12",
            sub: "Python, SQL & Informatics Practices",
          },
        ],
      },
      {
        groupName: "Commerce Stream",
        items: [
          {
            label: "Accountancy (Class 11–12)",
            subject: "Accountancy for Class XII",
            classLevel: "Class 11-12",
            sub: "Partnership, Company Accounts & Financials",
            badge: "Core",
          },
          {
            label: "Economics (Micro & Macro)",
            subject: "Economics for Class XII",
            classLevel: "Class 11-12",
            sub: "Microeconomics, Macroeconomics & Indian Eco",
            badge: "Core",
          },
          {
            label: "Business Studies (Class 11–12)",
            subject: "Business Studies for Class XII",
            classLevel: "Class 11-12",
            sub: "Principles of Management & Business Finance",
            badge: "Core",
          },
          {
            label: "Applied Mathematics",
            subject: "Applied Maths",
            classLevel: "Class 11-12",
            sub: "Financial Maths & Statistics for Commerce",
          },
        ],
      },
      {
        groupName: "Humanities & Arts Stream",
        items: [
          {
            label: "Psychology (Class 11–12)",
            subject: "Psychology for Class XII",
            classLevel: "Class 11-12",
            sub: "Cognitive, Clinical & Social Psychology",
            badge: "Popular",
          },
          {
            label: "Political Science (Class 11–12)",
            subject: "Political Science for Class XII",
            classLevel: "Class 11-12",
            sub: "Indian Constitution & World Politics",
          },
          {
            label: "History (Class 11–12)",
            subject: "History for Class XI - XII",
            classLevel: "Class 11-12",
            sub: "Indian History, Themes & World History",
          },
          {
            label: "Sociology (Class 11–12)",
            subject: "Sociology for Class XII",
            classLevel: "Class 11-12",
            sub: "Indian Society & Social Change",
          },
          {
            label: "Geography (Class 11–12)",
            subject: "Geography for Class XI - XII",
            classLevel: "Class 11-12",
            sub: "Physical & Human Geography",
          },
          {
            label: "Legal Studies",
            subject: "Legal Studies",
            classLevel: "Class 11-12",
            sub: "Jurisprudence, Judiciary & Arbitration",
          },
        ],
      },
    ],
  },
  {
    id: "exams",
    label: "Competitive & Exams",
    icon: "🎯",
    tagline: "Medical, Engineering, University & Defence Entrances",
    groups: [
      {
        groupName: "Medical & Engineering Entrances",
        items: [
          {
            label: "NEET Medical Entrance",
            subject: "NEET",
            classLevel: "NEET",
            sub: "NEET-UG Physics, Chemistry & Biology",
            badge: "Top Exam",
          },
          {
            label: "IIT-JEE Engineering Entrance",
            subject: "IIT-JEE",
            classLevel: "IIT-JEE",
            sub: "Mains & Advanced Physics, Chem & Maths",
            badge: "Top Exam",
          },
          {
            label: "BITSAT & State Engineering",
            subject: "Maths for Engineering Entrance",
            classLevel: "IIT-JEE",
            sub: "Engineering Aptitude & Physics/Maths",
          },
        ],
      },
      {
        groupName: "University & Career Entrances",
        items: [
          {
            label: "CUET (Undergraduate Entrance)",
            subject: "CUET",
            classLevel: "College",
            sub: "General Test, English & Domain Subjects",
            badge: "Top Exam",
          },
          {
            label: "CLAT / Law Entrance",
            subject: "CLAT",
            classLevel: "College",
            sub: "Legal Reasoning, English & GK",
          },
          {
            label: "NDA / CDS Defence Entrance",
            subject: "NDA (National Defence Academy)",
            classLevel: "Competitive",
            sub: "Maths & General Ability Test (GAT)",
          },
          {
            label: "CA Foundation / CPT",
            subject: "CA CPT Maths",
            classLevel: "College",
            sub: "Accounting, Law, Maths & Economics",
          },
        ],
      },
      {
        groupName: "Olympiads & International",
        items: [
          {
            label: "Maths Olympiad (IMO)",
            subject: "Maths for Olympiad (IMO)",
            classLevel: "Class 6-8",
            sub: "Mathematical Reasoning & Problem Solving",
          },
          {
            label: "Science Olympiad (NSO)",
            subject: "Olympiad",
            classLevel: "Class 6-8",
            sub: "National Science Olympiad Foundation",
          },
          {
            label: "SAT / ACT (Study Abroad)",
            subject: "SAT(Scholastic Assessment Test)",
            classLevel: "College",
            sub: "SAT Maths, Reading & Writing",
          },
        ],
      },
    ],
  },
  {
    id: "skills",
    label: "Languages & Skills",
    icon: "🗣️",
    tagline: "Spoken Languages, Coding, Music & Extracurricular Coaching",
    groups: [
      {
        groupName: "Languages & Communication",
        items: [
          {
            label: "Spoken English & Fluency",
            subject: "Spoken English",
            classLevel: "Beginner / Spoken",
            sub: "Confidence, Accent & Fluency",
            badge: "High Demand",
          },
          {
            label: "French Language (DELF / School)",
            subject: "French Language",
            classLevel: "Beginner / Spoken",
            sub: "School Curriculum & DELF Certification",
          },
          {
            label: "German Language (Goethe / School)",
            subject: "German Language",
            classLevel: "Beginner / Spoken",
            sub: "A1 to B2 Levels & School Support",
          },
          {
            label: "Spanish Language",
            subject: "Spanish Language",
            classLevel: "Beginner / Spoken",
            sub: "Conversational & DELE Preparation",
          },
          {
            label: "Hindi Language & Vyakaran",
            subject: "Hindi Speaking",
            classLevel: "Beginner / Spoken",
            sub: "Reading, Writing & Speaking Fluency",
          },
          {
            label: "Sanskrit",
            subject: "Sanskrit",
            classLevel: "School / College",
            sub: "Grammar, Slokas & Board Syllabus",
          },
        ],
      },
      {
        groupName: "Coding & Computer Tech",
        items: [
          {
            label: "Python Programming for Beginners",
            subject: "Python Programming",
            classLevel: "School / College",
            sub: "Coding logic, problem solving & projects",
            badge: "Popular",
          },
          {
            label: "Web Development (HTML, CSS, JS)",
            subject: "Web Designing",
            classLevel: "School / College",
            sub: "Build websites & frontend apps",
          },
          {
            label: "Java & C++ Programming",
            subject: "Java",
            classLevel: "School / College",
            sub: "Object-oriented programming & algorithms",
          },
          {
            label: "Artificial Intelligence & Data Science",
            subject: "Artificial Intelligence AI",
            classLevel: "School / College",
            sub: "AI basics, machine learning & data analysis",
          },
        ],
      },
      {
        groupName: "Creative Arts & Wellness",
        items: [
          {
            label: "Music (Guitar, Keyboard, Vocal)",
            subject: "Guitar",
            classLevel: "All Ages",
            sub: "Instruments, Singing & Music Theory",
          },
          {
            label: "Art, Drawing & Painting",
            subject: "Drawing",
            classLevel: "All Ages",
            sub: "Sketching, Watercolor & Oil Painting",
          },
          {
            label: "Chess Coaching",
            subject: "Chess",
            classLevel: "All Ages",
            sub: "Openings, strategy, tactics & endgame",
          },
          {
            label: "Yoga & Fitness",
            subject: "Yoga",
            classLevel: "All Ages",
            sub: "Health, breathing, posture & wellness",
          },
        ],
      },
    ],
  },
];

// ─── UNIFIED TAXONOMY SEARCH & CLASS RESOLVER ENGINE ─────────────────────────

export interface ParsedTaxonomyItem {
  subject: string;
  domain: string;
  grades: number[]; // 0 = Nursery/KG, 1..12, 13 = Entrance/College
  category: string;
}

export function parseGradeNumbers(text: string): number[] {
  const grades = new Set<number>();
  const lower = text.toLowerCase();

  if (/preparatory|kg|kindergarten|nursery|lkg|ukg/i.test(lower)) {
    grades.add(0);
  }
  if (/upto\s+(?:class\s+)?v\b|nursery\s+to\s+fifth/i.test(lower)) {
    [0, 1, 2, 3, 4, 5].forEach((g) => grades.add(g));
  }
  if (/vi\s+to\s+viii\b|6\s*[-–to\s]+\s*8/i.test(lower)) {
    [6, 7, 8].forEach((g) => grades.add(g));
  }
  if (/ix\s*(?:or|to|-|–|\s)\s*x\b|9\s*[-–to\s]+\s*10/i.test(lower)) {
    [9, 10].forEach((g) => grades.add(g));
  }
  if (/xi\s*(?:-|–|to|and|\s)\s*xii\b|11\s*[-–to\s]+\s*12/i.test(lower)) {
    [11, 12].forEach((g) => grades.add(g));
  }
  if (/kg\s+to\s+10th|class\s+1\s+to\s+10/i.test(lower)) {
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((g) => grades.add(g));
  }
  if (/iitjee|iit-jee|neet|entrance/i.test(lower)) {
    [11, 12, 13].forEach((g) => grades.add(g));
  }

  // Roman numeral single class checks
  if (/\bClass\s+XII\b/i.test(text) || /\bfor\s+XII\b/i.test(text)) grades.add(12);
  else if (/\bClass\s+XI\b/i.test(text) || /\bfor\s+XI\b/i.test(text)) grades.add(11);
  else if (/\bClass\s+X\b/i.test(text) || /\bfor\s+X\b/i.test(text)) grades.add(10);
  else if (/\bClass\s+IX\b/i.test(text) || /\bfor\s+IX\b/i.test(text)) grades.add(9);
  else if (/\bClass\s+VIII\b/i.test(text) || /\bfor\s+VIII\b/i.test(text)) grades.add(8);
  else if (/\bClass\s+VII\b/i.test(text) || /\bfor\s+VII\b/i.test(text)) grades.add(7);
  else if (/\bClass\s+VI\b/i.test(text) || /\bfor\s+VI\b/i.test(text)) grades.add(6);
  else if (/\bClass\s+V\b/i.test(text) || /\bfor\s+V\b/i.test(text)) grades.add(5);
  else if (/\bClass\s+IV\b/i.test(text) || /\bfor\s+IV\b/i.test(text)) grades.add(4);
  else if (/\bClass\s+III\b/i.test(text) || /\bfor\s+III\b/i.test(text)) grades.add(3);
  else if (/\bClass\s+II\b/i.test(text) || /\bfor\s+II\b/i.test(text)) grades.add(2);
  else if (/\bClass\s+I\b/i.test(text) || /\bfor\s+I\b/i.test(text)) grades.add(1);

  // Arabic single class check
  const numMatch = text.match(/\b(?:Class|Grade|Std)\s*(\d{1,2})\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 12) grades.add(num);
  }

  return Array.from(grades);
}

function detectSubjectDomain(name: string, category: string): string {
  const t = `${name} ${category}`.toLowerCase();
  if (/science\s*&\s*maths|all subjects|combo subjects/i.test(t)) return "combo";
  if (/physics/i.test(t)) return "physics";
  if (/chemistry/i.test(t)) return "chemistry";
  if (/biology|botany|zoology/i.test(t)) return "biology";
  if (/science/i.test(t)) return "science";
  if (/math|mathematics|algebra|calculus|geometry|trigonometry|vedic maths/i.test(t)) return "maths";
  if (/english|ielts|toefl|grammar/i.test(t)) return "english";
  if (/hindi/i.test(t)) return "hindi";
  if (/sanskrit/i.test(t)) return "sanskrit";
  if (/account|commerce|business studies|economics/i.test(t)) return "commerce";
  if (/history|geography|civics|political|social studies|sst/i.test(t)) return "social_studies";
  if (/computer|python|java|coding|c\+\+|programming/i.test(t)) return "coding";
  if (/french|german|spanish|japanese|foreign/i.test(t)) return "foreign_language";
  return "general";
}

/**
 * Pre-compiled index of all canonical taxonomy subjects with their domain and grade mapping
 */
export const PARSED_TAXONOMY_INDEX: ParsedTaxonomyItem[] = FLATTENED_TAXONOMY_SUBJECTS.map((item) => ({
  subject: item.subject,
  domain: detectSubjectDomain(item.subject, item.category),
  grades: parseGradeNumbers(item.subject),
  category: item.category,
}));

/**
 * Parses user class string into numeric target grade array
 * e.g. "Class 9-10" -> [9, 10], "Class 11-12" -> [11, 12], "Class 1-5" -> [1, 2, 3, 4, 5]
 */
export function getGradesForClassLevel(cls?: string): number[] {
  if (!cls) return [];
  const c = cls.toLowerCase().trim();

  if (/11\s*[-–to\s]+\s*12|senior/i.test(c)) return [11, 12];
  if (/9\s*[-–to\s]+\s*10|secondary/i.test(c)) return [9, 10];
  if (/6\s*[-–to\s]+\s*8|middle/i.test(c)) return [6, 7, 8];
  if (/1\s*[-–to\s]+\s*5|primary/i.test(c)) return [1, 2, 3, 4, 5];
  if (/nursery|kg|kindergarten/i.test(c)) return [0];
  if (/neet|iit|jee|competitive/i.test(c)) return [11, 12, 13];

  const single = c.match(/\b(\d{1,2})\b/);
  if (single) {
    const n = parseInt(single[1], 10);
    if (n >= 1 && n <= 12) return [n];
  }

  return [];
}

/**
 * Resolves all matching canonical database subject strings for any search query & class level
 * directly from the Centralized Taxonomy.
 */
export function getTaxonomySubjectsForSearch(searchSubject?: string, searchClassLevel?: string): string[] {
  const subQuery = (searchSubject || "").trim().toLowerCase();
  const targetGrades = getGradesForClassLevel(searchClassLevel);

  // If both empty, return empty
  if (!subQuery && targetGrades.length === 0) return [];

  // Determine query domains
  const targetDomains = new Set<string>();
  if (subQuery) {
    if (/science\s*&\s*maths|science\s+and\s+maths|maths\s*&\s*science/i.test(subQuery)) {
      targetDomains.add("combo");
      targetDomains.add("science");
      targetDomains.add("maths");
    } else if (/math|mathematics/i.test(subQuery)) {
      targetDomains.add("maths");
    } else if (/physics/i.test(subQuery)) {
      targetDomains.add("physics");
      targetDomains.add("science");
    } else if (/chemistry/i.test(subQuery)) {
      targetDomains.add("chemistry");
      targetDomains.add("science");
    } else if (/biology/i.test(subQuery)) {
      targetDomains.add("biology");
      targetDomains.add("science");
    } else if (/science/i.test(subQuery)) {
      targetDomains.add("science");
      targetDomains.add("physics");
      targetDomains.add("chemistry");
      targetDomains.add("biology");
      targetDomains.add("combo");
    } else if (/all subjects|combo/i.test(subQuery)) {
      targetDomains.add("all_subjects");
      targetDomains.add("combo");
    } else if (/english/i.test(subQuery)) {
      targetDomains.add("english");
    } else if (/hindi/i.test(subQuery)) {
      targetDomains.add("hindi");
    } else if (/commerce|account|economic|business/i.test(subQuery)) {
      targetDomains.add("commerce");
    } else if (/social|history|geography|civics|sst/i.test(subQuery)) {
      targetDomains.add("social_studies");
    } else if (/computer|coding|python|java/i.test(subQuery)) {
      targetDomains.add("coding");
    } else {
      targetDomains.add("general");
    }
  }

  const matches = new Set<string>();

  for (const item of PARSED_TAXONOMY_INDEX) {
    const itemSubLower = item.subject.toLowerCase();

    // 1. Domain match
    const matchesDomain =
      targetDomains.size === 0 ||
      targetDomains.has(item.domain) ||
      (subQuery && itemSubLower.includes(subQuery));

    if (!matchesDomain) continue;

    // 2. Grade match
    if (targetGrades.length > 0) {
      if (item.grades.length > 0) {
        // Must intersect with target grades
        const hasOverlap = item.grades.some((g) => targetGrades.includes(g));
        if (!hasOverlap) continue;
      } else {
        // Broad subject without explicit grade tags
        if (subQuery && !itemSubLower.includes(subQuery) && !subQuery.includes(itemSubLower)) {
          continue;
        }
        if (/preparatory|kindergarten|kg|nursery|phonics|abacus/i.test(itemSubLower)) {
          continue;
        }
      }
    }

    matches.add(item.subject);
  }

  // Always include the exact search string
  if (searchSubject?.trim()) {
    matches.add(searchSubject.trim());
  }

  return Array.from(matches);
}

/**
 * Intelligently formats the tutor's class levels and selects their most relevant subjects
 * to present on tutor cards for any given search. Replaces raw "General" and irrelevant primary grades!
 */
export function inferTutorClassesAndSubjects(
  tutorSubjects: string[],
  tutorClassLevels: string[],
  searchSubject?: string,
  searchClassLevel?: string
): { displayClasses: string; displaySubjects: string } {
  const subjects = tutorSubjects || [];
  const rawClasses = (tutorClassLevels || []).filter((c) => c && c !== "General");

  // Collect all grade numbers tutor teaches from their subjects
  const allTutorGrades = new Set<number>();
  subjects.forEach((s) => {
    parseGradeNumbers(s).forEach((g) => allTutorGrades.add(g));
  });

  // Infer readable class ranges
  let inferredClassText = "Class 1-12";
  if (rawClasses.length > 0) {
    inferredClassText = rawClasses.slice(0, 2).join(", ");
  } else if (allTutorGrades.size > 0) {
    const gradesSorted = Array.from(allTutorGrades).sort((a, b) => a - b);
    const minG = gradesSorted[0];
    const maxG = gradesSorted[gradesSorted.length - 1];

    if (minG >= 11 && maxG <= 12) inferredClassText = "Class 11-12";
    else if (minG >= 9 && maxG <= 10) inferredClassText = "Class 9-10";
    else if (minG >= 6 && maxG <= 8) inferredClassText = "Class 6-8";
    else if (minG >= 1 && maxG <= 5) inferredClassText = "Class 1-5";
    else if (maxG >= 11) inferredClassText = `Class ${minG === 0 ? "KG" : minG} to 12th`;
    else if (maxG >= 9) inferredClassText = `Class ${minG === 0 ? "KG" : minG} to 10th`;
    else inferredClassText = `Class ${minG === 0 ? "KG" : minG} to ${maxG}`;
  } else {
    inferredClassText = "Class 1-12";
  }

  // Filter and prioritize subjects matching the user's search
  const targetGrades = getGradesForClassLevel(searchClassLevel);
  const subQuery = (searchSubject || "").trim().toLowerCase();

  const matchingSubs: string[] = [];
  const otherSubs: string[] = [];

  for (const s of subjects) {
    const sLower = s.toLowerCase();
    const itemGrades = parseGradeNumbers(s);

    let isGradeMatch = true;
    if (targetGrades.length > 0 && itemGrades.length > 0) {
      isGradeMatch = itemGrades.some((g) => targetGrades.includes(g));
    }

    let isSubjectMatch = true;
    if (subQuery) {
      isSubjectMatch =
        sLower.includes(subQuery) ||
        (subQuery.includes("math") && sLower.includes("math")) ||
        (subQuery.includes("science") && sLower.includes("science")) ||
        sLower.includes("all subjects") ||
        sLower.includes("combo");
    }

    if (isGradeMatch && isSubjectMatch) {
      matchingSubs.push(s);
    } else {
      otherSubs.push(s);
    }
  }

  const chosenSubs = (matchingSubs.length > 0 ? matchingSubs : otherSubs).slice(0, 3);
  const displaySubjects = chosenSubs.length > 0 ? chosenSubs.join(", ") : "Core Subjects";

  // Normalize searchClassLevel cleanly (e.g. "Class 11 12" or "Class 11-12" -> "Class 11-12")
  let normalizedSearchClass = "";
  if (searchClassLevel) {
    const c = searchClassLevel.trim();
    if (/11\s*[-–to\s]+\s*12/i.test(c)) normalizedSearchClass = "Class 11-12";
    else if (/9\s*[-–to\s]+\s*10/i.test(c)) normalizedSearchClass = "Class 9-10";
    else if (/6\s*[-–to\s]+\s*8/i.test(c)) normalizedSearchClass = "Class 6-8";
    else if (/1\s*[-–to\s]+\s*5/i.test(c)) normalizedSearchClass = "Class 1-5";
    else normalizedSearchClass = c;
  }

  // If user searched for a class level and tutor qualifies, align displayClasses
  const displayClasses =
    normalizedSearchClass && (rawClasses.includes(normalizedSearchClass) || rawClasses.includes(searchClassLevel!) || targetGrades.some((g) => allTutorGrades.has(g)))
      ? normalizedSearchClass
      : inferredClassText;

  return { displayClasses, displaySubjects };
}
