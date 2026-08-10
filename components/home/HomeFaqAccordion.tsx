"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface HomeFaqAccordionProps {
  items: FAQItem[];
}

export function HomeFaqAccordion({ items }: HomeFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.q}
            className={`bg-white rounded-2xl border transition-all overflow-hidden ${
              isOpen ? "border-[#0F2540] shadow-md ring-1 ring-[#0F2540]/20" : "border-gray-300"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer gap-4 hover:bg-gray-50/80"
            >
              <span className="font-800 text-base text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                {item.q}
              </span>
              <ChevronDown
                size={20}
                className={`shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180 text-[#0F2540]" : "text-gray-600"
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5 pt-2 text-sm text-gray-900 font-600 leading-relaxed border-t border-gray-200">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
