import os
import subprocess

base_dir = os.path.abspath("docs/explainer_video")
scenes = ["scene1", "scene2", "scene3", "scene4", "scene5"]

concat_entries = []

for s in scenes:
    img_file = os.path.join(base_dir, f"{s}.png")
    audio_file = os.path.join(base_dir, f"{s}.mp3")
    out_video = os.path.join(base_dir, f"{s}.mp4")
    
    print(f"Rendering video clip for {s}...")
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", img_file,
        "-i", audio_file,
        "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        out_video
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    concat_entries.append(f"file '{out_video.replace('\\', '/')}'")
    print(f"Finished {s}.mp4")

concat_file = os.path.join(base_dir, "concat_list.txt")
with open(concat_file, "w") as f:
    f.write("\n".join(concat_entries))

final_video = os.path.join(base_dir, "apnatutorhub-whatsapp-operations-explainer.mp4")
print("Concatenating into final master video...")
subprocess.run([
    "ffmpeg", "-y",
    "-f", "concat", "-safe", "0",
    "-i", concat_file,
    "-c", "copy",
    final_video
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("Final master video generated successfully:", final_video)

