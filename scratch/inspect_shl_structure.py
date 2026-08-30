import zipfile
import xml.etree.ElementTree as ET

def get_shl_rows():
    with zipfile.ZipFile("datauploadrawdata/shl final.xlsx") as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t_elems = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                shared_strings.append(''.join(t.text for t in t_elems if t.text))

        stree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row_elem in stree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for c in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t_attr = c.attrib.get('t')
                v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v_elem.text if v_elem is not None else ''
                if t_attr == 's' and val.isdigit():
                    val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                row_vals.append(str(val).strip())
            rows.append(row_vals)
        return rows

rows = get_shl_rows()
print("Sample rows from shl final.xlsx sheet 1:")
for idx, r in enumerate(rows[:25]):
    print(f"Row {idx}: {r}")
