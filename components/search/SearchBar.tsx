"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchAutocompleteAction } from "@/app/actions/search.actions";
import { SearchSuggestions } from "./SearchSuggestions";
import type { AutocompleteResult } from "@/lib/search/types";

type Props = {
  initialQuery?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
};

export function SearchBar({
  initialQuery = "",
  placeholder = "Search tutors by subject, city, class...",
  onSearch,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<AutocompleteResult>({
    query: "",
    suggestions: [],
    tutors: [],
    leads: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setSuggestions({ query: "", suggestions: [], tutors: [], leads: [] });
        return;
      }
      setIsLoading(true);
      const res = await searchAutocompleteAction(query);
      if (res.success && res.data) {
        setSuggestions(res.data);
      }
      setIsLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearch(query);
  };

  const handleSelectSuggestion = (term: string) => {
    setQuery(term);
    setIsOpen(false);
    onSearch(term);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pointer-events-none absolute left-4 text-slate-400">
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-[#22C55E]" />
          ) : (
            <Search size={18} />
          )}
        </div>

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="neu-input w-full py-3.5 pl-11 pr-10 text-sm font-semibold text-[#0F172A] placeholder:text-slate-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSearch("");
            }}
            className="absolute right-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {isOpen && (
        <SearchSuggestions
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
      )}
    </div>
  );
}
