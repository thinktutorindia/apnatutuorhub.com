import * as fs from "fs";
import { assemble4kTargetPool, type PreparedLeadTarget } from "./broadcast_4k_geo_leads";
import { prisma } from "../lib/prisma";

async function generateHtmlPreview() {
  console.log("Generating 4,000 Geo-Lead Broadcast HTML Inspector...");

  const pool: PreparedLeadTarget[] = await assemble4kTargetPool();
  console.log(`Loaded ${pool.length} tutors for inspection.`);

  // Prepare lightweight inspection entries
  const entries = pool.map((t, idx) => {
    const isTill8 = Boolean(t.classLevel.match(/\b([1-8])\b/));
    const waText = `[Tuition Enquiry #${t.inquiryCode}]\nClient: ${t.clientName}\nClass: ${t.classLevel} (${t.subjects.join(", ")})\nMode: ${t.mode}\nLocation: ${t.location}\nBudget: ${t.budgetFormatted}\nPreference: ${t.preference}\n\n👉 View & Unlock: ${t.actionUrl}`;
    const emailSubject = `🎯 New Tuition Requirement #${t.inquiryCode} in ${t.location} — ApnaTutorHub`;

    return {
      index: idx + 1,
      inquiryCode: t.inquiryCode,
      tutorUserId: t.tutorUserId || null,
      name: t.name,
      phone: t.normalizedPhone ? `+${t.normalizedPhone}` : null,
      rawPhone: t.phone,
      email: t.email || null,
      classLevel: t.classLevel,
      subjects: t.subjects,
      mode: t.mode,
      location: t.location,
      distanceKm: t.distanceKm,
      budget: t.budgetFormatted,
      timing: t.timing,
      clientName: t.clientName,
      preference: t.preference,
      isTill8,
      waText,
      emailSubject,
    };
  });

  const totalWhatsApp = entries.filter((e) => e.phone).length;
  const totalEmails = entries.filter((e) => e.email).length;
  const totalInApp = entries.filter((e) => e.tutorUserId).length;
  const totalTill8 = entries.filter((e) => e.isTill8).length;
  const totalUpper = entries.length - totalTill8;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>4,000 Geo-Lead Broadcast Inspector | ApnaTutorHub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-amber: #f59e0b;
      --accent-purple: #8b5cf6;
      --whatsapp-green: #25D366;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding-bottom: 60px;
    }
    .header {
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0) 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 24px 32px;
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      max-width: 1440px;
      margin: 0 auto;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    h1 { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      max-width: 1440px;
      margin: 20px auto 0;
    }
    .stat-pill {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 16px;
      transition: all 0.2s ease;
    }
    .stat-pill:hover { border-color: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; }
    .stat-val { font-size: 20px; font-weight: 700; color: #fff; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
    .stat-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .badge-purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

    .main-container {
      max-width: 1440px;
      margin: 24px auto 0;
      padding: 0 32px;
    }

    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px 18px;
    }
    .search-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 16px;
      color: #fff;
      font-size: 14px;
      width: 320px;
      outline: none;
      transition: border 0.2s;
    }
    .search-input:focus { border-color: var(--accent-green); }
    .filter-btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.4);
    }

    .list-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .entry-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 18px 22px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .entry-card:hover {
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .entry-card.is-abdullah {
      border: 2px solid #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 24, 38, 0.95) 100%);
    }

    .entry-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .tutor-info { display: flex; align-items: center; gap: 12px; }
    .index-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.07);
      padding: 4px 8px;
      border-radius: 6px;
      color: var(--text-muted);
    }
    .tutor-name { font-size: 16px; font-weight: 700; color: #fff; }
    .special-star {
      background: #10b981;
      color: #000;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .contact-item { display: flex; align-items: center; gap: 4px; }
    .contact-active { color: #34d399; }
    .contact-inactive { color: #64748b; }

    .lead-specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .spec-item { display: flex; flex-direction: column; gap: 2px; }
    .spec-title { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
    .spec-value { font-size: 13px; font-weight: 600; color: #fff; }
    .highlight-budget { color: #34d399; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .highlight-dist { color: #60a5fa; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

    .preview-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 12px;
    }
    @media (max-width: 900px) {
      .preview-split { grid-template-columns: 1fr; }
    }

    /* WhatsApp Card Mockup */
    .wa-mockup {
      background: #0b141a;
      border: 1px solid rgba(37, 211, 102, 0.2);
      border-radius: 10px;
      padding: 14px 16px;
      position: relative;
    }
    .wa-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .wa-icon { color: var(--whatsapp-green); font-size: 14px; font-weight: 700; }
    .wa-title { font-size: 12px; font-weight: 700; color: #e9edef; }
    .wa-bubble {
      background: #1f2c34;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12.5px;
      line-height: 1.55;
      color: #e9edef;
      white-space: pre-wrap;
      font-family: inherit;
    }

    /* Email Card Mockup */
    .email-mockup {
      background: #111827;
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .email-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .email-icon { color: #60a5fa; font-size: 14px; font-weight: 700; }
    .email-subject { font-size: 12px; font-weight: 600; color: #93c5fd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .email-box {
      background: #1f2937;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12.5px;
      line-height: 1.55;
      color: #e5e7eb;
    }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding: 14px 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
    }
    .pagination-nav-group {
      display: flex;
      gap: 10px;
    }
    .page-btn {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-info { font-size: 13px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }

    .header-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* ── Mobile Responsive Breakpoints ── */
    @media (max-width: 768px) {
      .header {
        padding: 16px 14px;
      }
      .header-top {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      h1 {
        font-size: 16.5px;
      }
      .subtitle {
        font-size: 11.5px;
      }
      .header-badges {
        margin-top: 4px;
      }
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 14px;
      }
      .stat-pill {
        padding: 10px 12px;
      }
      .stat-val {
        font-size: 16px;
      }
      .stat-label {
        font-size: 10px;
      }
      .main-container {
        padding: 0 12px;
        margin-top: 14px;
      }
      .controls-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px;
      }
      .search-input {
        width: 100%;
        font-size: 13px;
        padding: 9px 12px;
      }
      .filter-btn-group {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .filter-btn {
        flex: 1 1 calc(50% - 6px);
        text-align: center;
        padding: 7px 8px;
        font-size: 11px;
      }
      .entry-card {
        padding: 14px 12px;
      }
      .tutor-name {
        font-size: 14.5px;
      }
      .contact-row {
        flex-wrap: wrap;
        gap: 6px;
        font-size: 11px;
      }
      .lead-specs-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        padding: 10px;
      }
      .spec-title {
        font-size: 10px;
      }
      .spec-value {
        font-size: 12px;
      }
      .preview-split {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .wa-bubble, .email-box {
        font-size: 11.5px;
        padding: 10px;
        word-break: break-word;
      }
      .pagination-bar {
        flex-direction: column-reverse;
        gap: 12px;
        text-align: center;
        padding: 12px;
      }
      .pagination-nav-group {
        width: 100%;
      }
      .page-btn {
        flex: 1;
        padding: 10px;
        font-size: 12px;
        text-align: center;
      }
    }

    @media (max-width: 480px) {
      .stats-row {
        grid-template-columns: 1fr 1fr;
      }
      .lead-specs-grid {
        grid-template-columns: 1fr;
      }
      .logo-icon {
        width: 32px;
        height: 32px;
        font-size: 15px;
      }
      h1 {
        font-size: 15px;
      }
      .filter-btn {
        flex: 1 1 100%;
      }
    }
  </style>
</head>
<body>

  <!-- Sticky Header -->
  <div class="header">
    <div class="header-top">
      <div class="logo-badge">
        <div class="logo-icon">🎯</div>
        <div>
          <h1>4,000 Geo-Lead Broadcast Inspector</h1>
          <div class="subtitle">Complete Multi-Channel Verification · Email, WhatsApp & Web Push Ready</div>
        </div>
      </div>
      <div class="header-badges">
        <span class="stat-badge badge-green">Strict 5km Radius Enforced</span>
        <span class="stat-badge badge-blue">Class 1-8 Offline Monthly Enforced</span>
        <span class="stat-badge badge-purple">Class 9+ Hourly Enforced</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-pill">
        <div class="stat-label">Total Recipients</div>
        <div class="stat-val">${entries.length.toLocaleString()}</div>
      </div>
      <div class="stat-pill">
        <div class="stat-label">📱 WhatsApp Queue</div>
        <div class="stat-val" style="color: var(--whatsapp-green);">${totalWhatsApp.toLocaleString()}</div>
      </div>
      <div class="stat-pill">
        <div class="stat-label">✉️ Email Queue</div>
        <div class="stat-val" style="color: #60a5fa;">${totalEmails.toLocaleString()}</div>
      </div>
      <div class="stat-pill">
        <div class="stat-label">🔔 In-App / Push</div>
        <div class="stat-val" style="color: #a78bfa;">${totalInApp.toLocaleString()}</div>
      </div>
      <div class="stat-pill">
        <div class="stat-label">Class 1–8 (Offline)</div>
        <div class="stat-val" style="color: #fbbf24;">${totalTill8.toLocaleString()}</div>
      </div>
      <div class="stat-pill">
        <div class="stat-label">Class 9+ (Hourly)</div>
        <div class="stat-val" style="color: #38bdf8;">${totalUpper.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <!-- Main Container -->
  <div class="main-container">

    <!-- Controls Bar -->
    <div class="controls-bar">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search by Tutor, Phone, Locality, Subject..." oninput="handleSearch()">
      
      <div class="filter-btn-group">
        <button class="filter-btn active" onclick="setFilter('all', this)">All (4,000)</button>
        <button class="filter-btn" onclick="setFilter('abdullah', this)">⭐ Abdullah Sheikh (#1)</button>
        <button class="filter-btn" onclick="setFilter('till8', this)">Class 1–8 (Offline Monthly)</button>
        <button class="filter-btn" onclick="setFilter('upper', this)">Class 9+ (Hourly)</button>
        <button class="filter-btn" onclick="setFilter('email', this)">Has Email (${totalEmails})</button>
        <button class="filter-btn" onclick="setFilter('inapp', this)">Platform Account (${totalInApp})</button>
      </div>
    </div>

    <!-- Entries List -->
    <div id="entriesList" class="list-wrapper"></div>

    <!-- Pagination Bar -->
    <div class="pagination-bar">
      <div id="pageInfo" class="page-info">Showing 1 - 50 of 4,000</div>
      <div class="pagination-nav-group">
        <button id="prevBtn" class="page-btn" onclick="prevPage()">← Previous 50</button>
        <button id="nextBtn" class="page-btn" onclick="nextPage()">Next 50 →</button>
      </div>
    </div>

  </div>

  <!-- Inlined JSON Data -->
  <script>
    const BROADCAST_DATA = ${JSON.stringify(entries)};
    let filteredData = [...BROADCAST_DATA];
    let currentPage = 1;
    const PAGE_SIZE = 50;
    let currentFilter = 'all';

    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      applyFilters();
    }

    function handleSearch() {
      applyFilters();
    }

    function applyFilters() {
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      
      filteredData = BROADCAST_DATA.filter(item => {
        // Tab Filter
        if (currentFilter === 'abdullah') {
          if (!item.name.toLowerCase().includes('abdullah') && item.index !== 1) return false;
        } else if (currentFilter === 'till8') {
          if (!item.isTill8) return false;
        } else if (currentFilter === 'upper') {
          if (item.isTill8) return false;
        } else if (currentFilter === 'email') {
          if (!item.email) return false;
        } else if (currentFilter === 'inapp') {
          if (!item.tutorUserId) return false;
        }

        // Search Query
        if (query) {
          const matchName = item.name.toLowerCase().includes(query);
          const matchPhone = item.phone && item.phone.includes(query);
          const matchEmail = item.email && item.email.toLowerCase().includes(query);
          const matchLoc = item.location.toLowerCase().includes(query);
          const matchSub = item.subjects.some(s => s.toLowerCase().includes(query));
          const matchInq = item.inquiryCode.includes(query);
          return matchName || matchPhone || matchEmail || matchLoc || matchSub || matchInq;
        }

        return true;
      });

      currentPage = 1;
      render();
    }

    function render() {
      const container = document.getElementById('entriesList');
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const slice = filteredData.slice(start, end);

      document.getElementById('pageInfo').innerText = \`Showing \${filteredData.length === 0 ? 0 : start + 1} - \${Math.min(end, filteredData.length)} of \${filteredData.length.toLocaleString()}\`;
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = end >= filteredData.length;

      if (slice.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 48px; color: var(--text-muted); background: var(--card-bg); border-radius: 12px;">No matching records found.</div>\`;
        return;
      }

      container.innerHTML = slice.map(item => {
        const isAbdullah = item.name.toLowerCase().includes('abdullah') || item.index === 1;
        return \`
          <div class="entry-card \${isAbdullah ? 'is-abdullah' : ''}">
            <div class="entry-top">
              <div>
                <div class="tutor-info">
                  <span class="index-badge">#\${item.index}</span>
                  <span class="tutor-name">\${item.name}</span>
                  \${isAbdullah ? '<span class="special-star">⭐ GUARANTEED TARGET #1</span>' : ''}
                </div>
                <div class="contact-row">
                  <span class="contact-item \${item.phone ? 'contact-active' : 'contact-inactive'}">
                    📱 \${item.phone || 'No WhatsApp'}
                  </span>
                  <span>•</span>
                  <span class="contact-item \${item.email ? 'contact-active' : 'contact-inactive'}">
                    ✉️ \${item.email || 'No Genuine Email'}
                  </span>
                  <span>•</span>
                  <span class="contact-item \${item.tutorUserId ? 'contact-active' : 'contact-inactive'}">
                    🔔 \${item.tutorUserId ? 'In-App Active' : 'Imported Pool'}
                  </span>
                </div>
              </div>

              <div>
                <span class="stat-badge \${item.isTill8 ? 'badge-amber' : 'badge-purple'}">
                  \${item.isTill8 ? 'Class 1–8: OFFLINE MONTHLY' : 'Class 9+: HOURLY'}
                </span>
                <span class="stat-badge badge-green">Rule Verified ✓</span>
              </div>
            </div>

            <!-- Lead Specs Grid -->
            <div class="lead-specs-grid">
              <div class="spec-item">
                <span class="spec-title">Requirement</span>
                <span class="spec-value">\${item.classLevel} · \${item.subjects.join(', ')}</span>
              </div>
              <div class="spec-item">
                <span class="spec-title">Mode</span>
                <span class="spec-value">\${item.mode}</span>
              </div>
              <div class="spec-item">
                <span class="spec-title">Budget (Exact)</span>
                <span class="spec-value highlight-budget">\${item.budget}</span>
              </div>
              <div class="spec-item">
                <span class="spec-title">Locality (< 5km Strict)</span>
                <span class="spec-value">\${item.location}</span>
              </div>
              <div class="spec-item">
                <span class="spec-title">Distance</span>
                <span class="spec-value highlight-dist">\${item.distanceKm} km</span>
              </div>
            </div>

            <!-- Preview Split: WhatsApp & Email -->
            <div class="preview-split">
              <!-- WhatsApp Preview -->
              <div class="wa-mockup">
                <div class="wa-header">
                  <span class="wa-icon">WA</span>
                  <span class="wa-title">WhatsApp Notification (to \${item.phone || 'N/A'})</span>
                </div>
                <div class="wa-bubble">\${escapeHtml(item.waText)}</div>
              </div>

              <!-- Email Preview -->
              <div class="email-mockup">
                <div class="email-header">
                  <span class="email-icon">MAIL</span>
                  <span class="email-subject">\${escapeHtml(item.emailSubject)}</span>
                </div>
                <div class="email-box">
                  <div><strong>To:</strong> \${item.email || 'N/A'}</div>
                  <div style="margin-top: 6px;"><strong>Student / Client:</strong> \${item.clientName}</div>
                  <div><strong>Teaching Mode:</strong> \${item.mode}</div>
                  <div><strong>Offered Budget:</strong> \${item.budget}</div>
                  <div><strong>Preferred Schedule:</strong> \${item.timing}</div>
                  <div><strong>Location:</strong> \${item.location} (\${item.distanceKm} km away)</div>
                  <div style="margin-top: 8px; color: #60a5fa; font-weight: 600;">Button: [View & Unlock Lead (\${item.classLevel})]</div>
                </div>
              </div>
            </div>

          </div>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        render();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    }

    function nextPage() {
      const maxPage = Math.ceil(filteredData.length / PAGE_SIZE);
      if (currentPage < maxPage) {
        currentPage++;
        render();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    }

    // Initial render
    render();
  </script>
</body>
</html>`;

  const outputPath = "public/broadcast-preview.html";
  fs.writeFileSync(outputPath, htmlContent, "utf8");
  console.log(`✅ Successfully generated HTML preview page: ${outputPath}`);
  console.log(`File size: ${(Buffer.byteLength(htmlContent, "utf8") / 1024).toFixed(1)} KB`);
}

generateHtmlPreview()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
