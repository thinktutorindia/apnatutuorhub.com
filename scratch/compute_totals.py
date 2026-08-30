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
    if len(digits) == 10:
        return digits
    elif len(digits) == 11 and digits.startswith('0'):
        return digits[1:]
    elif len(digits) == 12 and digits.startswith('91'):
        return digits[2:]
    elif len(digits) > 10:
        # Check if last 10 digits look like valid Indian mobile starting with 6,7,8,9
        last10 = digits[-10:]
        if last10[0] in '6789':
            return last10
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
                texts.append(p_text.strip())
        return texts

data_dir = "datauploadrawdata"
files = sorted(os.listdir(data_dir))

file_stats = {}
global_all_phones = set()
global_tutor_phones = set()
global_parent_phones = set()
global_telecalling_phones = set()
global_institute_phones = set()
global_library_phones = set()

# 1. TUTOR DATA NCR
tutor_ncr = get_xlsx_rows(f"{data_dir}/TUTOR DATA NCR.xlsx")['sheet_1']
tutor_ncr_phones = set()
for r in tutor_ncr[1:]:
    p = clean_phone(r[1] if len(r)>1 else None)
    if p: tutor_ncr_phones.add(p)
file_stats["TUTOR DATA NCR.xlsx"] = {
    "category": "Tutor Database (NCR Master)",
    "raw_rows": len(tutor_ncr),
    "data_rows": len(tutor_ncr) - 1,
    "unique_phones": len(tutor_ncr_phones)
}
global_tutor_phones.update(tutor_ncr_phones)
global_all_phones.update(tutor_ncr_phones)

# 2. prerna.xlsx
prerna = get_xlsx_rows(f"{data_dir}/prerna.xlsx")['sheet_1']
prerna_phones = set()
for r in prerna[1:]:
    p = clean_phone(r[1] if len(r)>1 else None)
    if p: prerna_phones.add(p)
file_stats["prerna.xlsx"] = {
    "category": "Tutor Database (Duplicate of NCR)",
    "raw_rows": len(prerna),
    "data_rows": len(prerna) - 1,
    "unique_phones": len(prerna_phones),
    "new_unique_to_global": len(prerna_phones - global_all_phones)
}
global_tutor_phones.update(prerna_phones)
global_all_phones.update(prerna_phones)

# 3. rohit data (1).xlsx
rohit = get_xlsx_rows(f"{data_dir}/rohit data (1).xlsx")['sheet_1']
rohit_phones = set()
for r in rohit[1:]:
    p = clean_phone(r[3] if len(r)>3 else None)
    if p: rohit_phones.add(p)
file_stats["rohit data (1).xlsx"] = {
    "category": "Tutor & Paid Leads",
    "raw_rows": len(rohit),
    "data_rows": len(rohit) - 1,
    "unique_phones": len(rohit_phones),
    "new_unique_to_global": len(rohit_phones - global_all_phones)
}
global_tutor_phones.update(rohit_phones)
global_all_phones.update(rohit_phones)

# 4. FEMALE_TEACHER_SPEC.docx
female_doc = get_docx_texts(f"{data_dir}/FEMALE_TEACHER_SPEC.docx")
female_phones = set()
for t in female_doc:
    p = clean_phone(t)
    if p: female_phones.add(p)
file_stats["FEMALE_TEACHER_SPEC.docx"] = {
    "category": "Female Teacher Spec",
    "raw_rows": len(female_doc),
    "unique_phones": len(female_phones),
    "new_unique_to_global": len(female_phones - global_all_phones)
}
global_tutor_phones.update(female_phones)
global_all_phones.update(female_phones)

# 5. export 2.xlsx
exp2 = get_xlsx_rows(f"{data_dir}/export 2.xlsx")['sheet_1']
exp2_phones = set()
for r in exp2[1:]:
    p = clean_phone(r[2] if len(r)>2 else None) or clean_phone(r[1] if len(r)>1 else None)
    if p: exp2_phones.add(p)
file_stats["export 2.xlsx"] = {
    "category": "Web Tutor Registrations",
    "raw_rows": len(exp2),
    "data_rows": len(exp2) - 1,
    "unique_phones": len(exp2_phones),
    "new_unique_to_global": len(exp2_phones - global_all_phones)
}
global_tutor_phones.update(exp2_phones)
global_all_phones.update(exp2_phones)

# 6. export.csv
exp_csv = get_csv_rows(f"{data_dir}/export.csv")
exp_csv_phones = set()
for r in exp_csv[1:]:
    p = clean_phone(r[2] if len(r)>2 else None) or clean_phone(r[1] if len(r)>1 else None)
    if p: exp_csv_phones.add(p)
file_stats["export.csv"] = {
    "category": "Web Tutor Registrations (CSV)",
    "raw_rows": len(exp_csv),
    "data_rows": len(exp_csv) - 1,
    "unique_phones": len(exp_csv_phones),
    "new_unique_to_global": len(exp_csv_phones - global_all_phones)
}
global_tutor_phones.update(exp_csv_phones)
global_all_phones.update(exp_csv_phones)

# 7. shl final.xlsx (all 10 sheets)
shl_final_sheets = get_xlsx_rows(f"{data_dir}/shl final.xlsx")
shl_final_total_rows = sum(len(s) for s in shl_final_sheets.values())
shl_final_parent_phones = set()
# Sheet 1: Parent Inquiries
for r in shl_final_sheets['sheet_1']:
    p = clean_phone(r[0] if len(r)>0 else None)
    if p: shl_final_parent_phones.add(p)
# Other sheets in shl final
shl_final_other_phones = set()
for sname, srows in shl_final_sheets.items():
    if sname == 'sheet_1': continue
    for r in srows:
        for cell in r:
            p = clean_phone(cell)
            if p: shl_final_other_phones.add(p)

file_stats["shl final.xlsx"] = {
    "category": "Parent Inquiries & Campaign Numbers",
    "raw_rows": shl_final_total_rows,
    "unique_parent_inquiry_phones": len(shl_final_parent_phones),
    "unique_campaign_phones": len(shl_final_other_phones),
    "total_unique_phones_in_file": len(shl_final_parent_phones.union(shl_final_other_phones)),
    "new_unique_to_global": len((shl_final_parent_phones.union(shl_final_other_phones)) - global_all_phones)
}
global_parent_phones.update(shl_final_parent_phones)
global_telecalling_phones.update(shl_final_other_phones)
global_all_phones.update(shl_final_parent_phones)
global_all_phones.update(shl_final_other_phones)

# 8. shl.xlsx
shl_sheets = get_xlsx_rows(f"{data_dir}/shl.xlsx")
shl_total_rows = sum(len(s) for s in shl_sheets.values())
shl_phones = set()
for srows in shl_sheets.values():
    for r in srows:
        for cell in r:
            p = clean_phone(cell)
            if p: shl_phones.add(p)
file_stats["shl.xlsx"] = {
    "category": "Parent Leads / Campaign (Subset of shl final)",
    "raw_rows": shl_total_rows,
    "unique_phones": len(shl_phones),
    "new_unique_to_global": len(shl_phones - global_all_phones)
}
global_parent_phones.update(shl_phones)
global_all_phones.update(shl_phones)

# 9. Copy of shl 19april.xlsx
shl19_sheets = get_xlsx_rows(f"{data_dir}/Copy of shl 19april.xlsx")
shl19_total_rows = sum(len(s) for s in shl19_sheets.values())
shl19_phones = set()
for srows in shl19_sheets.values():
    for r in srows:
        for cell in r:
            p = clean_phone(cell)
            if p: shl19_phones.add(p)
file_stats["Copy of shl 19april.xlsx"] = {
    "category": "Parent Leads Snapshot (Subset of shl final)",
    "raw_rows": shl19_total_rows,
    "unique_phones": len(shl19_phones),
    "new_unique_to_global": len(shl19_phones - global_all_phones)
}
global_parent_phones.update(shl19_phones)
global_all_phones.update(shl19_phones)

# 10. Calling Data.xlsx
call_sheets = get_xlsx_rows(f"{data_dir}/Calling Data.xlsx")
call_total_rows = sum(len(s) for s in call_sheets.values())
calling_parents = set()
calling_teachers = set()
calling_other = set()

for r in call_sheets['sheet_1'][1:]:
    p1 = clean_phone(r[0] if len(r)>0 else None)
    p2 = clean_phone(r[1] if len(r)>1 else None)
    p3 = clean_phone(r[2] if len(r)>2 else None)
    if p1: calling_parents.add(p1)
    if p2: calling_teachers.add(p2)
    if p3: calling_other.add(p3)

for r in call_sheets.get('sheet_2', []):
    for cell in r:
        p = clean_phone(cell)
        if p: calling_other.add(p)

file_stats["Calling Data.xlsx"] = {
    "category": "Telecalling Lists",
    "raw_rows": call_total_rows,
    "calling_parents_phones": len(calling_parents),
    "calling_teachers_phones": len(calling_teachers),
    "calling_sejal_other_phones": len(calling_other),
    "total_unique_in_file": len(calling_parents.union(calling_teachers).union(calling_other)),
    "new_unique_to_global": len((calling_parents.union(calling_teachers).union(calling_other)) - global_all_phones)
}
global_parent_phones.update(calling_parents)
global_tutor_phones.update(calling_teachers)
global_telecalling_phones.update(calling_other)
global_all_phones.update(calling_parents)
global_all_phones.update(calling_teachers)
global_all_phones.update(calling_other)

# 11. syntax_123.xlsx
syntax_sheets = get_xlsx_rows(f"{data_dir}/syntax_123.xlsx")
syntax_rows = syntax_sheets['sheet_1']
syntax_phones = set()
for r in syntax_rows[1:]:
    for cell in r:
        p = clean_phone(cell)
        if p: syntax_phones.add(p)
file_stats["syntax_123.xlsx"] = {
    "category": "Tutorials & Coaching Institutes",
    "raw_rows": len(syntax_rows),
    "unique_phones": len(syntax_phones),
    "new_unique_to_global": len(syntax_phones - global_all_phones)
}
global_institute_phones.update(syntax_phones)
global_all_phones.update(syntax_phones)

# 12. lib data.xlsx
lib_sheets = get_xlsx_rows(f"{data_dir}/lib data.xlsx")
lib_total_rows = sum(len(s) for s in lib_sheets.values())
lib_phones = set()
for srows in lib_sheets.values():
    for r in srows:
        for cell in r:
            p = clean_phone(cell)
            if p: lib_phones.add(p)
file_stats["lib data.xlsx"] = {
    "category": "Library & Study Hall Records",
    "raw_rows": lib_total_rows,
    "unique_phones": len(lib_phones),
    "new_unique_to_global": len(lib_phones - global_all_phones)
}
global_library_phones.update(lib_phones)
global_all_phones.update(lib_phones)

# 13. report.docx
report_doc = get_docx_texts(f"{data_dir}/report.docx")
report_phones = set()
for t in report_doc:
    p = clean_phone(t)
    if p: report_phones.add(p)
file_stats["report.docx"] = {
    "category": "Channel Partners / Coordinators",
    "raw_rows": len(report_doc),
    "unique_phones": len(report_phones),
    "new_unique_to_global": len(report_phones - global_all_phones)
}
global_telecalling_phones.update(report_phones)
global_all_phones.update(report_phones)

# 14. Important_terms_and_condition.docx
terms_doc = get_docx_texts(f"{data_dir}/Important_terms_and_condition.docx")
file_stats["Important_terms_and_condition.docx"] = {
    "category": "Franchise Terms & Policy (Text Document)",
    "raw_rows": len(terms_doc),
    "unique_phones": 0,
    "new_unique_to_global": 0
}

# 15. Reports_of_parents_meeting.docx
meeting_doc = get_docx_texts(f"{data_dir}/Reports_of_parents_meeting.docx")
file_stats["Reports_of_parents_meeting.docx"] = {
    "category": "Meeting Format & Log (Text Document)",
    "raw_rows": len(meeting_doc),
    "unique_phones": 0,
    "new_unique_to_global": 0
}

output = {
    "file_stats": file_stats,
    "summary": {
        "total_files": 15,
        "total_raw_rows_across_all_sheets": sum(f.get("raw_rows", 0) for f in file_stats.values()),
        "global_total_unique_phones": len(global_all_phones),
        "global_unique_tutors": len(global_tutor_phones),
        "global_unique_parents_inquiries": len(global_parent_phones),
        "global_unique_coaching_institutes": len(global_institute_phones),
        "global_unique_library_records": len(global_library_phones),
        "global_unique_telecalling_campaign_pool": len(global_telecalling_phones)
    }
}

with open("scratch/exact_totals.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print("EXACT COMPUTATION COMPLETED:")
print(json.dumps(output["summary"], indent=2))
