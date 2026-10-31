import os
import json
from PIL import Image, ImageDraw, ImageFont

img_dash_path = "C:/Users/coder/.gemini/antigravity/brain/07fcc58e-bbc1-41b1-8ac6-d7dc6ba0d3fd/.user_uploaded/media_1793336927748_e1559b67.jpg"
img_modal_path = "C:/Users/coder/.gemini/antigravity/brain/07fcc58e-bbc1-41b1-8ac6-d7dc6ba0d3fd/.user_uploaded/media_1793336937558_68ad3f43.jpg"

output_dir = "docs/explainer_video"
os.makedirs(output_dir, exist_ok=True)

# Load fonts
font_dir = "C:/Windows/Fonts"
font_title = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 46)
font_subtitle = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 24)
font_heading = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 30)
font_body = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 20)
font_body_bold = ImageFont.truetype(os.path.join(font_dir, "segoeuib.ttf"), 22)
font_small = ImageFont.truetype(os.path.join(font_dir, "segoeui.ttf"), 17)
font_code = ImageFont.truetype(os.path.join(font_dir, "consola.ttf"), 18)

def draw_header(draw, title, scene_num, total_scenes=5, badge_text="OPERATIONS GUIDE"):
    draw.rectangle([0, 0, 1920, 108], fill=(15, 23, 42))
    draw.line([0, 108, 1920, 108], fill=(30, 41, 59), width=2)
    
    # Platform badge
    draw.rounded_rectangle([40, 32, 220, 76], radius=8, fill=(16, 185, 129))
    draw.text((55, 42), "ApnaTutorHub", font=font_body_bold, fill=(255, 255, 255))
    
    # Title
    draw.text((250, 34), title, font=font_heading, fill=(248, 250, 252))
    
    # Scene indicator
    scene_badge = f"Scene {scene_num} of {total_scenes}"
    draw.rounded_rectangle([1700, 34, 1880, 76], radius=20, fill=(30, 41, 59), outline=(71, 85, 105))
    draw.text((1725, 42), scene_badge, font=font_body_bold, fill=(148, 163, 184))

def draw_footer_captions(draw, text):
    draw.rectangle([0, 970, 1920, 1080], fill=(10, 15, 30))
    draw.line([0, 970, 1920, 970], fill=(30, 41, 59), width=2)
    draw.rounded_rectangle([40, 990, 220, 1040], radius=8, fill=(220, 38, 38))
    draw.text((55, 1002), "HINGLISH AUDIO", font=font_small, fill=(255, 255, 255))
    
    # Text
    draw.text((245, 998), text[:135] + ("..." if len(text) > 135 else ""), font=font_body, fill=(226, 232, 240))

# ─────────────────────────────────────────────────────────────
# SCENE 1: OPERATIONS DASHBOARD
# ─────────────────────────────────────────────────────────────
def make_scene_1():
    img = Image.new("RGB", (1920, 1080), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Operations Dashboard: Daily Lead Campaigns", 1)
    
    # Left: User Screenshot cropped & framed
    raw_shot = Image.open(img_dash_path)
    shot_resized = raw_shot.resize((1040, 564), Image.Resampling.LANCZOS)
    draw.rounded_rectangle([48, 150, 1108, 734], radius=16, fill=(15, 23, 42), outline=(51, 65, 85), width=3)
    img.paste(shot_resized, (58, 160))
    
    draw.rounded_rectangle([68, 170, 430, 208], radius=6, fill=(15, 23, 42, 200), outline=(56, 189, 248))
    draw.text((80, 178), "Live Page: /admin/dummy-campaigns", font=font_small, fill=(56, 189, 248))
    
    cards = [
        ("Gemini AI Proximity (1-5km)", "Nearby localities ko micro-cluster karta hai (e.g. Sangam Vihar -> Batra -> Khanpur) taaki teachers ko paas ki tuition mile.", (16, 185, 129)),
        ("AI Market+ Rate Tariff (+15%)", "Classes ke according market rate par 15% rate boost deta hai taaki teachers demo classes lene ke liye attract hon.", (59, 130, 246)),
        ("Perpetual Daily Lead Dispatch", "Automated 9:00 AM Cron har subah har active teacher ko 1 geo-matched lead bhejta hai. Naye tutors auto-enroll hote hain.", (168, 85, 247)),
        ("Resend & Email Quota Guard", "Simulated alerts se email quota ko protect karta hai aur delivery rate high rakhta hai.", (234, 88, 12))
    ]
    
    y = 150
    for title, desc, color in cards:
        draw.rounded_rectangle([1140, y, 1870, y + 130], radius=14, fill=(19, 27, 46), outline=color, width=2)
        draw.rectangle([1140, y + 20, 1146, y + 110], fill=color)
        draw.text((1170, y + 16), title, font=font_body_bold, fill=(255, 255, 255))
        words = desc.split()
        cur = ""
        lines = []
        for w in words:
            if len(cur + " " + w) < 55: cur += " " + w
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        for i, l in enumerate(lines[:3]):
            draw.text((1170, y + 54 + (i * 24)), l.strip(), font=font_small, fill=(148, 163, 184))
        y += 145
        
    draw.rounded_rectangle([48, 755, 1870, 940], radius=12, fill=(15, 23, 42), outline=(37, 99, 235), width=2)
    draw.text((80, 775), "KEY TAKEAWAY FOR ADMINS (IN HINDI / ENGLISH)", font=font_body_bold, fill=(56, 189, 248))
    draw.text((80, 815), "• 41 Total Campaigns | 35 Active Live | 6,970 monthly automated dispatches complete ho chuki hain.", font=font_body, fill=(241, 245, 249))
    draw.text((80, 855), "• Kisi manual setup ki zaroorat nahi — platform daily lead matching aur notification khud handle karta hai.", font=font_body, fill=(203, 213, 225))
    draw.text((80, 895), "• Top par green 'WhatsApp Blast (Interested)' button click karke direct broadcast modal open hota hai.", font=font_body, fill=(52, 211, 153))

    draw_footer_captions(draw, "Namaste! Apna Tutor Hub ke operations dashboard me aapka swagat hai: automated daily teacher engagement across Delhi NCR & Pan-India.")
    img.save(os.path.join(output_dir, "scene1.png"))
    print("Scene 1 slide generated.")

# ─────────────────────────────────────────────────────────────
# SCENE 2: WHATSAPP BLAST ENGINE
# ─────────────────────────────────────────────────────────────
def make_scene_2():
    img = Image.new("RGB", (1920, 1080), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Direct WhatsApp Blast: Geo-Matched Audience Engine", 2)
    
    raw_shot = Image.open(img_modal_path)
    shot_resized = raw_shot.resize((1040, 568), Image.Resampling.LANCZOS)
    draw.rounded_rectangle([48, 140, 1108, 728], radius=16, fill=(15, 23, 42), outline=(51, 65, 85), width=3)
    img.paste(shot_resized, (58, 150))
    
    draw.rounded_rectangle([1140, 140, 1870, 310], radius=14, fill=(19, 27, 46), outline=(16, 185, 129), width=2)
    draw.text((1170, 160), "730 Active Interested Leads", font=font_heading, fill=(52, 211, 153))
    draw.text((1170, 205), "Yeh 730 leads hamare WhatsApp chat logs se synced hain.", font=font_body, fill=(203, 213, 225))
    draw.text((1170, 240), "Har lead ne pehle WhatsApp par interest confirm kiya tha,", font=font_body, fill=(148, 163, 184))
    draw.text((1170, 270), "isliye inka conversion cold database se 5 guna zyada hai.", font=font_body, fill=(148, 163, 184))
    
    # 5km Nearby Box
    draw.rounded_rectangle([1140, 330, 1870, 520], radius=14, fill=(15, 23, 42), outline=(34, 197, 94), width=2)
    draw.rounded_rectangle([1160, 345, 1450, 385], radius=6, fill=(34, 197, 94, 40), outline=(34, 197, 94))
    draw.text((1175, 353), "53 Within 5km (Home Tuition)", font=font_body_bold, fill=(34, 197, 94))
    draw.text((1165, 400), "• Tutors jinki verified location student ke 5km radius me hai.", font=font_body, fill=(241, 245, 249))
    draw.text((1165, 435), "• Inhein localized Home Tuition, walking/driving distance,", font=font_body, fill=(203, 213, 225))
    draw.text((1165, 470), "  landmark tags aur 5-days evening schedule bheja jaata hai.", font=font_body, fill=(203, 213, 225))

    # Online Box
    draw.rounded_rectangle([1140, 540, 1870, 730], radius=14, fill=(15, 23, 42), outline=(56, 189, 248), width=2)
    draw.rounded_rectangle([1160, 555, 1470, 595], radius=6, fill=(56, 189, 248, 40), outline=(56, 189, 248))
    draw.text((1175, 563), "677 Without Location (Online)", font=font_body_bold, fill=(56, 189, 248))
    draw.text((1165, 610), "• Tutors jinki location missing hai ya 5km se door rehte hain.", font=font_body, fill=(241, 245, 249))
    draw.text((1165, 645), "• Inhein 1-on-1 Online Class alert (Zoom / Google Meet),", font=font_body, fill=(203, 213, 225))
    draw.text((1165, 680), "  Pan-India remote student requirement aur flexible timings milti hain.", font=font_body, fill=(203, 213, 225))

    draw.rounded_rectangle([48, 755, 1870, 940], radius=12, fill=(15, 23, 42), outline=(245, 158, 11), width=2)
    draw.text((80, 775), "STRICT ZERO JUNK LEADS POLICY", font=font_body_bold, fill=(245, 158, 11))
    draw.text((80, 815), "• Kisi teacher ko 15-20km door ki offline tuition nahi bheji jaati.", font=font_body, fill=(241, 245, 249))
    draw.text((80, 855), "• System bulk blast ke time auto-routing se sahi template select kar leta hai.", font=font_body, fill=(203, 213, 225))
    draw.text((80, 895), "• Admin All Classes, Class 1-8 (Monthly), ya Class 9-12 (Hourly) se filter kar sakte hain.", font=font_body, fill=(148, 163, 184))

    draw_footer_captions(draw, "Direct WhatsApp Blast: 730 active tutors categorized into 53 nearby Home Tuitions aur 677 1-on-1 Online Tuitions.")
    img.save(os.path.join(output_dir, "scene2.png"))
    print("Scene 2 slide generated.")

# ─────────────────────────────────────────────────────────────
# SCENE 3: THE DEEP DIVE: META 24-HOUR RULE
# ─────────────────────────────────────────────────────────────
def make_scene_3():
    img = Image.new("RGB", (1920, 1080), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "THE 24-HOUR RULE: Session Text vs. Approved Template", 3)
    
    draw.rounded_rectangle([48, 125, 1870, 185], radius=10, fill=(30, 41, 59), outline=(71, 85, 105))
    draw.text((70, 140), "Meta Cloud API Policy: WhatsApp user ke aakhiri message se strictly 24 ghante ka customer service window open rakhta hai.", font=font_body, fill=(226, 232, 240))
    
    # Left Card: Inside 24 Hours (GREEN)
    draw.rounded_rectangle([48, 205, 930, 750], radius=16, fill=(15, 28, 24), outline=(34, 197, 94), width=3)
    draw.rounded_rectangle([70, 225, 460, 275], radius=8, fill=(34, 197, 94))
    draw.text((85, 235), "INSIDE 24 HOURS (2 Leads)", font=font_heading, fill=(0, 0, 0))
    draw.text((480, 238), "Custom Text OK", font=font_heading, fill=(74, 222, 128))
    
    draw.line([70, 295, 908, 295], fill=(34, 197, 94, 80), width=1)
    
    points_inside = [
        ("Kab apply hota hai?", "Tutor ne pichhle 24 ghante ke andar WhatsApp par message bheja ho (e.g. Hi, Interested, Enquiry)."),
        ("Meta Channel:", "WhatsApp Customer Care Session (mode: 'text')."),
        ("Puri Azaadi (Freedom):", "100% UNRESTRICTED: Aap freely custom Hinglish pitch, detailed commission plan (₹1,257 fee + 50%/5%), coordinator details, emojis aur pricing bhej sakte hain."),
        ("No Prior Approval:", "Meta se kisi pre-approval ki zaroorat nahi — aap text ko live customize kar sakte hain."),
        ("Cost Advantage:", "Free service tier / standard session messaging me cover hota hai."),
        ("UI me Tag:", "Green tag dikhta hai: '2 inside 24h (custom text OK)'.")
    ]
    
    y = 310
    for label, val in points_inside:
        draw.text((75, y), label, font=font_body_bold, fill=(74, 222, 128))
        words = val.split()
        cur = ""
        lines = []
        for w in words:
            if len(cur + " " + w) < 46: cur += " " + w
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        for i, l in enumerate(lines):
            draw.text((75, y + 26 + (i * 22)), l.strip(), font=font_small, fill=(241, 245, 249))
        y += 32 + (len(lines) * 22) + 8

    # Right Card: Outside 24 Hours (AMBER / ORANGE)
    draw.rounded_rectangle([988, 205, 1870, 750], radius=16, fill=(28, 22, 15), outline=(245, 158, 11), width=3)
    draw.rounded_rectangle([1010, 225, 1460, 275], radius=8, fill=(245, 158, 11))
    draw.text((1025, 235), "OUTSIDE 24 HOURS (728 Leads)", font=font_heading, fill=(0, 0, 0))
    draw.text((1480, 238), "Approved Template Only", font=font_heading, fill=(251, 191, 36))
    
    draw.line([1010, 295, 1848, 295], fill=(245, 158, 11, 80), width=1)
    
    points_outside = [
        ("Kab apply hota hai?", "Tutor ke aakhiri inbound message ko 24 ghante se zyada ho chuke hon."),
        ("Meta Cloud Rule:", "META CUSTOM TEXT KO STRICTLY DROP KAR DETA HAI (HTTP 400 error return hota hai)."),
        ("ApnaTutorHub Solution:", "System automatically Meta-Approved template par switch kar deta hai: tuition_enquiry_direct."),
        ("Dynamic Variables:", "7 approved variables inject hote hain: {{1}} Code, {{2}} Name, {{3}} Class/Subject, {{4}} Mode, {{5}} Location, {{6}} Fee, {{7}} Gender."),
        ("100% Delivery Guarantee:", "Meta filters ko pass karta hai, spam penalty nahi lagti aur WABA phone number safe rehta hai."),
        ("UI me Tag:", "Orange tag dikhta hai: '728 outside 24h (approved template)' warning ke saath.")
    ]
    
    y = 310
    for label, val in points_outside:
        draw.text((1015, y), label, font=font_body_bold, fill=(251, 191, 36))
        words = val.split()
        cur = ""
        lines = []
        for w in words:
            if len(cur + " " + w) < 46: cur += " " + w
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        for i, l in enumerate(lines):
            draw.text((1015, y + 26 + (i * 22)), l.strip(), font=font_small, fill=(241, 245, 249))
        y += 32 + (len(lines) * 22) + 8

    # Bottom Architecture Summary
    draw.rounded_rectangle([48, 770, 1870, 945], radius=12, fill=(15, 23, 42), outline=(56, 189, 248), width=2)
    draw.text((80, 785), "KYUN APNATUTORHUB KA AUTO-ROUTING CRITICAL HAI?", font=font_heading, fill=(56, 189, 248))
    draw.text((80, 830), "1. Zero Delivery Failure: Admin ko yaad rakhne ki zaroorat nahi ki kaunsa tutor 24h ke andar hai ya bahar.", font=font_body_bold, fill=(255, 255, 255))
    draw.text((80, 865), "2. Maximum Conversion: 24h ke andar walon ko full Hinglish pitch milta hai, baqiyon ko official template.", font=font_body, fill=(203, 213, 225))
    draw.text((80, 900), "3. Re-Opening The Window: Jaise hi tutor template par 'YES' ya '1' reply karta hai, 24 ghante ka custom window wapas khul jaata hai!", font=font_body, fill=(74, 222, 128))

    draw_footer_captions(draw, "Meta 24-hour rule: Inside 24h gets custom text freedom; outside 24h auto-routes to approved template tuition_enquiry_direct.")
    img.save(os.path.join(output_dir, "scene3.png"))
    print("Scene 3 slide generated.")

# ─────────────────────────────────────────────────────────────
# SCENE 4: DUAL TEMPLATES & GEMINI AI PITCH EDITOR
# ─────────────────────────────────────────────────────────────
def make_scene_4():
    img = Image.new("RGB", (1920, 1080), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Dual Templates & Gemini AI Real-Time Pitch Editing", 4)
    
    draw.rounded_rectangle([48, 140, 930, 730], radius=16, fill=(15, 23, 42), outline=(59, 130, 246), width=2)
    draw.text((75, 165), "Dual Template Engine & Class Rules", font=font_heading, fill=(96, 165, 250))
    
    # 5km In-Person Template box
    draw.rounded_rectangle([75, 220, 900, 420], radius=10, fill=(19, 27, 46), outline=(34, 197, 94))
    draw.text((95, 235), "5km In-Person Template (Home Tuition)", font=font_body_bold, fill=(34, 197, 94))
    draw.text((95, 270), "• Variables: {{name}}, {{class}}, {{subject}}, {{location}}, {{distance}}, {{fee}}", font=font_small, fill=(241, 245, 249))
    draw.text((95, 300), "• Focus: Student locality, travel distance (e.g. 2.4 km), 5 days/week evening schedule,", font=font_small, fill=(203, 213, 225))
    draw.text((95, 330), "  parent ke saath direct in-person demo class setup.", font=font_small, fill=(203, 213, 225))
    draw.text((95, 365), "• Commission Plan: ₹1,257 upfront + 50% 1st month + 5% monthly ongoing.", font=font_small, fill=(251, 191, 36))

    # Online Template box
    draw.rounded_rectangle([75, 440, 900, 640], radius=10, fill=(19, 27, 46), outline=(56, 189, 248))
    draw.text((95, 455), "Online Mode Template (1-on-1 Remote)", font=font_body_bold, fill=(56, 189, 248))
    draw.text((95, 490), "• Variables: {{name}}, {{class}}, {{subject}}, {{fee}}", font=font_small, fill=(241, 245, 249))
    draw.text((95, 520), "• Focus: 1-on-1 Online Class (Zoom / Google Meet), Pan-India remote learning,", font=font_small, fill=(203, 213, 225))
    draw.text((95, 550), "  flexible schedule, bina travel ghar se teaching.", font=font_small, fill=(203, 213, 225))
    draw.text((95, 585), "• Commission Plan: Transparent 50% first-month commission model.", font=font_small, fill=(251, 191, 36))

    draw.rounded_rectangle([75, 660, 900, 715], radius=8, fill=(30, 41, 59))
    draw.text((90, 675), "Class 1-8: Monthly (₹/mo) | Class 9-12: Hourly (₹500-₹600/hr)", font=font_body_bold, fill=(245, 158, 11))

    # Right Card: Gemini AI Editor
    draw.rounded_rectangle([970, 140, 1870, 730], radius=16, fill=(15, 23, 42), outline=(168, 85, 247), width=2)
    draw.text((1000, 165), "Gemini AI Natural Language Pitch Editing", font=font_heading, fill=(192, 132, 252))
    
    draw.rounded_rectangle([1000, 220, 1840, 360], radius=10, fill=(25, 20, 38), outline=(147, 51, 234))
    draw.text((1025, 235), "AI Assistant: 'Chat with AI (Edit Template)'", font=font_body_bold, fill=(216, 180, 254))
    draw.text((1025, 275), "Admin aam Hinglish me prompt de sakte hain:", font=font_body, fill=(241, 245, 249))
    draw.text((1025, 310), "  'Fee 15% badha do aur weekend demo ke liye urgency create karo'", font=font_code, fill=(250, 204, 21))

    draw.rounded_rectangle([1000, 380, 1840, 710], radius=10, fill=(19, 27, 46))
    draw.text((1025, 400), "LIVE PREVIEW EMULATION (CODERROHIT2927):", font=font_body_bold, fill=(56, 189, 248))
    
    preview_snippet = [
        "Namaste Rohit ji 🙏",
        "",
        "Apna Tutor Hub se verified 1-on-1 Online Tuition requirement aayi hai:",
        "📚 Class: Class 1 (All Subjects)",
        "💻 Teaching Mode: 1-on-1 Online Class (Zoom / Google Meet)",
        "💰 Tuition Fee: ₹6,200/month | Timing: Flexible Evening Schedule",
        "",
        "Commission Based Plan (Kam Upfront Se Shuru Karein):",
        "• Registration: ₹1,257 (6 Months Validity) | 5 Leads Included",
        "Agar interested hain toh 'YES' ya '1' reply kijiye."
    ]
    for i, line in enumerate(preview_snippet):
        draw.text((1025, 435 + (i * 24)), line, font=font_small, fill=(226, 232, 240))

    draw.rounded_rectangle([48, 755, 1870, 940], radius=12, fill=(15, 23, 42), outline=(16, 185, 129), width=2)
    draw.text((80, 775), "AI SAFEGUARDS BUILT-IN", font=font_heading, fill=(52, 211, 153))
    draw.text((80, 815), "• Gemini AI check karta hai ki mandatory placeholders ({{name}}, {{fee}}, {{class}}) intact rahein.", font=font_body, fill=(241, 245, 249))
    draw.text((80, 855), "• Invalid phone numbers ya pricing errors se protect karta hai.", font=font_body, fill=(203, 213, 225))
    draw.text((80, 895), "• 'Reset' button dabakar kabhi bhi default tested template restore kiya ja sakta hai.", font=font_body, fill=(148, 163, 184))

    draw_footer_captions(draw, "Dual Templates & Gemini AI: In-Person vs Online templates with automated fee calculations aur real-time AI tweaking.")
    img.save(os.path.join(output_dir, "scene4.png"))
    print("Scene 4 slide generated.")

# ─────────────────────────────────────────────────────────────
# SCENE 5: 1-CLICK DISPATCH & REAL-TIME WEBHOOK TRACKING
# ─────────────────────────────────────────────────────────────
def make_scene_5():
    img = Image.new("RGB", (1920, 1080), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw_header(draw, "1-Click Safe Dispatch & Real-Time Delivery Tracking", 5)
    
    stages = [
        ("1. Audience Selection", "Target teachers select karein. System 5km vs Online split turant calculate kar leta hai.", (56, 189, 248)),
        ("2. Safe Batching", "Aqua SMS aur Pinbot API ke through throttled batches me messages bheje jaate hain.", (168, 85, 247)),
        ("3. Webhook Sync", "Live status updates: SENT -> DELIVERED (grey ticks) -> SEEN (double blue ticks).", (34, 197, 94)),
        ("4. Daily Safety Cap", "20 messages ka daily test cap laga hai taaki testing me wallet balance exhaust na ho.", (245, 158, 11))
    ]
    
    x = 48
    for title, desc, col in stages:
        draw.rounded_rectangle([x, 150, x + 435, 450], radius=14, fill=(19, 27, 46), outline=col, width=2)
        draw.rounded_rectangle([x + 20, 170, x + 415, 215], radius=6, fill=col)
        draw.text((x + 35, 180), title, font=font_body_bold, fill=(0, 0, 0))
        
        words = desc.split()
        cur = ""
        lines = []
        for w in words:
            if len(cur + " " + w) < 30: cur += " " + w
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        for i, l in enumerate(lines):
            draw.text((x + 25, 250 + (i * 28)), l.strip(), font=font_body, fill=(226, 232, 240))
        x += 465

    draw.rounded_rectangle([48, 480, 1870, 750], radius=14, fill=(15, 23, 42), outline=(51, 65, 85), width=2)
    draw.text((80, 505), "PRODUCTION DELIVERY METRICS (DATABASE ME RECORDED):", font=font_heading, fill=(56, 189, 248))
    
    stats = [
        ("SEEN (Read by Tutors)", "7,183", "Double blue ticks confirmed on teacher phones", (34, 197, 94)),
        ("DELIVERED (Device Received)", "1,342", "Successfully reached recipient devices", (56, 189, 248)),
        ("SENT / ACCEPTED", "1,096", "Processed and queued by Meta Cloud Gateway", (245, 158, 11)),
        ("TOTAL OUTBOUND DELIVERIES", "9,621", "Verified delivered WhatsApp outreach messages", (168, 85, 247))
    ]
    
    x = 75
    for label, val, note, col in stats:
        draw.rounded_rectangle([x, 560, x + 415, 715], radius=10, fill=(19, 27, 46), outline=col)
        draw.text((x + 20, 575), label, font=font_small, fill=(148, 163, 184))
        draw.text((x + 20, 605), val, font=font_title, fill=col)
        draw.text((x + 20, 670), note, font=font_small, fill=(203, 213, 225))
        x += 440

    draw.rounded_rectangle([48, 770, 1870, 945], radius=12, fill=(15, 23, 42), outline=(34, 197, 94), width=2)
    draw.text((80, 790), "CONCLUSION & ADMIN BEST PRACTICES (IN HINDI / ENGLISH)", font=font_heading, fill=(34, 197, 94))
    draw.text((80, 835), "1. Blast karne se pehle 24h count check karein: 24h ke andar custom text; baqi sab me templates.", font=font_body, fill=(241, 245, 249))
    draw.text((80, 870), "2. Templates me {{class}} aur {{fee}} variables ko kabhi delete na karein.", font=font_body, fill=(203, 213, 225))
    draw.text((80, 905), "3. High Responsiveness: Jo tutor reply karega, uska 24 ghante ka free custom window turant reopen ho jaata hai!", font=font_body, fill=(74, 222, 128))

    draw_footer_captions(draw, "1-Click Safe Dispatch: Throttled broadcast pipeline with live webhook delivery tracking aur built-in balance safeguards.")
    img.save(os.path.join(output_dir, "scene5.png"))
    print("Scene 5 slide generated.")

make_scene_1()
make_scene_2()
make_scene_3()
make_scene_4()
make_scene_5()
print("All 5 Hinglish scene slides generated successfully!")
