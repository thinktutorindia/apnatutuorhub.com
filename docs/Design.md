# ThinkTutor — Design System & UI Specifications


### Tailwind CSS v4 `globals.css` Setup
In Tailwind CSS v4, design tokens are configured directly in CSS using `@theme`:

```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #2563eb;
  --color-brand-primary-hover: #1d4ed8;
  --color-brand-accent: #f97316;
  --color-brand-accent-hover: #ea580c;

  --color-surface-bg: #f8fafc;
  --color-surface-card: #ffffff;
  --color-surface-border: #e2e8f0;

  --color-status-success: #16a34a;
  --color-status-warning: #d97706;
  --color-status-error: #dc2626;
  --color-status-info: #0284c7;

  --font-heading: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

### Palette Summary Table

| Category | Token | Hex Code | Usage |
|----------|-------|----------|-------|
| **Primary** | `brand-primary` | `#2563EB` | Main CTAs, navigation headers, primary buttons |
| **Primary Hover** | `brand-primary-hover` | `#1D4ED8` | Hover state for primary buttons |
| **Accent** | `brand-accent` | `#F97316` | Wallet coins, feature highlights, "Post Requirement" CTA |
| **Success** | `status-success` | `#16A34A` | Verified badges, completed bookings, success toasts |
| **Warning** | `status-warning` | `#D97706` | Pending KYC, low coin warning, pending bookings |
| **Error** | `status-error` | `#DC2626` | Rejected status, form errors, destructive actions |
| **Background** | `surface-bg` | `#F8FAFC` | App-wide background canvas |
| **Card Surface** | `surface-card` | `#FFFFFF` | Dashboard cards, modals, table rows |

---

## 3. Typography

- **Headings**: Plus Jakarta Sans (600, 700, 800)
- **Body & Controls**: Inter (400, 500, 600)
- **Monospace & Numbers**: JetBrains Mono (400)

---

## 4. UI Components & Tokens (shadcn/ui + React 19)

### Buttons
- **Primary**: `bg-brand-primary text-white hover:bg-brand-primary-hover rounded-lg px-5 py-2.5 font-semibold transition-all`
- **Accent / CTA**: `bg-brand-accent text-white hover:bg-brand-accent-hover rounded-lg px-5 py-2.5 font-semibold shadow-md`
- **Secondary**: `bg-white text-brand-primary border border-brand-primary hover:bg-blue-50 rounded-lg px-4 py-2`

### Status Chips & Badges
- **Verified Badge**: `bg-green-100 text-green-800 border border-green-200 rounded-full px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1`
- **Pending Badge**: `bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3 py-0.5 text-xs font-semibold`
- **Active Lead Badge**: `bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-3 py-0.5 text-xs font-semibold`

### Cards & Surfaces
- `bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`

---

## 5. Icons & Motion

- **Icon Set**: Lucide React (`lucide-react`)
- **Animations**: Tailwind native transitions (`transition-all duration-200 ease-in-out`)
- **Micro-Interactions**: Hover lift on cards (`hover:-translate-y-0.5`), scale down on button press (`active:scale-95`)
