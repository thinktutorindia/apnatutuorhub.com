from PIL import Image, ImageDraw, ImageFilter

im = Image.open(r'C:\Users\coder\Desktop\Edu\scratch\crop_price.png').convert('RGBA')

# In crop_price.png:
# Size is:
w, h = im.size
print('Crop size:', w, h)

# Let's inspect where the rupee and 9s are:
# Rupee is roughly x in [45, 150]
# First 9 is roughly x in [155, 275]
# Second 9 is roughly x in [270, 395]

# Let's create an alpha mask for any pixel that belongs to the glyph:
# The glyph is either red (R > 160, G < 60, B < 60) or white border (R > 220, G > 220, B > 200) or dark drop shadow
# The yellow background is: R > 220, G in [180, 245], B < 80

def is_background_yellow(r, g, b):
    # Yellow background check
    return r > 200 and g > 170 and b < 100

def create_glyph_rgba(crop_box):
    crop = im.crop(crop_box)
    cw, ch = crop.size
    rgba = crop.copy()
    datas = rgba.getdata()
    newData = []
    for item in datas:
        r, g, b, a = item
        if is_background_yellow(r, g, b):
            newData.append((255, 255, 255, 0)) # transparent
        else:
            newData.append(item)
    rgba.putdata(newData)
    return rgba

# Crop the second 9 (which has a clean right side)
nine_clean = create_glyph_rgba((270, 25, 395, 195))
nine_clean.save(r'C:\Users\coder\Desktop\Edu\scratch\nine_clean.png')

rupee_clean = create_glyph_rgba((40, 50, 155, 195))
rupee_clean.save(r'C:\Users\coder\Desktop\Edu\scratch\rupee_clean.png')

print('Saved clean glyphs')
