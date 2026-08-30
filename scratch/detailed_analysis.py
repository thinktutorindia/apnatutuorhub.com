import json
import zipfile
import xml.etree.ElementTree as ET
import csv
import re

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

print("--- TUTOR DATA NCR.xlsx ---")
tutor_rows = get_sheet_rows("datauploadrawdata/TUTOR DATA NCR.xlsx", 0)
print(f"Total rows: {len(tutor_rows)}")
if tutor_rows:
    print(f"Header: {tutor_rows[0]}")
    for i in range(1, min(6, len(tutor_rows))):
        print(f"Row {i}: {tutor_rows[i]}")

print("\n--- prerna.xlsx ---")
prerna_rows = get_sheet_rows("datauploadrawdata/prerna.xlsx", 0)
print(f"Total rows: {len(prerna_rows)}")
if prerna_rows:
    print(f"Header: {prerna_rows[0]}")
    for i in range(1, min(6, len(prerna_rows))):
        print(f"Row {i}: {prerna_rows[i]}")

print("\n--- rohit data (1).xlsx ---")
rohit_rows = get_sheet_rows("datauploadrawdata/rohit data (1).xlsx", 0)
print(f"Total rows: {len(rohit_rows)}")
if rohit_rows:
    print(f"Header: {rohit_rows[0]}")
    for i in range(1, min(6, len(rohit_rows))):
        print(f"Row {i}: {rohit_rows[i]}")

print("\n--- shl final.xlsx (Sheet 1) ---")
shl_rows = get_sheet_rows("datauploadrawdata/shl final.xlsx", 0)
print(f"Total rows: {len(shl_rows)}")
if shl_rows:
    print(f"Row 0 (Header/first): {shl_rows[0]}")
    for i in range(1, min(6, len(shl_rows))):
        print(f"Row {i}: {shl_rows[i]}")

print("\n--- syntax_123.xlsx (Sheet 1) ---")
syntax_rows = get_sheet_rows("datauploadrawdata/syntax_123.xlsx", 0)
print(f"Total rows: {len(syntax_rows)}")
for i in range(min(6, len(syntax_rows))):
    print(f"Row {i}: {syntax_rows[i]}")

print("\n--- export 2.xlsx ---")
exp_rows = get_sheet_rows("datauploadrawdata/export 2.xlsx", 0)
print(f"Total rows: {len(exp_rows)}")
if exp_rows:
    print(f"Header: {exp_rows[0]}")
    for i in range(1, min(6, len(exp_rows))):
        print(f"Row {i}: {exp_rows[i]}")

