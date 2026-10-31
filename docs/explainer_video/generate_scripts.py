import os
import json
import subprocess

scenes = [
    {
        "id": "scene1",
        "title": "Operations Dashboard & Automated Daily Campaigns",
        "title_hi": "Operations Dashboard: Daily Lead Campaigns",
        "caption": "Namaste! Apna Tutor Hub ke operations dashboard me aapka swagat hai: automated daily teacher engagement across Delhi NCR & Pan-India.",
        "text": """Namaste! Apna Tutor Hub ke operations dashboard me aapka swagat hai.
Yeh screen, yaani slash admin slash dummy dash campaigns, hamara main command center hai jahan se Delhi NCR aur Pan-India ke teachers ke liye daily automated lead campaigns chalaye jaate hain.
Platform chaar main pillars par chalta hai.
Pehla hai Gemini AI Proximity: yeh tutors ko student ke ghar ke paas, strictly 1 se 5 kilometer ke radius me micro-cluster karta hai, taaki teachers ko lambi travel wali inquiries na milein.
Doosra hai AI Market Plus Rate Tariff: yeh market rate par 15 percent premium jodkar teachers ko demo class lene ke liye attract karta hai.
Teesra hai Resend Quota Guard: jo system ki email reputation ko protect rakhta hai.
Aur chautha hai Automated 9:00 AM Cron: jo har subah 9 baje automatically run hota hai aur har active tutor ko ek personalized, geo-matched lead deliver karta hai.
Sabse achhi baat yeh hai ki koi bhi naya registered tutor is daily pass me automatically jud jaata hai, bina kisi manual configuration ke."""
    },
    {
        "id": "scene2",
        "title": "WhatsApp Blast Engine & Geo-Matched Audience",
        "title_hi": "Direct WhatsApp Blast: Geo-Matched Audience Engine",
        "caption": "Direct WhatsApp Blast: 730 active tutors categorized into 53 nearby Home Tuitions aur 677 1-on-1 Online Tuitions.",
        "text": """Ab aate hain sabse powerful tool par. Jaise hi aap upar green button WhatsApp Blast par click karte hain, hamara direct broadcast engine open ho jaata hai.
Yahan system directly hamari WhatsApp chat history se connect hota hai aur un 730 teachers ko filter karta hai jinhone pehle interest show kiya tha.
Dhyan se dekhiye upar ke audience breakdown ko.
In 730 active leads me se, 53 tutors aise hain jinki verified location 5 kilometer ke andar hai: inhein strictly Home Tuition yani offline tuition ka alert bheja jaata hai.
Baqi bache 677 teachers jinki location system me save nahi hai, unhe automatically 1-on-1 Online Mode me route kar diya jaata hai.
Iska fayda yeh hai ki platform par zero junk leads ka rule follow hota hai: local teachers ko unke ghar ke paas ki tuition milti hai, aur door ke teachers ko online students."""
    },
    {
        "id": "scene3",
        "title": "Deep Dive: The Meta 24-Hour Rule (Custom Text vs Approved Templates)",
        "title_hi": "THE 24-HOUR RULE: Session Text vs. Approved Template",
        "caption": "Meta 24-hour rule: Inside 24h gets custom text freedom; outside 24h auto-routes to approved template tuition_enquiry_direct.",
        "text": """Ab aate hain is screen ke sabse important aur critical feature par: Meta ka 24-hour messaging window rule.
Aap yahan do status badges dekh sakte hain.
Pehla hai green color me Two inside twenty-four hours, aur doosra hai orange color me Seven hundred and twenty-eight outside twenty-four hours.
Yeh rule kya hai aur Meta ise kyun enforce karta hai?
Official Meta WhatsApp Cloud API ki policy ke according, jab bhi koi tutor hamare business WhatsApp number par inbound message bhejta hai, jaise Hi, Interested, ya registration ke time, toh Meta theek usi time se 24 ghante ka customer service window open karta hai.
In 24 ghanton ke andar, aapke paas 100 percent creative freedom hoti hai. Aap bina kisi Meta approval ke freely Hinglish text, detailed commission plans jaise 1,257 registration fee, 50 percent first month commission, emojis aur custom formatting bhej sakte hain.
Lekin jaise hi tutor ke aakhiri message ko 24 ghante poore ho jaate hain, Meta unhein koi bhi custom ya freeform message bhejne se strictly block kar deta hai.
Agar aap 24 ghante ke baad custom text bhejenge, toh Meta us message ko drop kar dega aur HTTP 400 error return karega.
Apna Tutor Hub is problem ko intelligent auto-fallback se solve karta hai.
Jo 2 tutors 24 hours ke andar hain, unhe turant hamara custom Hinglish pitch delivery hota hai.
Aur jo 728 tutors 24 hours ke bahar hain, system automatically hamare Meta-Approved template tuition underscore enquiry underscore direct par switch ho jaata hai.
Is approved template me class, subject, location aur fee ke 7 dynamic variables inject hote hain.
Isse do sabse bade fayde milte hain:
Pehla, 100 percent deliverability guarantee hoti hai aur message drop nahi hota.
Doosra, hamara WhatsApp business number Meta ke spam block ya suspension se poori tarah safe rehta hai.
Aur jaise hi koi tutor is template par YES ya One reply karta hai, Meta ka 24 ghante ka free custom window dobara open ho jaata hai."""
    },
    {
        "id": "scene4",
        "title": "Dynamic Dual Templates & Gemini AI Pitch Editor",
        "title_hi": "Dual Templates & Gemini AI Real-Time Pitch Editing",
        "caption": "Dual Templates & Gemini AI: In-Person vs Online templates with automated fee calculations aur real-time AI tweaking.",
        "text": """Modal ke right side me hamara Dual Template System aur real-time Gemini AI assistant hai.
5km In-Person template offline tuition ke liye designed hai, jisme locality, landmark, traveling distance aur 5-days evening schedule mention hota hai.
Online template Zoom aur Google Meet par Pan-India remote classes ke liye optimized hai.
Saath hi system pricing rules ko strictly enforce karta hai:
Junior classes 1 se 8 ke liye monthly fee hoti hai all subjects ke saath.
Aur senior classes 9 se 12 ke liye hourly rate hota hai subject-wise jaise Maths ya Physics.
Agar aapko message pitch me koi badlav karna ho, toh simply Chat with AI par click kijiye.
Aap Gemini ko aam bhasha me prompt de sakte hain, jaise fee 15 percent badha do ya weekend demo ki urgency create karo, aur AI bina mandatory variables ko tode template ko instant update kar deta hai."""
    },
    {
        "id": "scene5",
        "title": "1-Click Safe Dispatch & Real-Time Delivery Tracking",
        "title_hi": "1-Click Safe Dispatch & Real-Time Delivery Tracking",
        "caption": "1-Click Safe Dispatch: Throttled broadcast pipeline with live webhook delivery tracking aur built-in balance safeguards.",
        "text": """Aakhiri step hai delivery execution.
Jab aap target tutors select karke Dispatch WhatsApp par click karte hain, hamara throttled delivery pipeline trigger hota hai.
Messages safe batches me send kiye jaate hain taaki API limit cross na ho.
Saath hi real-time webhooks har message ka live status update karte hain: pehle Sent, fir Delivered, aur jab tutor padh leta hai toh double blue ticks ke saath Seen status record hota hai.
Aapki balance security ke liye system me 20 messages ka daily test cap laga hua hai, taaki testing ke dauran unnecessary credits exhaust na hon.
Toh yeh tha Apna Tutor Hub ka complete WhatsApp Blast aur Operations Engine: fast, intelligent aur 100 percent compliant."""
    }
]

output_dir = "docs/explainer_video"
os.makedirs(output_dir, exist_ok=True)

with open(os.path.join(output_dir, "scenes_data.json"), "w") as f:
    json.dump(scenes, f, indent=2)

print("Hinglish Scene scripts saved successfully.")
