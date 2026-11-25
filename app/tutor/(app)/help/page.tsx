import { Coins, MessageCircle, PlayCircle, ShieldCheck, PhoneCall } from "lucide-react";
import { SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Tutor Help & Coordinator Support | ApnaTutorHub",
  description: "Learn how to unlock student leads, schedule demos, and contact your dedicated tutor coordinator.",
};

export default function TutorHelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-slate-900">
      <header className="space-y-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          Support &amp; Guidance
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
          Teacher Help &amp; Coordinator Desk
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Aapke sabhi sawalon ke aasan jawab aur direct WhatsApp coordinator helpline.
        </p>
      </header>

      {/* Coordinator Hotline Card */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white inline-block">
            Dedicated Coordinator
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
            Need Immediate Help? Speak to Rohit Sharma
          </h2>
          <p className="text-xs text-emerald-100 font-medium max-w-lg">
            Agar aapko lead unlock karne, parent se baat karne, ya coins mein koi bhi dikkat aa rahi ho, toh turant WhatsApp karein.
          </p>
        </div>
        <a
          href="https://wa.me/919319193109?text=Namaste%20Rohit%20Ji%2C%20main%20ApnaTutorHub%20se%20teacher%20hoon.%20Mujhe%20help%20chahiye."
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm shrink-0 inline-flex items-center gap-2.5 shadow-md active:scale-95 transition-all"
        >
          <MessageCircle size={18} className="text-[#25D366]" />
          <span>WhatsApp Coordinator (+91 93191 93109)</span>
        </a>
      </div>

      {/* Guide 1: How to unlock leads */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-black text-base">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
            1
          </div>
          <h3>Student Leads Kaise Unlock Karein?</h3>
        </div>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-slate-600 font-medium leading-relaxed">
          <li><strong>Student Inquiries</strong> page kholein. Wahan aapke subjects aur 5 km ke daayre ke verified student requirements dikhenge.</li>
          <li>Class, location (area), aur fee budget check karein.</li>
          <li><strong>&quot;View Parent Contact Details&quot;</strong> button par tap karein.</li>
          <li>Aapke plan quota se free unlock ho jayega (ya wallet coins use honge).</li>
          <li>Direct Parent Phone Number, Name aur Address turant screen par show ho jayega.</li>
        </ol>
      </section>

      {/* Guide 2: Calling Parents */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-black text-base">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
            2
          </div>
          <h3>Parent Ko Call Kaise Karein &amp; Demo Fix Karein?</h3>
        </div>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          Contact unlock hote hi <strong>&quot;Call Parent&quot;</strong> button dabayein. Parent ko namaste kahein aur bolein:
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 italic leading-relaxed">
          &quot;Namaste Ji, main ApnaTutorHub se aapke bachhe ke tuition requirement ke liye call kar raha/rahi hoon. Mujhe aapka subject requirement mila. Kya hum kal ek free demo class rakh sakte hain?&quot;
        </div>
      </section>

      {/* Guide 3: Refund Policy */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-black text-base">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
            3
          </div>
          <h3>Agar Parent Call Na Uthaye Ya Lead Fake Ho?</h3>
        </div>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          ApnaTutorHub par sabhi leads verified hoti hain. Phir bhi agar koi number galat nikalta hai ya parent already kisi aur ko rakh chuka ho, toh lead card ke niche <strong>&quot;Request Coin Refund&quot;</strong> button dabayein. Quality desk turant check karke aapka lead credit/coin wapas kar dega.
        </p>
      </section>
    </div>
  );
}
