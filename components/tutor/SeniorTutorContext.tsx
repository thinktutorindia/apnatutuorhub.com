"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type TextScale = "normal" | "large" | "xlarge";
export type Language = "en" | "hi";

const I18N_DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    portalBadge: "Tutor Portal",
    menuBtn: "Menu",
    seniorEducatorBadge: "Trusted Senior Educator",
    navHeading: "Main Menu",
    navHome: "Home Overview",
    navInquiries: "New Student Leads",
    navLeadsBadge: "New",
    navStudents: "My Active Students",
    navOngoingBadge: "Ongoing",
    navMessages: "Parent Messages",
    navWallet: "Coin Wallet & Top-Up",
    navMembership: "Membership & Plan",
    tutorName: "Educator",
    idVerifiedStatus: "ID & Degree Verified ✓",
    readAloudBtn: "Read Page Aloud",
    stopReadingBtn: "Stop Reading",
    topHelpBtn: "Helpline: +91 93191 93109",
    closeBtn: "Close",
    verifiedNetworkBadge: "Verified Home Tuition Network • Delhi NCR",
    welcomeTitle: "Namaste, Educator! 👋",
    welcomeSub: "Here are verified parents looking for an experienced tutor near your home today.",
    editAreaBtn: "Edit Area / Radius",
    statWalletLabel: "Available Wallet Coins",
    addCoinsMini: "+ Add Coins",
    statUnlockedLabel: "Parent Contacts Unlocked",
    statUnlockedSub: "Direct parent phone numbers",
    statActiveLabel: "Active Tuition Classes",
    statActiveVal: "Ongoing",
    statActiveSub: "View schedule →",
    statRatingLabel: "Your Tutor Rating",
    statRatingSub: "Verified Top Educator",
    inquiriesHeading: "New Student Inquiries Near You",
    inquiriesSub: "Review each student below and click the green button to see the parent's direct phone number.",
    filterAll: "All Near Me",
    filterClosest: "Closest First (< 2 km)",
    filterHighest: "Highest Fee",
    filterUnlocked: "Unlocked Contacts",
    homeTuitionBadge: "Home Tuition",
    seePhoneBtn: "See Parent Phone (10 Coins)",
    listenBtn: "Listen",
    contactUnlockedBadge: "Contact Unlocked ✓",
    callParentNow: "📞 Call Parent Now",
    whatsappParent: "💬 Message on WhatsApp",
    confirmStepBadge: "Step 2 of 2 • Confirm Contact Unlock",
    confirmModalTitle: "See Parent Phone Number?",
    confirmExplainText: "Use 10 Coins to view the parent's direct phone number and WhatsApp?",
    selectedStudentLabel: "Selected Student Inquiry:",
    mathCurrentLabel: "Current Balance:",
    mathCostLabel: "Cost to Unlock:",
    mathRemainingLabel: "Remaining Balance:",
    yesShowPhoneBtn: "Yes, Show Phone Number",
    noGoBackBtn: "No, Go Back",
    yourLocalityLabel: "Select Your Area / Locality",
    distanceLabel: "Maximum Travel Distance:",
    saveBtn: "Save Area & Radius",
    cancelBtn: "Cancel",
    helpModalTitle: "ApnaTutorHub Support Desk",
    helpModalSub: "Direct assistance for verified tutors. Speak with our Delhi educator support desk (+91 93191 93109) or chat with your coordinator on WhatsApp.",
    callbackBtn: "📞 Call Support Desk: +91 93191 93109",
    whatsappHelpBtn: "💬 Chat on WhatsApp (+91 93191 93109)",
    myStudentsTitle: "My Active Students & Unlocked Parents",
    myStudentsSub: "Your ongoing home tuition schedule, attendance reminders, and unlocked parent contacts.",
    messagesTitle: "Parent Messages",
    messagesSub: "Reply to parents with one tap or call them directly.",
    newBadge: "1 Unread Message",
    quickReplyHeading: "Tap a Quick Reply to Send Instantly:",
    quickReply1: '✓ "Yes, I am available for a demo class"',
    quickReply2: '"Please call me after 6:00 PM"',
    walletExplain: "10 Coins unlocks 1 verified parent's phone number & WhatsApp. Your coins never expire.",
    pack5Desc: "Unlock 5 student contacts",
    pack12Desc: "Unlock 12 student contacts",
    pack30Desc: "Unlock 30 student contacts",
    popularBadge: "Most Popular",
    scaleNormal: "Normal (A)",
    scaleLarge: "Large (A+)",
    scaleXLarge: "Extra Large (A++)",
    withinKmRadius: "Within {radius} km",
    subjectsCount: "{count} Subjects",
    coinsCount: "{count} Coins",
    unlockedCountLabel: "{count} Unlocked",
    ongoingCountLabel: "{count} Ongoing",
    activeLeadsCountLabel: "{count} Active Leads",
    seniorTeacherTip: "💡 Senior Teacher Tip: Please call the parent within the next 15–30 minutes to schedule a demo class.",
    doneCloseWindowBtn: "Done / Close Window",
    sendProposalBtn: "Send Proposal",
    sendingState: "Sending…",
    sendInAppProposal: "Send an In-App Proposal (Optional)",
    // Lead Feed & Cards
    liveInquiriesBadge: "Live Inquiries Feed • Delhi NCR",
    seniorEducatorVerified: "★ 5.0 Verified Senior Tutor",
    refreshInquiriesBtn: "🔄 Refresh Inquiries",
    rotateInquiriesBtn: "Rotate Inquiries",
    refreshingState: "Refreshing...",
    leadsRemainingCount: "leads remaining",
    managePlanLink: "Manage →",
    walletCoinsBtn: "🪙 Wallet ({balance} Coins)",
    tabMatchingSubjects: "🎯 Matching My Subjects",
    tabWithinKm: "📍 Within {radius} km",
    tabAllCityLeads: "🌐 All City Tuitions",
    tabUnlockedContacts: "✓ Unlocked Numbers",
    autoFilteredTitle: "Auto-filtered for your profile:",
    autoFilteredLeadSub: "Showing {count} leads within {radius} km matching your teaching subjects & grades.",
    viewAllWithinRadiusBtn: "View all {count} within {radius} km",
    browseAllCityBtn: "Browse all {count} city leads",
    searchPlaceholder: "Search by enquiry # (e.g. 832042), subject, locality...",
    allSubjectsOption: "All Subjects",
    allModesOption: "All Modes",
    onlineMode: "Online",
    offlineMode: "Offline",
    coachingMode: "Coaching",
    eitherMode: "Either",
    sortNewest: "Sort: Newest First",
    sortDistance: "Sort: Nearest First",
    sortFee: "Sort: Highest Fee",
    homeTuitionMode: "🏡 Home Tuition",
    onlineClassMode: "💻 Online Class",
    kmAwayDistance: "km away",
    allSubjectsText: "All Subjects",
    landmarkPrefix: "Landmark:",
    timingPrefix: "Timing:",
    feePrefix: "Fee:",
    tuitionFeeHeader: "Tuition Fee",
    monthSuffix: "month",
    hourSuffix: "hour",
    slotsLeftText: "slot left",
    slotsLeftPluralText: "slots left",
    seeParentPhonePlanBtn: "🟢 View Parent Contact Details (Plan Credit • 0 Coins)",
    seeParentPhoneCoinsBtn: "🟢 View Parent Contact ({cost} Coins)",
    membershipPointsCost: "{cost} membership points · {left} left",
    coinsToUnlock: "{cost} Coins to unlock",
    femaleTutorRequired: "Female Tutor Required",
    maleTutorRequired: "Male Tutor Required",
    shortlistedTitle: "You are Shortlisted!",
    shortlistedDesc: "The parent reviewed your profile and expressed interest. Reach out via Call or WhatsApp right away.",
    unlockedPanelHeading: "Your Unlocked Parent Phone Numbers",
    unlockedPanelSubtext: "You can call or WhatsApp these parents directly to schedule a demo class.",
    callParentBtn: "Call Parent",
    whatsappBtn: "WhatsApp",
    parentMobileLabel: "Parent Mobile Number:",
    unlockedStatusBadge: "UNLOCKED",
    refundRequestedBadge: "Refund Requested",
    requestRefundBtn: "Request Refund",
    seniorFaculty: "Senior Faculty",
    registeredTeacherBadge: "Registered Teacher ✓",
    myProfile: "My Profile",
    signOut: "Sign Out",
    coinsBadge: "Coins",
    activePlanBadge: "Active Plan",
    unlockModalHeading: "Unlock Student Requirement",
    freeUnlockHeading: "Included in Your Plan (0 Coins)",
    commissionPlanBenefit: "Commission Based Plan Benefit",
    planPointsRemainingText: "Included in your plan. 0 Coins charged from wallet ({left} plan unlocks remaining).",
    whatYouUnlockHeading: "What you unlock instantly:",
    unlockBenefit1: "Direct parent WhatsApp & phone number",
    unlockBenefit2: "Verified email & communication channel",
    unlockBenefit3: "Exact student locality, address & notes",
    confirmUnlockBtn: "Confirm Unlock (Free with Plan • 0 Coins)",
    cancelModalBtn: "Cancel",
    usePlanCreditModalText: "Use 1 verified lead credit from your active plan to view the parent's phone number? (0 Coins charged from wallet)",
    activeMembershipLeads: "Active Membership (5 Leads)",
    zeroCoinsIncludedPlan: "0 Coins (Included in Plan)",
    membershipActive: "Membership Active",
    tabAllClasses: "All Classes",
    tabUpcoming: "Upcoming / Active",
    tabCompleted: "Completed",
    tabCancelled: "Cancelled",
    bookingsBadge: "Tutor Schedule & Classes",
    bookingsTitle: "My Classes & Tutoring Schedule",
    bookingsSub: "Track upcoming student sessions, demo classes, and ongoing home tuitions.",
    findMoreStudentsBtn: "Find More Students",
    noClassesTitle: "No Tuition Classes Found",
    noClassesSub: "When you unlock student leads and schedule demos with parents, your classes will appear here.",
    browseInquiriesBtn: "Browse New Student Leads",
    txFilterAll: "All Transactions",
    txFilterPurchase: "Coin Top-Ups",
    txFilterDeduction: "Lead Unlocks",
    txFilterRefund: "Refunds",
    txFilterBonus: "Bonus",
    txTypePurchase: "Coin Top-up",
    txTypeDeduction: "Lead Unlock",
    txTypeRefund: "Refund",
    txTypeBonus: "Bonus Coins",
    txTypeAdminCredit: "Admin Credit",
    txTypeAdminDebit: "Admin Debit",
    walletTitle: "Coin Wallet",
    walletSub: "Track your coins, top-ups and unlock history",
    addCoinsBtn: "Add Coins",
    walletBalanceCardLabel: "Available Balance",
    totalPurchasedLabel: "Total Purchased",
    totalSpentLabel: "Total Spent",
    txHistoryTitle: "Transaction History",
    txEmpty: "No transactions yet",
  },
  hi: {
    portalBadge: "शिक्षक पोर्टल",
    menuBtn: "मेनू",
    seniorEducatorBadge: "विश्वसनीय वरिष्ठ शिक्षक",
    navHeading: "मुख्य मेनू",
    navHome: "होम डैशबोर्ड",
    navInquiries: "नए छात्र अनुरोध",
    navLeadsBadge: "नए",
    navStudents: "मेरे सक्रिय छात्र",
    navOngoingBadge: "सक्रिय",
    navMessages: "अभिभावकों के संदेश",
    navWallet: "कॉइन वॉलेट और टॉप-अप",
    navMembership: "सदस्यता और प्लान",
    tutorName: "शिक्षक जी",
    idVerifiedStatus: "आईडी और डिग्री सत्यापित ✓",
    readAloudBtn: "पेज पढ़कर सुनाएं",
    stopReadingBtn: "पढ़ना रोकें",
    topHelpBtn: "हेल्पलाइन: +91 93191 93109",
    closeBtn: "बंद करें",
    verifiedNetworkBadge: "सत्यापित होम ट्यूशन नेटवर्क • दिल्ली एनसीआर",
    welcomeTitle: "नमस्ते, शिक्षक जी! 👋",
    welcomeSub: "आज आपके घर के पास अनुभवी शिक्षक की तलाश कर रहे सत्यापित अभिभावकों की सूची।",
    editAreaBtn: "क्षेत्र / दूरी बदलें",
    statWalletLabel: "उपलब्ध वॉलेट कॉइन्स",
    addCoinsMini: "+ कॉइन्स जोड़ें",
    statUnlockedLabel: "अनलॉक अभिभावक संपर्क",
    statUnlockedSub: "सीधे अभिभावक फ़ोन नंबर",
    statActiveLabel: "चल रही ट्यूशन कक्षाएं",
    statActiveVal: "सक्रिय",
    statActiveSub: "समय-सारणी देखें →",
    statRatingLabel: "आपकी शिक्षक रेटिंग",
    statRatingSub: "सत्यापित श्रेष्ठ शिक्षक",
    inquiriesHeading: "आपके पास के नए छात्रों की पूछताछ",
    inquiriesSub: "नीचे प्रत्येक छात्र की जानकारी देखें और अभिभावक का सीधा फ़ोन नंबर देखने के लिए हरे बटन पर क्लिक करें।",
    filterAll: "सभी मेरे पास",
    filterClosest: "सबसे नज़दीक (< 2 km)",
    filterHighest: "सबसे अधिक शुल्क",
    filterUnlocked: "अनलॉक संपर्क",
    homeTuitionBadge: "होम ट्यूशन",
    seePhoneBtn: "अभिभावक का फ़ोन नंबर देखें (10 कॉइन्स)",
    listenBtn: "सुनें",
    contactUnlockedBadge: "संपर्क अनलॉक हो गया ✓",
    callParentNow: "📞 अभी फ़ोन करें",
    whatsappParent: "💬 व्हाट्सएप पर संदेश",
    confirmStepBadge: "चरण 2 / 2 • संपर्क पुष्टि",
    confirmModalTitle: "अभिभावक का फ़ोन नंबर देखें?",
    confirmExplainText: "अभिभावक का सीधा फ़ोन नंबर और व्हाट्सएप देखने के लिए 10 कॉइन्स का उपयोग करें?",
    selectedStudentLabel: "चुना गया छात्र अनुरोध:",
    mathCurrentLabel: "वर्तमान बैलेंस:",
    mathCostLabel: "अनलॉक शुल्क:",
    mathRemainingLabel: "शेष बैलेंस:",
    yesShowPhoneBtn: "हाँ, फ़ोन नंबर दिखाएं",
    noGoBackBtn: "नहीं, वापस जाएं",
    yourLocalityLabel: "अपना क्षेत्र चुनें",
    distanceLabel: "अधिकतम यात्रा दूरी:",
    saveBtn: "क्षेत्र और दूरी सहेजें",
    cancelBtn: "रद्द करें",
    helpModalTitle: "अपनाट्यूटरहब सहायता डेस्क",
    helpModalSub: "सत्यापित शिक्षकों के लिए प्रत्यक्ष सहायता। हमारे दिल्ली शिक्षक सहायता डेस्क (+91 93191 93109) से बात करें या व्हाट्सएप पर चैट करें।",
    callbackBtn: "📞 हेल्पलाइन पर कॉल करें: +91 93191 93109",
    whatsappHelpBtn: "💬 व्हाट्सएप सहायता (+91 93191 93109)",
    myStudentsTitle: "मेरे सक्रिय छात्र और अनलॉक अभिभावक",
    myStudentsSub: "आपकी चल रही ट्यूशन कक्षाओं का समय और अनलॉक किए गए अभिभावकों के नंबर।",
    messagesTitle: "अभिभावकों के संदेश",
    messagesSub: "एक टैप में उत्तर दें या सीधे फ़ोन करें।",
    newBadge: "1 अपठित संदेश",
    quickReplyHeading: "तुरंत भेजने के लिए त्वरित उत्तर चुनें:",
    quickReply1: '✓ "हाँ, मैं डेमो क्लास के लिए उपलब्ध हूँ"',
    quickReply2: '"कृपया शाम 6:00 बजे के बाद कॉल करें"',
    walletExplain: "10 कॉइन्स से 1 सत्यापित अभिभावक का फ़ोन नंबर और व्हाट्सएप खुलता है। आपके कॉइन्स कभी समाप्त नहीं होते।",
    pack5Desc: "5 छात्रों के संपर्क खोलें",
    pack12Desc: "12 छात्रों के संपर्क खोलें",
    pack30Desc: "30 छात्रों के संपर्क खोलें",
    popularBadge: "सबसे लोकप्रिय",
    scaleNormal: "सामान्य (A)",
    scaleLarge: "बड़ा (A+)",
    scaleXLarge: "अतिरिक्त बड़ा (A++)",
    withinKmRadius: "{radius} किमी दायरा",
    subjectsCount: "{count} विषय",
    coinsCount: "{count} कॉइन्स",
    unlockedCountLabel: "{count} अनलॉक",
    ongoingCountLabel: "{count} सक्रिय",
    activeLeadsCountLabel: "{count} सक्रिय अनुरोध",
    seniorTeacherTip: "💡 वरिष्ठ शिक्षक सुझाव: कृपया अभिभावक को अगले 15–30 मिनट में कॉल करके डेमो क्लास तय करें।",
    doneCloseWindowBtn: "संपन्न / विंडो बंद करें",
    sendProposalBtn: "प्रस्ताव भेजें",
    sendingState: "भेजा जा रहा है…",
    sendInAppProposal: "इन-ऐप प्रस्ताव भेजें (वैकल्पिक)",
    // Lead Feed & Cards
    liveInquiriesBadge: "लाइव छात्र अनुरोध • दिल्ली एनसीआर",
    seniorEducatorVerified: "★ 5.0 सत्यापित वरिष्ठ शिक्षक",
    refreshInquiriesBtn: "🔄 नए अनुरोध देखें",
    rotateInquiriesBtn: "अनुरोध बदलें",
    refreshingState: "रिफ्रेश हो रहा है...",
    leadsRemainingCount: "लीड्स शेष",
    managePlanLink: "प्रबंधन →",
    walletCoinsBtn: "🪙 वॉलेट ({balance} कॉइन्स)",
    tabMatchingSubjects: "🎯 मेरे विषय अनुसार",
    tabWithinKm: "📍 {radius} किमी के दायरे में",
    tabAllCityLeads: "🌐 पूरे शहर के ट्यूशन",
    tabUnlockedContacts: "✓ अनलॉक किए गए नंबर",
    autoFilteredTitle: "आपकी प्रोफ़ाइल के अनुसार छांटे गए:",
    autoFilteredLeadSub: "आपके विषय और कक्षा अनुसार {radius} किमी के दायरे में {count} अनुरोध दिखाए जा रहे हैं।",
    viewAllWithinRadiusBtn: "{radius} किमी में सभी {count} देखें",
    browseAllCityBtn: "पूरे शहर के सभी {count} अनुरोध देखें",
    searchPlaceholder: "पूछताछ #, विषय, या इलाके से खोजें...",
    allSubjectsOption: "सभी विषय",
    allModesOption: "सभी माध्यम",
    onlineMode: "ऑनलाइन",
    offlineMode: "ऑफ़लाइन",
    coachingMode: "कोचिंग",
    eitherMode: "दोनों",
    sortNewest: "क्रम: नए अनुरोध पहले",
    sortDistance: "क्रम: सबसे नज़दीकी",
    sortFee: "क्रम: सबसे अधिक शुल्क",
    homeTuitionMode: "🏡 होम ट्यूशन",
    onlineClassMode: "💻 ऑनलाइन क्लास",
    kmAwayDistance: "किमी दूर",
    allSubjectsText: "सभी विषय",
    landmarkPrefix: "प्रमुख स्थल:",
    timingPrefix: "समय:",
    feePrefix: "शुल्क:",
    tuitionFeeHeader: "ट्यूशन शुल्क",
    monthSuffix: "महीना",
    hourSuffix: "घंटा",
    slotsLeftText: "सीट उपलब्ध",
    slotsLeftPluralText: "सीटें उपलब्ध",
    seeParentPhonePlanBtn: "🟢 अभिभावक संपर्क देखें (प्लान क्रेडिट • 0 कॉइन्स)",
    seeParentPhoneCoinsBtn: "🟢 अभिभावक संपर्क देखें ({cost} कॉइन्स)",
    membershipPointsCost: "{cost} मेंबरशिप अंक · {left} शेष",
    coinsToUnlock: "अनलॉक करने हेतु {cost} कॉइन्स",
    femaleTutorRequired: "महिला शिक्षिका आवश्यक",
    maleTutorRequired: "पुरुष शिक्षक आवश्यक",
    shortlistedTitle: "आपको चुना गया है!",
    shortlistedDesc: "अभिभावक ने आपकी प्रोफ़ाइल देखकर रुचि दिखाई है। तुरंत कॉल या व्हाट्सएप करें।",
    unlockedPanelHeading: "आपके अनलॉक किए गए अभिभावक फ़ोन नंबर",
    unlockedPanelSubtext: "डेमो क्लास तय करने के लिए आप सीधे कॉल या व्हाट्सएप कर सकते हैं।",
    callParentBtn: "कॉल करें",
    whatsappBtn: "व्हाट्सएप",
    parentMobileLabel: "अभिभावक का मोबाइल नंबर:",
    unlockedStatusBadge: "अनलॉक",
    refundRequestedBadge: "रिफंड अनुरोध भेजा गया",
    requestRefundBtn: "रिफंड का अनुरोध करें",
    seniorFaculty: "वरिष्ठ शिक्षक",
    registeredTeacherBadge: "पंजीकृत शिक्षक ✓",
    myProfile: "मेरी प्रोफ़ाइल",
    signOut: "लॉग आउट",
    coinsBadge: "कॉइन्स",
    activePlanBadge: "सक्रिय प्लान",
    unlockModalHeading: "छात्र आवश्यकता अनलॉक करें",
    freeUnlockHeading: "आपके प्लान में शामिल (0 कॉइन्स)",
    commissionPlanBenefit: "कमीशन आधारित प्लान का लाभ",
    planPointsRemainingText: "आपके प्लान में शामिल। वॉलेट से 0 कॉइन्स काटे जाएंगे (प्लान में {left} अनलॉक शेष)।",
    whatYouUnlockHeading: "तुरंत क्या अनलॉक होगा:",
    unlockBenefit1: "अभिभावक का सीधा व्हाट्सएप और फ़ोन नंबर",
    unlockBenefit2: "सत्यापित ईमेल और संचार माध्यम",
    unlockBenefit3: "सटीक छात्र इलाका, पता और विवरण",
    confirmUnlockBtn: "अनलॉक की पुष्टि करें (प्लान में शामिल • 0 कॉइन्स)",
    cancelModalBtn: "रद्द करें",
    usePlanCreditModalText: "अभिभावक का फ़ोन नंबर देखने के लिए अपने प्लान के 1 लीड क्रेडिट का उपयोग करें? (वॉलेट से 0 कॉइन्स काटे जाएंगे)",
    activeMembershipLeads: "सक्रिय सदस्यता (5 लीड्स)",
    zeroCoinsIncludedPlan: "0 कॉइन्स (प्लान में शामिल)",
    membershipActive: "सदस्यता सक्रिय",
    tabAllClasses: "सभी कक्षाएं",
    tabUpcoming: "आगामी / सक्रिय",
    tabCompleted: "पूर्ण कक्षाएं",
    tabCancelled: "रद्द कक्षाएं",
    bookingsBadge: "शिक्षक समय-सारणी एवं कक्षाएं",
    bookingsTitle: "मेरी कक्षाएं और समय-सारणी",
    bookingsSub: "आगामी छात्र सत्र, डेमो कक्षाएं और चल रही होम ट्यूशन ट्रैक करें।",
    findMoreStudentsBtn: "और छात्र खोजें",
    noClassesTitle: "कोई ट्यूशन कक्षा नहीं मिली",
    noClassesSub: "जब आप छात्र लीड्स अनलॉक करेंगे और अभिभावकों के साथ डेमो तय करेंगे, तो आपकी कक्षाएं यहाँ दिखाई देंगी।",
    browseInquiriesBtn: "नई छात्र आवश्यकताएं देखें",
    txFilterAll: "सभी लेनदेन",
    txFilterPurchase: "कॉइन टॉप-अप",
    txFilterDeduction: "लीड अनलॉक",
    txFilterRefund: "रिफंड",
    txFilterBonus: "बोनस",
    txTypePurchase: "कॉइन टॉप-अप",
    txTypeDeduction: "लीड अनलॉक",
    txTypeRefund: "रिफंड",
    txTypeBonus: "बोनस कॉइन",
    txTypeAdminCredit: "एडमिन क्रेडिट",
    txTypeAdminDebit: "एडमिन डेबिट",
    walletTitle: "कॉइन वॉलेट",
    walletSub: "अपने कॉइन, टॉप-अप और अनलॉक इतिहास देखें",
    addCoinsBtn: "कॉइन जोड़ें",
    walletBalanceCardLabel: "उपलब्ध बैलेंस",
    totalPurchasedLabel: "कुल खरीदे गए",
    totalSpentLabel: "कुल खर्च",
    txHistoryTitle: "लेन-देन इतिहास",
    txEmpty: "अभी कोई लेन-देन नहीं",
  },
};

interface SeniorTutorContextType {
  scale: TextScale;
  setScale: (scale: TextScale) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isSpeaking: boolean;
  speak: (text: string) => void;
  toggleReadAloud: (summary?: string) => void;
  isAreaModalOpen: boolean;
  openAreaModal: () => void;
  closeAreaModal: () => void;
  currentArea: string;
  currentRadius: number;
  setAreaAndRadius: (area: string, radius: number) => void;
  isHelpModalOpen: boolean;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  feedbackMessage: string | null;
  showFeedback: (msg: string) => void;
  hideFeedback: () => void;
  t: (key: string) => string;
}

const SeniorTutorContext = createContext<SeniorTutorContextType | null>(null);

export function SeniorTutorProvider({
  children,
  initialArea = "Sangam Vihar, Delhi",
  initialRadius = 5,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialArea?: string;
  initialRadius?: number;
  initialLang?: Language;
}) {
  const [scale, setScaleState] = useState<TextScale>("normal");
  const [lang, setLangState] = useState<Language>(initialLang);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [currentArea, setCurrentArea] = useState(initialArea);
  const [currentRadius, setCurrentRadius] = useState(initialRadius);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Restore preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem("ath_senior_scale") as TextScale;
      if (savedScale && ["normal", "large", "xlarge"].includes(savedScale)) {
        setScaleState(savedScale);
        document.documentElement.classList.remove("scale-normal", "scale-large", "scale-xlarge");
        document.documentElement.classList.add(`scale-${savedScale}`);
      }
      const savedLang = localStorage.getItem("ath_senior_lang") as Language;
      if (savedLang && ["en", "hi"].includes(savedLang)) {
        setLangState(savedLang);
      }
      const savedRadius = localStorage.getItem("ath_senior_radius");
      if (savedRadius) {
        setCurrentRadius(Number(savedRadius) || 5);
      }
      const savedArea = localStorage.getItem("ath_senior_area");
      if (savedArea) {
        setCurrentArea(savedArea);
      }
    } catch { }
  }, []);

  const setScale = useCallback((newScale: TextScale) => {
    setScaleState(newScale);
    try {
      localStorage.setItem("ath_senior_scale", newScale);
      document.documentElement.classList.remove("scale-normal", "scale-large", "scale-xlarge");
      document.documentElement.classList.add(`scale-${newScale}`);
    } catch { }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("ath_senior_lang", newLang);
      document.cookie = `ath_senior_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLang;
    } catch { }
  }, []);

const speak = useCallback(
  (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.92;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  },
  [lang]
);

const toggleReadAloud = useCallback(
  (summaryText?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const defaultText =
      lang === "en"
        ? `Namaste Teacher Ji. Welcome to ApnaTutorHub. You are viewing student tuition inquiries near ${currentArea} within ${currentRadius} kilometers. Click any green button to view the parent's phone number.`
        : `नमस्ते शिक्षक जी। अपनाट्यूटरहब में आपका स्वागत है। आप ${currentArea} के पास ${currentRadius} किलोमीटर के दायरे में छात्रों के ट्यूशन अनुरोध देख रहे हैं। किसी भी छात्र के अभिभावक का फ़ोन नंबर देखने के लिए हरे बटन पर क्लिक करें।`;

    speak(summaryText || defaultText);
  },
  [isSpeaking, lang, currentArea, currentRadius, speak]
);

const openAreaModal = useCallback(() => setIsAreaModalOpen(true), []);
const closeAreaModal = useCallback(() => setIsAreaModalOpen(false), []);

const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
const closeHelpModal = useCallback(() => setIsHelpModalOpen(false), []);

  const setAreaAndRadius = useCallback((area: string, radius: number) => {
    setCurrentArea(area);
    setCurrentRadius(radius);
    try {
      localStorage.setItem("ath_senior_area", area);
      localStorage.setItem("ath_senior_radius", String(radius));
    } catch { }
  }, []);

const showFeedback = useCallback((msg: string) => {
  setFeedbackMessage(msg);
}, []);

const hideFeedback = useCallback(() => {
  setFeedbackMessage(null);
}, []);

const t = useCallback(
  (key: string): string => {
    return I18N_DICTIONARY[lang]?.[key] ?? I18N_DICTIONARY.en[key] ?? key;
  },
  [lang]
);

return (
  <SeniorTutorContext.Provider
    value={{
      scale,
      setScale,
      lang,
      setLang,
      isSpeaking,
      speak,
      toggleReadAloud,
      isAreaModalOpen,
      openAreaModal,
      closeAreaModal,
      currentArea,
      currentRadius,
      setAreaAndRadius,
      isHelpModalOpen,
      openHelpModal,
      closeHelpModal,
      feedbackMessage,
      showFeedback,
      hideFeedback,
      t,
    }}
  >
    {children}
  </SeniorTutorContext.Provider>
);
}

export function useSeniorTutor() {
  const ctx = useContext(SeniorTutorContext);
  if (!ctx) {
    return {
      scale: "normal" as TextScale,
      setScale: () => { },
      lang: "en" as Language,
      setLang: () => { },
      isSpeaking: false,
      speak: () => { },
      toggleReadAloud: () => { },
      isAreaModalOpen: false,
      openAreaModal: () => { },
      closeAreaModal: () => { },
      currentArea: "Delhi",
      currentRadius: 5,
      setAreaAndRadius: () => { },
      isHelpModalOpen: false,
      openHelpModal: () => { },
      closeHelpModal: () => { },
      feedbackMessage: null,
      showFeedback: () => { },
      hideFeedback: () => { },
      t: (key: string) => I18N_DICTIONARY.en[key] ?? key,
    };
  }
  return ctx;
}

export function translateClass(cls: string, lang: Language): string {
  if (!cls) return "";
  if (lang !== "hi") return cls;
  return cls
    .replace(/\bClass\b/gi, "कक्षा")
    .replace(/\bGrade\b/gi, "कक्षा")
    .replace(/\bStandard\b/gi, "कक्षा")
    .replace(/\bStd\b/gi, "कक्षा");
}

export function translateSubject(sub: string, lang: Language): string {
  if (!sub) return lang === "hi" ? "सभी विषय" : "All Subjects";
  let s = sub.trim();
  // Strip redundant "for Class 12", "for Grade X", "- Class X", "(Class X)", etc.
  s = s.replace(/\s*(?:for|-|\(|\/|–|—|,)?\s*(?:class|grade|std|standard)\s*(?:[0-9]{1,2}|[ivx]+)?\b/gi, "");
  s = s.replace(/\b(?:for|in|of)\s+class\s+[0-9]{1,2}\b/gi, "");
  s = s.replace(/\bclass\s+[0-9]{1,2}\b/gi, "");
  s = s.replace(/\s+(?:[0-9]{1,2}|[ivx]+)\s*(?:st|nd|rd|th)?\s*(?:grade|class|std)?$/i, "");
  s = s.replace(/\s+/g, " ").trim();

  if (lang !== "hi") return s || sub;

  const low = (s || sub).toLowerCase();
  if (low.includes("all subject")) return "सभी विषय";
  if (low === "mathematics" || low === "maths" || low === "math") return "गणित (Mathematics)";
  if (low === "science" || low === "general science") return "विज्ञान (Science)";
  if (low === "physics") return "भौतिक विज्ञान (Physics)";
  if (low === "chemistry") return "रसायन विज्ञान (Chemistry)";
  if (low === "biology") return "जीव विज्ञान (Biology)";
  if (low === "social studies" || low === "sst" || low === "social science") return "सामाजिक विज्ञान (SST)";
  if (low === "english") return "अंग्रेज़ी (English)";
  if (low === "hindi") return "हिंदी";
  if (low === "computer science" || low === "computer") return "कंप्यूटर साइंस";
  if (low === "accountancy" || low === "accounts") return "अकाउंटेंसी";
  if (low === "economics") return "अर्थशास्त्र (Economics)";
  if (low === "business studies") return "बिजनेस स्टडीज";
  return s || sub;
}

export function translateMode(mode: string, lang: Language): string {
  if (lang !== "hi") return mode === "ONLINE" ? "💻 Online Class" : "🏡 Home Tuition";
  return mode === "ONLINE" ? "💻 ऑनलाइन क्लास" : "🏡 होम ट्यूशन";
}

export function formatFeeDisplay(feeStr: string, lang: Language): string {
  if (!feeStr) return "";
  if (lang !== "hi") return feeStr;
  return feeStr
    .replace(/\/ ?hour\b/gi, "/ घंटा")
    .replace(/\/ ?hr\b/gi, "/घंटा")
    .replace(/\/ ?month\b/gi, "/ महीना")
    .replace(/\/ ?mo\b/gi, "/माह")
    .replace(/\bNegotiable\b/gi, "परस्पर विचारणीय");
}
