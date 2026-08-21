"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  formData: { subjects: string[]; classLevels: string[]; teachingMode: string; teachingRadius: number };
  onNext: (data: { subjects: string[]; classLevels: string[]; teachingMode: string; teachingRadius: number }) => void;
  onBack: () => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

export type CategoryNode = {
  name: string;
  subcategories?: { name: string; subjects: string[] }[];
  subjects?: string[];
};

export const TRUEMYTUTOR_TREE: CategoryNode[] = [
  {
    name: "Combo Subjects KG to 10th",
    subjects: [
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

export function Step3Subjects({ formData, onNext, onBack, isLoading, isAdminMode = false }: Props) {
  const [subjects, setSubjects] = useState<string[]>(formData.subjects || []);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleSubject(s: string) {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setErrors({});
  }

  function toggleSelectAll(subSubjects: string[]) {
    const allSelected = subSubjects.every((s) => subjects.includes(s));
    if (allSelected) {
      setSubjects((prev) => prev.filter((s) => !subSubjects.includes(s)));
    } else {
      const combined = new Set([...subjects, ...subSubjects]);
      setSubjects(Array.from(combined));
    }
    setErrors({});
  }

  function toggleNode(nodeKey: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  }

  function handleSubmit() {
    if (!isAdminMode && subjects.length === 0) {
      setErrors({ subjects: "Please select at least one subject." });
      return;
    }
    onNext({
      subjects,
      classLevels: ["General"],
      teachingMode: formData.teachingMode || "EITHER",
      teachingRadius: formData.teachingRadius || 10,
    });
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto py-2">
      {/* Page Title verbatim from TryMyTutor screenshot */}
      <h2 className="text-xl font-400 text-[#222222] text-center tracking-tight font-serif">
        Mark Your Skills & Subjects;
      </h2>

      {errors.subjects && (
        <p className="text-xs text-red-600 font-600 text-center">{errors.subjects}</p>
      )}

      {/* Accordion Tree View verbatim from TryMyTutor screenshot */}
      <div className="space-y-3.5 pl-4 py-2">
        {TRUEMYTUTOR_TREE.map((parent) => {
          const isParentExpanded = expandedNodes.has(parent.name);

          return (
            <div key={parent.name} className="space-y-2">
              {/* Top-Level Category Header */}
              <div
                onClick={() => toggleNode(parent.name)}
                className="flex items-center gap-1.5 text-xs font-800 text-gray-900 cursor-pointer hover:text-[#00a8ff] transition-colors select-none"
              >
                <span className="font-extrabold text-sm text-gray-900 w-4 text-left">
                  {isParentExpanded ? "-" : "+"}
                </span>
                <span>{parent.name}</span>
              </div>

              {/* Expanded Top-Level Content */}
              {isParentExpanded && (
                <div className="pl-5 space-y-3">
                  {/* If node has direct subjects */}
                  {parent.subjects && (
                    <>
                      <label className="flex items-center gap-2 text-[11px] font-600 text-[#00a8ff] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={
                            parent.subjects.length > 0 &&
                            parent.subjects.every((s) => subjects.includes(s))
                          }
                          onChange={() => toggleSelectAll(parent.subjects!)}
                          className="w-3.5 h-3.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 cursor-pointer accent-[#7dd3fc]"
                        />
                        <span>Select all</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2.5">
                        {parent.subjects.map((s) => {
                          const isChecked = subjects.includes(s);
                          return (
                            <label
                              key={s}
                              className="flex items-start gap-2 text-[11px] font-500 text-gray-700 cursor-pointer hover:text-[#00a8ff] select-none leading-tight"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSubject(s)}
                                className="w-3.5 h-3.5 mt-0.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 shrink-0 cursor-pointer accent-[#7dd3fc]"
                              />
                              <span>{s}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* If node has nested subcategories */}
                  {parent.subcategories && (
                    <div className="space-y-3.5">
                      {parent.subcategories.map((sub) => {
                        const subKey = `${parent.name} > ${sub.name}`;
                        const isSubExpanded = expandedNodes.has(subKey);

                        return (
                          <div key={subKey} className="space-y-2">
                            <div
                              onClick={() => toggleNode(subKey)}
                              className="flex items-center gap-1.5 text-xs font-700 text-gray-800 cursor-pointer hover:text-[#00a8ff] select-none"
                            >
                              <span className="font-extrabold text-sm text-gray-800 w-4 text-left">
                                {isSubExpanded ? "-" : "+"}
                              </span>
                              <span>{sub.name}</span>
                            </div>

                            {isSubExpanded && (
                              <div className="pl-5 space-y-3">
                                <label className="flex items-center gap-2 text-[11px] font-600 text-[#00a8ff] cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={
                                      sub.subjects.length > 0 &&
                                      sub.subjects.every((s) => subjects.includes(s))
                                    }
                                    onChange={() => toggleSelectAll(sub.subjects)}
                                    className="w-3.5 h-3.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 cursor-pointer accent-[#7dd3fc]"
                                  />
                                  <span>Select all</span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2.5">
                                  {sub.subjects.map((s) => {
                                    const isChecked = subjects.includes(s);
                                    return (
                                      <label
                                        key={s}
                                        className="flex items-start gap-2 text-[11px] font-500 text-gray-700 cursor-pointer hover:text-[#00a8ff] select-none leading-tight"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleSubject(s)}
                                          className="w-3.5 h-3.5 mt-0.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 shrink-0 cursor-pointer accent-[#7dd3fc]"
                                        />
                                        <span>{s}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Instruction verbatim from TryMyTutor screenshot */}
      <p className="text-[11px] font-400 text-gray-500 text-center pt-2">
        Click on the subject category to see subjects. Click on checkbox to select the subjects you teach.
      </p>

      {/* Bottom Floating Navigation Buttons matching TryMyTutor screenshot */}
      <div className="flex justify-between items-center pt-6 max-w-lg mx-auto">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-full bg-[#5b9bd5] hover:bg-[#4a89c4] text-white font-700 text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-8 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-700 text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Next &rarr;
            </>
          )}
        </button>
      </div>
    </div>
  );
}
