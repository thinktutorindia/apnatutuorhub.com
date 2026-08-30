import json

with open("scratch/deep_inspection.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("="*80)
print(f"TOTAL FILES IN datauploadrawdata: {len(data)}")
print("="*80)

categories = {
    "Tutor Data": [],
    "Parent / Student Leads": [],
    "Calling Lists / Phone Dumps": [],
    "Documents / Policies / Reports": [],
    "Other / Misc": []
}

for fname, finfo in data.items():
    print(f"\nFILE: {fname} ({finfo.get('file_type', 'Unknown')})")
    if finfo.get('file_type') == 'DOCX Document':
        print(f"  Total Paragraphs: {finfo.get('total_paragraphs')}")
        print("  Preview:")
        for p in finfo.get('preview', [])[:5]:
            print(f"    - {p}")
        categories["Documents / Policies / Reports"].append(fname)
    elif finfo.get('file_type') == 'CSV File':
        print(f"  Rows: {finfo.get('row_count')}")
        print(f"  Headers: {finfo.get('headers')}")
        print(f"  Sample row 1: {finfo.get('sample', [[]])[0] if finfo.get('sample') else 'None'}")
        categories["Parent / Student Leads"].append(fname)
    elif finfo.get('file_type') == 'Excel Workbook':
        for sname, sinfo in finfo.get('sheets', {}).items():
            print(f"  Sheet: '{sname}' | Rows: {sinfo.get('row_count')}")
            print(f"    Headers ({sinfo.get('header_count')} cols): {sinfo.get('headers')[:12]}")
            if sinfo.get('sample'):
                print(f"    Sample Row 1: {sinfo.get('sample')[0][:8]}")
            else:
                print(f"    Sample Row 1: (empty)")
        if 'tutor' in fname.lower() or 'rohit' in fname.lower() or 'prerna' in fname.lower():
            categories["Tutor Data"].append(fname)
        elif 'call' in fname.lower():
            categories["Calling Lists / Phone Dumps"].append(fname)
        elif 'shl' in fname.lower():
            categories["Parent / Student Leads"].append(fname)
        else:
            categories["Other / Misc"].append(fname)
