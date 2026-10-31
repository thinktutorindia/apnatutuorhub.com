import os
import re
import time
import subprocess
import json

def split_into_sentences(text):
    # Split by periods, exclamation, question marks or newlines
    raw_parts = re.split(r'([.!?\n]+)', text)
    sentences = []
    for i in range(0, len(raw_parts) - 1, 2):
        s = raw_parts[i].strip() + (raw_parts[i+1].strip() if i+1 < len(raw_parts) else "")
        s = s.strip()
        if len(s) > 3:
            sentences.append(s)
    if len(raw_parts) % 2 == 1 and raw_parts[-1].strip():
        s = raw_parts[-1].strip()
        if len(s) > 3:
            sentences.append(s)
    return sentences

def synthesize_scene(scene_id, text, voice="hi-IN-MadhurNeural"):
    out_dir = os.path.abspath(f"docs/explainer_video/chunks_{scene_id}")
    os.makedirs(out_dir, exist_ok=True)
    
    sentences = split_into_sentences(text)
    print(f"[{scene_id}] Processing {len(sentences)} sentences...")
    
    chunk_files = []
    for idx, sentence in enumerate(sentences):
        chunk_mp3 = os.path.join(out_dir, f"chunk_{idx:03d}.mp3")
        # Retry logic
        success = False
        for attempt in range(4):
            try:
                cmd = [
                    "python", "-m", "edge_tts",
                    "--voice", voice,
                    "--rate", "-2%",
                    "--text", sentence,
                    "--write-media", chunk_mp3
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(chunk_mp3) and os.path.getsize(chunk_mp3) > 1000:
                    success = True
                    break
            except Exception as e:
                time.sleep(1 + attempt)
        if not success:
            raise RuntimeError(f"Failed to synthesize sentence {idx}: {sentence}")
        chunk_files.append(f"file '{chunk_mp3.replace('\\', '/')}'")
        time.sleep(0.2)
        
    list_file = os.path.join(out_dir, "concat.txt")
    with open(list_file, "w") as f:
        f.write("\n".join(chunk_files))
        
    final_mp3 = os.path.abspath(f"docs/explainer_video/{scene_id}.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_file, "-c", "copy", final_mp3
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    res = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", final_mp3
    ], capture_output=True, text=True, check=True)
    dur = float(res.stdout.strip())
    print(f"[{scene_id}] Done! Duration: {dur:.2f}s")
    return dur

# Test on scene1
with open("docs/explainer_video/scenes_data.json", "r") as f:
    scenes = json.load(f)

for s in scenes:
    dur = synthesize_scene(s["id"], s["text"], "hi-IN-MadhurNeural")
    s["duration"] = round(dur, 2)

with open("docs/explainer_video/scenes_data.json", "w") as f:
    json.dump(scenes, f, indent=2)

print("ALL SCENES SYNTHESIZED SUCCESSFULLY IN HINGLISH WITH HINDI ACCENT!")
