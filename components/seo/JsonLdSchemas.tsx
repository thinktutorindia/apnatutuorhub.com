import React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://apnatutorhub.com";

export function HomepageJsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ApnaTutorHub",
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/find-tutor?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "ApnaTutorHub",
    url: APP_URL,
    logo: `${APP_URL}/icons/icon-192x192.svg`,
    description:
      "India's leading platform matching parents and students with 100% background-checked home and online tutors based on location distance, subjects, and budget.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressLocality: "New Delhi",
      addressRegion: "Delhi",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-6230789155",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [
      "https://facebook.com/apnatutorhub",
      "https://twitter.com/apnatutorhub",
      "https://instagram.com/apnatutorhub",
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Tutor Matching & Home Tuition Marketplace",
    provider: {
      "@type": "EducationalOrganization",
      name: "ApnaTutorHub",
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    description:
      "Find verified home tutors and online tutors near you for Class 1-12, CBSE, ICSE, IB, State Boards, Mathematics, Science, Physics, Chemistry, JEE & NEET.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tuition Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Home Tuition Services",
            description: "In-person personalized home tutoring by nearby verified tutors.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Online Interactive Tuition",
            description: "Live 1-on-1 online classes via video with interactive whiteboard.",
          },
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find a home tutor near me on ApnaTutorHub?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Simply post your learning requirement on ApnaTutorHub with your subject, class level, and location pin. Our AI matching algorithm instantly alerts nearby background-checked tutors within your selected radius.",
        },
      },
      {
        "@type": "Question",
        name: "Are tutors on ApnaTutorHub verified?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All verified tutors undergo mandatory Government ID (Aadhaar/PAN) verification, address proof check, and qualifications review by our compliance team before receiving the Verified Tutor badge.",
        },
      },
      {
        "@type": "Question",
        name: "What subjects and class levels are covered?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We cover all subjects from Primary Class 1 up to Senior Secondary Class 12 (Mathematics, Science, Physics, Chemistry, Biology, Commerce, English), CBSE, ICSE, State Boards, and competitive exams like JEE Mains, NEET, and Olympiads.",
        },
      },
      {
        "@type": "Question",
        name: "Is posting a tuition requirement free for parents?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Posting tuition requirements and viewing tutor profile proposals on ApnaTutorHub is 100% free for parents and students.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
