import zipfile
import xml.etree.ElementTree as ET
import re
import os

def get_sheet_rows(path, sheet_idx=0):
    with zipfile.ZipFile(path) as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t_elems = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                shared_strings.append(''.join(t.text for t in t_elems if t.text))

        sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
        sheet_files.sort(key=lambda x: int(''.join(filter(str.isdigit, x)) or 0))
        if sheet_idx >= len(sheet_files):
            return []
        
        stree = ET.fromstring(z.read(sheet_files[sheet_idx]))
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
        return rows

# 1. Compare TUTOR DATA NCR.xlsx and prerna.xlsx
tutor_ncr = get_sheet_rows("datauploadrawdata/TUTOR DATA NCR.xlsx", 0)
prerna = get_sheet_rows("datauploadrawdata/prerna.xlsx", 0)

print("Tutor NCR rows:", len(tutor_ncr))
print("Prerna rows:", len(prerna))

# Compare phones
tutor_phones = set()
for r in tutor_ncr[1:]:
    if len(r) > 1 and r[1]:
        clean = re.sub(r'\D', '', str(r[1]))[-10:]
        if len(clean) == 10:
            tutor_phones.add(clean)

prerna_phones = set()
for r in prerna[1:]:
    if len(r) > 1 and r[1]:
        clean = re.sub(r'\D', '', str(r[1]))[-10:]
        if len(clean) == 10:
            prerna_phones.add(clean)

print(f"Unique 10-digit phones in TUTOR DATA NCR: {len(tutor_phones)}")
print(f"Unique 10-digit phones in prerna: {len(prerna_phones)}")
print(f"Overlap between TUTOR DATA NCR and prerna: {len(tutor_phones.intersection(prerna_phones))}")

# 2. Check rohit data (1).xlsx
rohit = get_sheet_rows("datauploadrawdata/rohit data (1).xlsx", 0)
rohit_phones = set()
for r in rohit[1:]:
    if len(r) > 3 and r[3]:
        clean = re.sub(r'\D', '', str(r[3]))[-10:]
        if len(clean) == 10:
            rohit_phones.add(clean)
print(f"\nUnique 10-digit phones in rohit data (1): {len(rohit_phones)}")
print(f"Overlap between rohit and TUTOR DATA NCR: {len(rohit_phones.intersection(tutor_phones))}")

# 3. Check export 2.xlsx
exp2 = get_sheet_rows("datauploadrawdata/export 2.xlsx", 0)
exp2_phones = set()
for r in exp2[1:]:
    if len(r) > 2 and r[2]:
        clean = re.sub(r'\D', '', str(r[2]))[-10:]
        if len(clean) == 10:
            exp2_phones.add(clean)
print(f"\nUnique 10-digit phones in export 2.xlsx: {len(exp2_phones)}")

# 4. Check Calling Data.xlsx
calling1 = get_sheet_rows("datauploadrawdata/Calling Data.xlsx", 0)
calling2 = get_sheet_rows("datauploadrawdata/Calling Data.xlsx", 1)
print(f"\nCalling Data.xlsx Sheet1 rows: {len(calling1)}, Sheet2 (sejal) rows: {len(calling2)}")

# 5. Check shl final.xlsx
print(f"\nshl final.xlsx sheets:")
with zipfile.ZipFile("datauploadrawdata/shl final.xlsx") as z:
    sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
    print(f"Found {len(sheet_files)} sheets")
    for i in range(len(sheet_files)):
        s_rows = get_sheet_rows("datauploadrawdata/shl final.xlsx", i)
        print(f"  Sheet {i+1}: {len(s_rows)} rows")

# 6. Check FEMALE_TEACHER_SPEC.docx
with zipfile.ZipFile("datauploadrawdata/FEMALE_TEACHER_SPEC.docx") as z:
    xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    texts = []
    for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        p_text = ''.join(t.text for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text)
        if p_text.strip():
            texts.append(p_text.strip())
    print(f"\nFEMALE_TEACHER_SPEC.docx preview (total {len(texts)} paragraphs):")
    for t in texts[:20]:
        print(" ", t)
