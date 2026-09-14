import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Load styled non-overlapping 999
styled = Image.open(r'C:\Users\coder\Desktop\Edu\scratch\test_styled_999.png')
bbox = styled.getbbox()
styled_tight = styled.crop(bbox)

# Function to patch non-overlapping ₹999 cleanly onto any base flyer
def apply_clean_999(base_img):
    base = base_img.copy().convert('RGBA')
    
    # 1. Clean the old price area on the yellow burst completely with a feathered rounded rectangle
    patch_mask = Image.new('L', base.size, 0)
    pdraw = ImageDraw.Draw(patch_mask)
    pdraw.rounded_rectangle((170, 335, 560, 520), radius=45, fill=255)
    patch_mask = patch_mask.filter(ImageFilter.GaussianBlur(8))

    patch_color = Image.new('RGBA', base.size, (254, 222, 18, 255))
    base = Image.composite(patch_color, base, patch_mask)

    # 2. Scale styled 999
    target_w = 365
    target_h = int(styled_tight.height * (target_w / styled_tight.width))
    styled_scaled = styled_tight.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # 3. Center on the yellow burst: burst center is around x=365, y=428
    dest_x = 365 - target_w // 2
    dest_y = 428 - target_h // 2

    base.paste(styled_scaled, (dest_x, dest_y), styled_scaled)
    return base

# ----------------------------------------------------
# 1. English Call Only -> /public/tutor_plan_english_call.jpg
# ----------------------------------------------------
base_en_call = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\.user_uploaded\media_1789369513344.jpg')
flyer_1 = apply_clean_999(base_en_call)
out_1 = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_english_call.jpg'
flyer_1.convert('RGB').save(out_1, quality=95)
print('1. English Call saved')

# ----------------------------------------------------
# 2. English with QR -> /public/tutor_plan_english_qr.jpg
# ----------------------------------------------------
base_en_qr = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\plan_english_qr_1789369916427.jpg')
flyer_2 = apply_clean_999(base_en_qr)
out_2 = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_english_qr.jpg'
flyer_2.convert('RGB').save(out_2, quality=95)
print('2. English QR saved')

# ----------------------------------------------------
# 3. Hindi Call Only -> /public/tutor_plan_hindi_call.jpg
# ----------------------------------------------------
base_hi_call = Image.open(r'C:\Users\coder\.gemini\antigravity-ide\brain\a24fb711-61d8-4fef-b124-a2b42b546c84\plan_hindi_call_1789369946236.jpg')
flyer_3 = apply_clean_999(base_hi_call)
out_3 = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_hindi_call.jpg'
flyer_3.convert('RGB').save(out_3, quality=95)
print('3. Hindi Call saved')

# ----------------------------------------------------
# 4. Hindi with QR -> /public/tutor_plan_hindi_qr.jpg
# ----------------------------------------------------
# Crop the standee from flyer 2
qr_standee_crop = base_en_qr.crop((630, 150, 975, 570))
flyer_4 = flyer_3.copy()
flyer_4.paste(qr_standee_crop, (630, 150))
out_4 = r'C:\Users\coder\Desktop\Edu\public\tutor_plan_hindi_qr.jpg'
flyer_4.convert('RGB').save(out_4, quality=95)
print('4. Hindi QR saved')

print('All 4 flyers successfully updated with non-overlapping 999!')
