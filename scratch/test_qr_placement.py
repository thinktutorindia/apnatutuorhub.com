from PIL import Image, ImageDraw, ImageFont, ImageFilter

base = Image.open(r'C:\Users\coder\Desktop\Edu\scratch\perfect_999_english.jpg').convert('RGBA')
qr_raw = Image.open(r'C:\Users\coder\Desktop\Edu\public\images\bharatpe-qr.jpg').convert('RGBA')

# In the flyer, we can place the QR card on the right side: x: 570 to 970, y: 140 to 550
# The QR image is 730 x 1024
# We can scale the QR card cleanly
qr_w = 340
qr_h = int(qr_raw.height * (qr_w / qr_raw.width))
qr_scaled = qr_raw.resize((qr_w, qr_h), Image.Resampling.LANCZOS)

# Create a clean white card container with rounded corners and shadow for the QR
card_w = 370
card_h = 420
card = Image.new('RGBA', (card_w, card_h), (0,0,0,0))
cdraw = ImageDraw.Draw(card)

# White rounded card
cdraw.rounded_rectangle((0, 0, card_w, card_h), radius=28, fill=(255, 255, 255, 255), outline=(220, 20, 30, 255), width=3)

# Add header on card: "SCAN & PAY ₹999"
try:
    font_header = ImageFont.truetype('arialbd.ttf', 24)
    font_sub = ImageFont.truetype('arialbd.ttf', 14)
except:
    font_header = ImageFont.load_default()
    font_sub = ImageFont.load_default()

# Header pill
cdraw.rounded_rectangle((20, 14, card_w - 20, 52), radius=16, fill=(225, 20, 30, 255))
cdraw.text((card_w//2, 33), '⚡ SCAN TO PAY ₹999', font=font_header, fill=(255, 255, 255, 255), anchor='mm')

# Paste the actual QR inside
# Crop just the QR and payee section of bharatpe-qr
# In bharatpe-qr: QR code is centered
qr_crop = qr_raw.crop((60, 120, 670, 850))
qr_crop_scaled = qr_crop.resize((310, int(qr_crop.height * (310 / qr_crop.width))), Image.Resampling.LANCZOS)
card.paste(qr_crop_scaled, ((card_w - 310)//2, 60))

# Sub-text at bottom
cdraw.text((card_w//2, card_h - 22), 'Send screenshot to 0806 218 0653', font=font_sub, fill=(100, 100, 100, 255), anchor='mm')

# Add drop shadow to card
shadow = Image.new('RGBA', (card_w + 30, card_h + 30), (0,0,0,0))
sdraw = ImageDraw.Draw(shadow)
sdraw.rounded_rectangle((15, 15, card_w + 15, card_h + 15), radius=30, fill=(0, 0, 0, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(10))

# Paste shadow and card at (600, 130)
base.paste(shadow, (600 - 15, 130 - 15), shadow)
base.paste(card, (600, 130), card)

base.convert('RGB').save(r'C:\Users\coder\Desktop\Edu\scratch\test_flyer_english_qr.jpg', quality=95)
print('Saved test_flyer_english_qr.jpg')
