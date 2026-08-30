import os
import zipfile
import xml.etree.ElementTree as ET
import csv
import re
import json

def clean_phone(val):
    if not val:
        return None
    s = str(val).strip()
    digits = re.sub(r'\D', '', s)
    if len(digits) == 10 and digits[0] in '6789':
        return digits
    elif len(digits) == 11 and digits.startswith('0') and digits[1] in '6789':
        return digits[1:]
    elif len(digits) == 12 and digits.startswith('91') and digits[2] in '6789':
        return digits[2:]
    elif len(digits) > 10:
        last10 = digits[-10:]
        if last10[0] in '6789':
            return last10
    elif len(digits) == 10:
        return digits
    return None

def clean_text(val):
    if val is None:
        return ""
    s = str(val).replace('\r', ' ').replace('\n', ' ').replace('\t', ' ').strip()
    s = re.sub(r'\s+', ' ', s)
    if s.lower() in ['-', '--', 'n/a', 'na', 'none', 'null', '\\', 'nil', '?']:
        return ""
    return s

def clean_gender(val):
    if not val: return None
    s = str(val).strip().lower()
    if s.startswith('m') or s == '1': return "Male"
    if s.startswith('f') or s == '2': return "Female"
    return None

def clean_experience(val):
    if not val: return None
    digits = re.sub(r'\D', '', str(val))
    if digits:
        n = int(digits)
        if 0 <= n <= 50:
            return n
    return None

def get_xlsx_rows(path):
    with zipfile.ZipFile(path) as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t_elems = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                shared_strings.append(''.join(t.text for t in t_elems if t.text))

        sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
        sheet_files.sort(key=lambda x: int(''.join(filter(str.isdigit, x)) or 0))
        
        all_sheets = {}
        for idx, sfile in enumerate(sheet_files):
            stree = ET.fromstring(z.read(sfile))
            rows = []
            for row_elem in stree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                row_vals = []
                for c in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    t_attr = c.attrib.get('t')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_elem.text if v_elem is not None else ''
                    if t_attr == 's' and val.isdigit():
                        val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                    elif t_attr == 'inlineStr':
                        is_elem = c.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        val = is_elem.text if is_elem is not None else ''
                    row_vals.append(str(val).strip())
                if any(row_vals):
                    rows.append(row_vals)
            all_sheets[f"sheet_{idx+1}"] = rows
        return all_sheets

def get_csv_rows(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        return [r for r in reader if any(r)]

def get_docx_texts(path):
    with zipfile.ZipFile(path) as z:
        xml_content = z.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        texts = []
        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            p_text = ''.join(t.text for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text)
            if p_text.strip():
                texts.append(clean_text(p_text))
        return texts

data_dir = "datauploadrawdata"
consolidated_leads = {}

def add_lead(phone, data):
    if not phone:
        return
    
    if phone in consolidated_leads:
        existing = consolidated_leads[phone]
        for k, v in data.items():
            if v and (not existing.get(k) or existing.get(k) == "" or existing.get(k) == []):
                existing[k] = v
        if data.get("sourceFile") and data["sourceFile"] not in existing.get("sourceFile", ""):
            existing["sourceFile"] += f", {data['sourceFile']}"
    else:
        consolidated_leads[phone] = data

# 1. TUTOR DATA NCR.xlsx
tutor_ncr_sheets = get_xlsx_rows(f"{data_dir}/TUTOR DATA NCR.xlsx")
for r in tutor_ncr_sheets['sheet_1'][1:]:
    fullname = clean_text(r[0] if len(r)>0 else "")
    phone = clean_phone(r[1] if len(r)>1 else "")
    alt_phone = clean_phone(r[2] if len(r)>2 else "")
    corr_addr = clean_text(r[3] if len(r)>3 else "")
    city = clean_text(r[4] if len(r)>4 else "")
    pref_loc = clean_text(r[5] if len(r)>5 else "")
    gender = clean_gender(r[6] if len(r)>6 else "")
    exp = clean_experience(r[7] if len(r)>7 else "")
    from_class = clean_text(r[9] if len(r)>9 else "")
    to_class = clean_text(r[10] if len(r)>10 else "")
    subjects = clean_text(r[11] if len(r)>11 else "")
    qual = clean_text(r[12] if len(r)>12 else "")
    area = clean_text(r[13] if len(r)>13 else "")
    perm_addr = clean_text(r[14] if len(r)>14 else "")
    
    loc = ", ".join(filter(None, [area, city or "Delhi NCR"]))
    full_addr = perm_addr or corr_addr or pref_loc or loc
    classes_list = [f"{from_class} to {to_class}"] if from_class and to_class else ([from_class] if from_class else [])
    subj_list = [s.strip() for s in re.split(r'[,;/|\n&]+', subjects) if s.strip()]

    if phone:
        add_lead(phone, {
            "leadType": "TUTOR",
            "name": fullname,
            "phone": phone,
            "altPhone": alt_phone if alt_phone != phone else None,
            "email": None,
            "location": loc or area or city or "Delhi NCR",
            "pincode": None,
            "fullAddress": full_addr,
            "subjects": subj_list,
            "classes": classes_list,
            "qualification": qual,
            "experienceYears": exp,
            "gender": gender,
            "sourceFile": "TUTOR DATA NCR.xlsx",
            "sourceCategory": "Master NCR Tutors",
            "notes": f"Pref: {pref_loc}" if pref_loc else None
        })

# 2. rohit data (1).xlsx
rohit_sheets = get_xlsx_rows(f"{data_dir}/rohit data (1).xlsx")
for r in rohit_sheets['sheet_1'][1:]:
    status = clean_text(r[0] if len(r)>0 else "")
    name = clean_text(r[1] if len(r)>1 else "")
    wa = clean_text(r[2] if len(r)>2 else "")
    phone = clean_phone(r[3] if len(r)>3 else "")
    loc = clean_text(r[7] if len(r)>7 else "")
    gender = clean_gender(r[8] if len(r)>8 else "")
    exp = clean_experience(r[9] if len(r)>9 else "")
    from_c = clean_text(r[10] if len(r)>10 else "")
    to_c = clean_text(r[11] if len(r)>11 else "")
    sub1 = clean_text(r[13] if len(r)>13 else "")
    sub2 = clean_text(r[14] if len(r)>14 else "")
    qual = clean_text(r[15] if len(r)>15 else "")
    area = clean_text(r[16] if len(r)>16 else "")
    rating = clean_text(r[17] if len(r)>17 else "")
    remark = clean_text(r[18] if len(r)>18 else "")

    combined_loc = ", ".join(filter(None, [loc, area]))
    classes_list = [f"{from_c} to {to_c}"] if from_c and to_c else ([from_c] if from_c else [])
    all_subs = ", ".join(filter(None, [sub1, sub2]))
    subj_list = [s.strip() for s in re.split(r'[,;/|\n&]+', all_subs) if s.strip()]

    notes_parts = []
    if status: notes_parts.append(f"Status: {status}")
    if remark: notes_parts.append(f"Remark: {remark}")
    if rating: notes_parts.append(f"Rating: {rating}")
    if wa: notes_parts.append(f"WA: {wa}")

    if phone:
        add_lead(phone, {
            "leadType": "TUTOR",
            "name": name,
            "phone": phone,
            "altPhone": None,
            "email": None,
            "location": combined_loc or "Delhi NCR",
            "pincode": None,
            "fullAddress": combined_loc,
            "subjects": subj_list,
            "classes": classes_list,
            "qualification": qual,
            "experienceYears": exp,
            "gender": gender,
            "sourceFile": "rohit data (1).xlsx",
            "sourceCategory": "Tutors & Paid Leads",
            "notes": "; ".join(notes_parts) if notes_parts else None
        })

# 3. export 2.xlsx & export.csv
for fname in ["export 2.xlsx", "export.csv"]:
    if fname.endswith(".xlsx"):
        exp_rows = get_xlsx_rows(f"{data_dir}/{fname}")['sheet_1'][1:]
    else:
        exp_rows = get_csv_rows(f"{data_dir}/{fname}")[1:]
    
    for r in exp_rows:
        name = clean_text(r[1] if len(r)>1 else "")
        phone = clean_phone(r[2] if len(r)>2 else "") or clean_phone(r[1] if len(r)>1 else "")
        email = clean_text(r[3] if len(r)>3 else "")
        addr = clean_text(r[4] if len(r)>4 else "")
        qual = clean_text(r[5] if len(r)>5 else "")
        about = clean_text(r[6] if len(r)>6 else "")
        
        if phone:
            add_lead(phone, {
                "leadType": "TUTOR",
                "name": name,
                "phone": phone,
                "altPhone": None,
                "email": email if "@" in email else None,
                "location": addr,
                "pincode": None,
                "fullAddress": addr,
                "subjects": [],
                "classes": [],
                "qualification": qual,
                "experienceYears": None,
                "gender": None,
                "sourceFile": fname,
                "sourceCategory": "Web Tutor Registrations",
                "notes": f"About: {about}" if about else None
            })

# 4. shl final.xlsx
shl_sheets = get_xlsx_rows(f"{data_dir}/shl final.xlsx")
for r in shl_sheets['sheet_1']:
    phone = clean_phone(r[0] if len(r)>0 else "")
    tag = clean_text(r[1] if len(r)>1 else "")
    class_val = clean_text(r[2] if len(r)>2 else "")
    name_or_sub = clean_text(r[3] if len(r)>3 else "")
    area = clean_text(r[4] if len(r)>4 else "")
    gender_pref = clean_gender(r[5] if len(r)>5 else "")
    extra_addr = clean_text(r[6] if len(r)>6 else "")

    if phone:
        loc = ", ".join(filter(None, [area, extra_addr]))
        classes_list = [class_val] if class_val else []
        is_subject = any(c in name_or_sub.lower() for c in ['math', 'sci', 'eng', 'all', 'hindi', 'phy', 'chem', 'bio'])
        
        add_lead(phone, {
            "leadType": "PARENT_LEAD",
            "name": name_or_sub if not is_subject else None,
            "phone": phone,
            "altPhone": None,
            "email": None,
            "location": loc or "Delhi NCR",
            "pincode": None,
            "fullAddress": loc,
            "subjects": [name_or_sub] if is_subject else [],
            "classes": classes_list,
            "qualification": None,
            "experienceYears": None,
            "gender": gender_pref,
            "sourceFile": "shl final.xlsx (Sheet 1)",
            "sourceCategory": "Parent Tuition Inquiries",
            "notes": f"Parent Inquiry - Class: {class_val}, Req: {name_or_sub}"
        })

for sname, srows in shl_sheets.items():
    if sname == 'sheet_1': continue
    for r in srows:
        for cell in r:
            phone = clean_phone(cell)
            if phone and phone not in consolidated_leads:
                add_lead(phone, {
                    "leadType": "TELECALLING",
                    "name": None,
                    "phone": phone,
                    "altPhone": None,
                    "email": None,
                    "location": "Delhi NCR",
                    "pincode": None,
                    "fullAddress": None,
                    "subjects": [],
                    "classes": [],
                    "qualification": None,
                    "experienceYears": None,
                    "gender": None,
                    "sourceFile": f"shl final.xlsx ({sname})",
                    "sourceCategory": "SMS / Campaign Lead",
                    "notes": "Marketing campaign phone contact"
                })

# 5. Calling Data.xlsx
calling_sheets = get_xlsx_rows(f"{data_dir}/Calling Data.xlsx")
for r in calling_sheets['sheet_1'][1:]:
    p_parent = clean_phone(r[0] if len(r)>0 else "")
    p_teacher = clean_phone(r[1] if len(r)>1 else "")
    p_unk = clean_phone(r[2] if len(r)>2 else "")

    if p_parent and p_parent not in consolidated_leads:
        add_lead(p_parent, {
            "leadType": "PARENT_LEAD",
            "name": None,
            "phone": p_parent,
            "altPhone": None,
            "email": None,
            "location": "Delhi NCR",
            "pincode": None,
            "fullAddress": None,
            "subjects": [],
            "classes": [],
            "qualification": None,
            "experienceYears": None,
            "gender": None,
            "sourceFile": "Calling Data.xlsx",
            "sourceCategory": "Calling Data (Parent)",
            "notes": "Outbound telecalling parent queue"
        })

    if p_teacher and p_teacher not in consolidated_leads:
        add_lead(p_teacher, {
            "leadType": "TUTOR",
            "name": None,
            "phone": p_teacher,
            "altPhone": None,
            "email": None,
            "location": "Delhi NCR",
            "pincode": None,
            "fullAddress": None,
            "subjects": [],
            "classes": [],
            "qualification": None,
            "experienceYears": None,
            "gender": None,
            "sourceFile": "Calling Data.xlsx",
            "sourceCategory": "Calling Data (Teacher)",
            "notes": "Outbound telecalling teacher queue"
        })

    if p_unk and p_unk not in consolidated_leads:
        add_lead(p_unk, {
            "leadType": "TELECALLING",
            "name": None,
            "phone": p_unk,
            "altPhone": None,
            "email": None,
            "location": "Delhi NCR",
            "pincode": None,
            "fullAddress": None,
            "subjects": [],
            "classes": [],
            "qualification": None,
            "experienceYears": None,
            "gender": None,
            "sourceFile": "Calling Data.xlsx",
            "sourceCategory": "Calling Data (General)",
            "notes": "Telecalling general queue"
        })

for r in calling_sheets.get('sheet_2', []):
    for cell in r:
        phone = clean_phone(cell)
        if phone and phone not in consolidated_leads:
            add_lead(phone, {
                "leadType": "TELECALLING",
                "name": None,
                "phone": phone,
                "altPhone": None,
                "email": None,
                "location": "Delhi NCR",
                "pincode": None,
                "fullAddress": None,
                "subjects": [],
                "classes": [],
                "qualification": None,
                "experienceYears": None,
                "gender": None,
                "sourceFile": "Calling Data.xlsx (sejal)",
                "sourceCategory": "Calling Data (Sejal)",
                "notes": "Calling data dump"
            })

# 6. syntax_123.xlsx
syntax_sheets = get_xlsx_rows(f"{data_dir}/syntax_123.xlsx")
for r in syntax_sheets['sheet_1'][1:]:
    inst_name = clean_text(r[0] if len(r)>0 else "")
    phone = clean_phone(r[1] if len(r)>1 else "")
    loc = clean_text(r[2] if len(r)>2 else "")
    if phone:
        add_lead(phone, {
            "leadType": "INSTITUTE",
            "name": inst_name or "Coaching Center",
            "phone": phone,
            "altPhone": None,
            "email": None,
            "location": loc,
            "pincode": None,
            "fullAddress": loc,
            "subjects": [],
            "classes": [],
            "qualification": "Coaching Institute",
            "experienceYears": None,
            "gender": None,
            "sourceFile": "syntax_123.xlsx",
            "sourceCategory": "Coaching Institutes & Tutorials",
            "notes": f"Institute: {inst_name} at {loc}"
        })

# 7. lib data.xlsx
lib_sheets = get_xlsx_rows(f"{data_dir}/lib data.xlsx")
for srows in lib_sheets.values():
    for r in srows:
        name = clean_text(r[0] if len(r)>0 else "")
        phone = clean_phone(r[1] if len(r)>1 else "") or clean_phone(r[0] if len(r)>0 else "")
        shift = clean_text(r[3] if len(r)>3 else "")
        receipt = clean_text(r[4] if len(r)>4 else "")
        fees = clean_text(r[5] if len(r)>5 else "")

        if phone:
            notes_p = []
            if shift: notes_p.append(f"Shift: {shift}")
            if receipt: notes_p.append(f"Receipt: {receipt}")
            if fees: notes_p.append(f"Fees: ₹{fees}")
            
            add_lead(phone, {
                "leadType": "PARENT_LEAD",
                "name": name if name != phone else None,
                "phone": phone,
                "altPhone": None,
                "email": None,
                "location": "Library / Study Hall",
                "pincode": None,
                "fullAddress": None,
                "subjects": [],
                "classes": [],
                "qualification": None,
                "experienceYears": None,
                "gender": None,
                "sourceFile": "lib data.xlsx",
                "sourceCategory": "Library & Study Hall Records",
                "notes": "; ".join(notes_p) if notes_p else None
            })

# 8. FEMALE_TEACHER_SPEC.docx
female_doc = get_docx_texts(f"{data_dir}/FEMALE_TEACHER_SPEC.docx")
for idx, text in enumerate(female_doc):
    phone = clean_phone(text)
    if phone:
        name = female_doc[idx-1] if idx > 0 and not clean_phone(female_doc[idx-1]) else None
        subj = female_doc[idx+1] if idx < len(female_doc)-1 and not clean_phone(female_doc[idx+1]) else None
        add_lead(phone, {
            "leadType": "TUTOR",
            "name": name,
            "phone": phone,
            "altPhone": None,
            "email": None,
            "location": "Delhi NCR / Mumbai",
            "pincode": None,
            "fullAddress": None,
            "subjects": [subj] if subj else [],
            "classes": [],
            "qualification": None,
            "experienceYears": None,
            "gender": "Female",
            "sourceFile": "FEMALE_TEACHER_SPEC.docx",
            "sourceCategory": "Female Teacher Spec",
            "notes": f"Teacher Subject: {subj}" if subj else None
        })

all_leads_list = list(consolidated_leads.values())

csv_headers = [
    "leadType", "name", "phone", "altPhone", "email", "location", 
    "pincode", "fullAddress", "subjects", "classes", "qualification", 
    "experienceYears", "gender", "sourceFile", "sourceCategory", "notes"
]

csv_file_path = f"{data_dir}/MASTER_CONSOLIDATED_ALL_LEADS.csv"
with open(csv_file_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=csv_headers)
    writer.writeheader()
    for lead in all_leads_list:
        row = dict(lead)
        row["subjects"] = ", ".join(lead["subjects"]) if lead["subjects"] else ""
        row["classes"] = ", ".join(lead["classes"]) if lead["classes"] else ""
        # Clean any remaining newlines
        for k in row:
            if isinstance(row[k], str):
                row[k] = row[k].replace('\r', ' ').replace('\n', ' ').strip()
        writer.writerow(row)

json_file_path = f"{data_dir}/MASTER_CONSOLIDATED_ALL_LEADS.json"
with open(json_file_path, "w", encoding="utf-8") as f:
    json.dump(all_leads_list, f, indent=2, ensure_ascii=False)

print("Regenerated cleanly formatted CSV and JSON!")
