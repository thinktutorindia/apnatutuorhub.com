import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

rupee = Image.open(r'C:\Users\coder\Desktop\Edu\scratch\rupee_pure.png').convert('RGBA')
nine = Image.open(r'C:\Users\coder\Desktop\Edu\scratch\nine_pure.png').convert('RGBA')

# Function to patch ₹999 on any base flyer
def patch_price_999(base_img, start_x=185, y_r=362, y_n=345, scale=0.88):
    base = base_img.copy().convert('RGBA')
    
    # 1. Clean old price area on the yellow burst: x in [185, 545], y in [345, 510]
    patch_mask = Image.new('L', base.size, 0)
    pdraw = ImageDraw.Draw(patch_mask)
    pdraw.rounded_rectangle((185, 345, 545, 510), radius=35, fill=255)
    patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(10))

    patch_color = Image.new('RGBA', base.size, (254, 222, 18, 255))
    base = Image.composite(patch_color, base, patch_mask)

    # 2. Rescale glyphs
    r_s = rupee.resize((int(rupee.width * scale), int(rupee.height * scale)), Image.Resampling.LANCZOS)
    n_s = nine.resize((int(nine.width * scale), int(nine.height * scale)), Image.Resampling.LANCZOS)

    # 3. Paste ₹ 9 9 9
    spacing = n_s.width - 20
    base.paste(r_s, (start_x, y_r), r_s)
    base.paste(n_s, (start_x + r_s.width - 15, y_n), n_s)
    base.paste(n_s, (start_x + r_s.width - 15 + spacing, y_n), n_s)
    base.paste(n_s, (start_x + r_s.width - 15 + spacing * 2, y_n), n_s)
    
    return base

# ----------------------------------------------------
# 1. English Call Only -> /public/tutor_plan_english_call.jpg
# ----------------------------------------------------
base_en_call = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\.user_uploaded\media_1789369513344.jpg')
flyer_en_call = patch_price_999(base_en_call)
out_en_call = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_english_call.jpg'
flyer_en_call.convert('RGB').save(out_en_call, quality=95)
print('Saved 1. English Call Only:', out_en_call)

# ----------------------------------------------------
# 2. English with QR -> /public/tutor_plan_english_qr.jpg
# ----------------------------------------------------
base_en_qr = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\plan_english_qr_1789369916427.jpg')
flyer_en_qr = patch_price_999(base_en_qr)
out_en_qr = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_english_qr.jpg'
flyer_en_qr.convert('RGB').save(out_en_qr, quality=95)
print('Saved 2. English QR:', out_en_qr)

# ----------------------------------------------------
# 3. Hindi Call Only -> /public/tutor_plan_hindi_call.jpg
# ----------------------------------------------------
base_hi_call = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\plan_hindi_call_1789369946236.jpg')
flyer_hi_call = patch_price_999(base_hi_call)
out_hi_call = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_hindi_call.jpg'
flyer_hi_call.convert('RGB').save(out_hi_call, quality=95)
print('Saved 3. Hindi Call Only:', out_hi_call)

# ----------------------------------------------------
# 4. Hindi with QR -> /public/tutor_plan_hindi_qr.jpg
# ----------------------------------------------------
# For Hindi with QR, take the English QR layout (which has the gorgeous QR standee on the right)
# and apply the Hindi header, Hindi 5 cards, and Hindi why join us banner!
# Or take flyer_hi_call and composite the BharatPe QR standee from plan_english_qr!
qr_standee_crop = base_en_qr.crop((630, 150, 975, 570)) # Clean crop of the standee from flyer 2
flyer_hi_qr = flyer_hi_call.copy()
flyer_hi_qr.paste(qr_standee_crop, (630, 150))
out_hi_qr = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_hindi_qr.jpg'
flyer_hi_qr.convert('RGB').save(out_hi_qr, quality=95)
print('Saved 4. Hindi QR:', out_hi_qr)

print('ALL 4 FLYERS PROCESSED SUCCESSFULLY WITH ₹999!')
