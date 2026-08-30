import csv
from collections import Counter

locations = Counter()
with open("datauploadrawdata/MASTER_CONSOLIDATED_ALL_LEADS.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        locations[row["location"]] += 1

print("Top 30 Locations in Master CSV:")
for loc, count in locations.most_common(30):
    print(f"  {loc!r}: {count}")

print(f"\nTotal distinct location strings: {len(locations)}")

malformed = []
for loc, count in locations.items():
    if not loc or any(c in loc for c in ['"', "'", "_", "*", "{", "}", "[", "]"]) or loc.startswith(",") or loc.endswith(","):
        malformed.append((loc, count))

print(f"Total malformed locations found: {len(malformed)}")
for loc, count in malformed[:20]:
    print(f"  Malformed: {loc!r}: {count}")
