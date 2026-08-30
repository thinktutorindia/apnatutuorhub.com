import os
import zipfile
import xml.etree.ElementTree as ET
import csv
import json

def parse_docx(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            # Find all text
            texts = []
            for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                p_text = ''.join(t.text for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text)
                if p_text.strip():
                    texts.append(p_text.strip())
            return {"type": "docx", "paragraphs": texts[:15], "total_paragraphs": len(texts)}
    except Exception as e:
        return {"error": str(e)}

def parse_xlsx(path):
    try:
        with zipfile.ZipFile(path) as z:
            # Read shared strings
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    t_elems = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                    shared_strings.append(''.join(t.text for t in t_elems if t.text))

            # Read workbook structure
            sheets = []
            if 'xl/workbook.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/workbook.xml'))
                for s in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                    sheets.append(s.attrib.get('name'))

            # Parse each sheet
            sheet_data = {}
            sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
            sheet_files.sort()

            for idx, sheet_file in enumerate(sheet_files):
                sheet_name = sheets[idx] if idx < len(sheets) else f"Sheet{idx+1}"
                stree = ET.fromstring(z.read(sheet_file))
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
                
                sheet_data[sheet_name] = {
                    "total_rows": len(rows),
                    "headers": rows[0] if rows else [],
                    "sample_rows": rows[1:4] if len(rows) > 1 else []
                }
            return {"type": "xlsx", "sheets": sheet_data}
    except Exception as e:
        return {"error": str(e)}

def parse_csv(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.reader(f)
            rows = [r for r in reader if any(r)]
            return {
                "type": "csv",
                "total_rows": len(rows),
                "headers": rows[0] if rows else [],
                "sample_rows": rows[1:4] if len(rows) > 1 else []
            }
    except Exception as e:
        return {"error": str(e)}

def main():
    data_dir = r"datauploadrawdata"
    results = {}
    for filename in sorted(os.listdir(data_dir)):
        filepath = os.path.join(data_dir, filename)
        ext = os.path.splitext(filename)[1].lower()
        print(f"Processing {filename}...")
        if ext == '.xlsx':
            results[filename] = parse_xlsx(filepath)
        elif ext == '.docx':
            results[filename] = parse_docx(filepath)
        elif ext == '.csv':
            results[filename] = parse_csv(filepath)
        else:
            results[filename] = {"type": "unknown"}
    
    os.makedirs("scratch", exist_ok=True)
    with open("scratch/inspect_summary.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("Done! Saved to scratch/inspect_summary.json")

if __name__ == '__main__':
    main()
