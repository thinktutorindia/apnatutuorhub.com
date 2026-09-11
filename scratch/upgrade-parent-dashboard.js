const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('datauploadrawdata/today_parents_dashboard_upload.html');
const destPublicPath = path.resolve('public/today_parents_dashboard_upload.html');

console.log("Reading source file:", srcPath);
let html = fs.readFileSync(srcPath, 'utf8');

// 1. Fix CSS for Android scrollability & touch performance
const oldHtmlBodyCss = `    html, body {
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      background-color: var(--bg-slate);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }`;

const newHtmlBodyCss = `    html {
      width: 100%;
      height: 100%;
      overflow-y: scroll;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    body {
      width: 100%;
      min-height: 100%;
      overflow-x: hidden;
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
      background-color: var(--bg-slate);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }`;

if (html.includes(oldHtmlBodyCss)) {
  html = html.replace(oldHtmlBodyCss, newHtmlBodyCss);
  console.log("Replaced html, body CSS for Android scroll fix.");
} else {
  console.warn("oldHtmlBodyCss exact string not found.");
}

// 2. Add Extra Styles for Android, Pagination, Floating Button, Edit Modal, and Badges
const extraStyles = `
    /* Android Mobile Scrolling Engine & Container Overrides */
    .dashboard-shell {
      overflow: visible !important;
    }
    .table-container {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      touch-action: pan-x pan-y !important;
      max-height: none !important;
    }
    .cards-grid {
      overflow: visible !important;
    }

    /* Floating Back to Top */
    .btn-floating-top {
      position: fixed;
      bottom: 24px;
      right: 20px;
      background: #0F2540;
      color: #FFFFFF;
      border: 2px solid rgba(255,255,255,0.25);
      width: 46px;
      height: 46px;
      border-radius: 50%;
      box-shadow: 0 10px 25px rgba(15, 37, 64, 0.4);
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      z-index: 999;
      transition: transform 0.15s ease, opacity 0.2s ease;
      touch-action: manipulation;
    }
    .btn-floating-top:active {
      transform: scale(0.92);
    }
    .btn-floating-top.show {
      display: flex;
    }

    /* Staff Edit Buttons & Badges */
    .action-btn-edit {
      background: #0F2540;
      color: #FFFFFF;
      padding: 7px 11px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 36px;
      transition: background-color 0.15s;
      touch-action: manipulation;
    }
    .action-btn-edit:hover {
      background: #173B66;
    }
    .action-btn-edit:active {
      transform: scale(0.97);
    }

    .badge-edited {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Staff Summary Strip */
    .staff-sync-strip {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12.5px;
      color: #1E40AF;
      font-weight: 600;
    }
    .staff-sync-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #FAFBFD;
      border-top: 1px solid var(--border-color);
      align-items: center;
      justify-content: space-between;
    }
    @media (min-width: 640px) {
      .pagination-bar {
        flex-direction: row;
      }
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--border-color);
      background: #FFFFFF;
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      touch-action: manipulation;
      min-height: 38px;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-btn:hover:not(:disabled) {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }
    .page-indicator {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      padding: 0 4px;
    }

    /* Quick Edit Modal */
    .edit-modal-box {
      background: #FFFFFF;
      width: 100%;
      max-width: 600px;
      max-height: 88vh;
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .chip-btn {
      padding: 5px 10px;
      border-radius: 9999px;
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      color: #334155;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }
    .chip-btn:hover, .chip-btn:active {
      background: #E2E8F0;
      border-color: #94A3B8;
      color: #0F172A;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1.5px solid #CBD5E1;
      font-size: 14px;
      outline: none;
      color: #0F172A;
      background: #FAFCFE;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-input:focus {
      border-color: #1E4E8C;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(30, 78, 140, 0.12);
    }
    .context-hint {
      font-size: 11.5px;
      color: #64748B;
      background: #F1F5F9;
      padding: 7px 10px;
      border-radius: 8px;
      line-height: 1.4;
      border-left: 3px solid #3B82F6;
    }
`;

// Insert extraStyles before </style>
html = html.replace('  </style>', extraStyles + '\n  </style>');
console.log("Injected extra styles.");

// 3. Update Header Actions to include Download Updated HTML & Reset
const oldHeaderActions = `<div class="header-actions">
      <button class="btn btn-emerald" onclick="downloadCSV()">
        📥 Export CSV (513)
      </button>
      <button class="btn btn-glass" onclick="downloadJSON()">
        📦 Download JSON
      </button>
      <button class="btn btn-glass" onclick="copyUploadPayload()">
        📋 Copy Payload
      </button>
      <button class="btn btn-glass" onclick="window.print()">
        🖨️ Print / PDF
      </button>
    </div>`;

const newHeaderActions = `<div class="header-actions">
      <button class="btn btn-emerald" onclick="downloadUpdatedHTML()" title="Download fully updated HTML file with staff edits baked in">
        💾 Download Updated HTML
      </button>
      <button class="btn btn-glass" onclick="downloadCSV()" title="Export CSV containing all updated leads">
        📥 Export Updated CSV
      </button>
      <button class="btn btn-glass" onclick="downloadJSON()" title="Export updated JSON array">
        📦 Export JSON
      </button>
      <button class="btn btn-glass" onclick="copyUploadPayload()">
        📋 Copy Payload
      </button>
      <button class="btn btn-glass" onclick="window.print()">
        🖨️ Print / PDF
      </button>
    </div>`;

if (html.includes(oldHeaderActions)) {
  html = html.replace(oldHeaderActions, newHeaderActions);
  console.log("Updated header action buttons.");
}

// 4. Update Filter Panel with: Delhi NCR Only filter, Subject filter, Edit Status filter, Page Size filter
const oldSelectGroup = `      <div class="select-group">
        <select id="gradeFilter" class="filter-select" onchange="onFilterChange()">
          <option value="">All Grades</option>
          <option value="Pre-Primary">Pre-Primary (KG, Nursery)</option>
          <option value="Class 1st">Class 1st</option>
          <option value="Class 2nd">Class 2nd</option>
          <option value="Class 3rd">Class 3rd</option>
          <option value="Class 4th">Class 4th</option>
          <option value="Class 5th">Class 5th</option>
          <option value="Class 6th">Class 6th</option>
          <option value="Class 7th">Class 7th</option>
          <option value="Class 8th">Class 8th</option>
          <option value="Class 9th">Class 9th</option>
          <option value="Class 10th">Class 10th</option>
          <option value="Class 11th">Class 11th</option>
          <option value="Class 12th">Class 12th</option>
        </select>

        <select id="locFilter" class="filter-select" onchange="onFilterChange()">
          <option value="">All Areas</option>
          <option value="Model Town">Model Town / GTB Nagar</option>
          <option value="Rohini">Rohini</option>
          <option value="Pitampura">Pitampura</option>
          <option value="Ashok Vihar">Ashok Vihar</option>
          <option value="Dwarka">Dwarka</option>
          <option value="Paschim Vihar">Paschim Vihar</option>
          <option value="Noida">Noida & Gr. Noida</option>
          <option value="Gurugram">Gurugram</option>
          <option value="Faridabad">Faridabad</option>
          <option value="Karol Bagh">Karol Bagh / Central</option>
          <option value="Laxmi Nagar">Laxmi Nagar / East</option>
          <option value="Saket">Saket / South Delhi</option>
        </select>

        <select id="genderFilter" class="filter-select" onchange="onFilterChange()">
          <option value="">Tutor Gender</option>
          <option value="FEMALE">Female Only</option>
          <option value="MALE">Male Preferred</option>
          <option value="ANY">Any Tutor</option>
        </select>

        <select id="budgetFilter" class="filter-select" onchange="onFilterChange()">
          <option value="">Budget Filter</option>
          <option value="has_budget">Stated Budget Only</option>
          <option value="negotiable">Standard / Negotiable</option>
        </select>
      </div>`;

const newSelectGroup = `      <div class="select-group" style="display: flex; flex-wrap: wrap; gap: 8px;">
        <select id="locFilter" class="filter-select" onchange="onFilterChange()" style="font-weight: 700; color: #0F2540;">
          <option value="">📍 All Locations (513)</option>
          <option value="DELHI_NCR_ONLY">🎯 Delhi NCR Only (All Delhi/NCR)</option>
          <option value="GENERIC_DELHI_NCR">⚠️ Generic "Delhi / NCR" (Need Specific Area)</option>
          <option value="OUTSIDE_DELHI_NCR">🌍 Outside Delhi NCR (Mumbai, Pune, etc.)</option>
          <optgroup label="── Delhi NCR Zones ──">
            <option value="North Delhi">North Delhi (Model Town, Rohini, Pitampura, Burari)</option>
            <option value="South Delhi">South Delhi (Saket, GK, Kalkaji, Okhla)</option>
            <option value="West Delhi">West Delhi (Dwarka, Paschim Vihar, Janakpuri)</option>
            <option value="Central Delhi">Central Delhi (Karol Bagh, Daryaganj)</option>
            <option value="East Delhi">East Delhi (Laxmi Nagar, Mayur Vihar)</option>
            <option value="Noida">Noida & Greater Noida</option>
            <option value="Gurugram">Gurugram (Gurgaon)</option>
            <option value="Faridabad">Faridabad</option>
            <option value="Ghaziabad">Ghaziabad</option>
          </optgroup>
          <optgroup label="── Specific Localities ──">
            <option value="Model Town">Model Town / GTB Nagar</option>
            <option value="Rohini">Rohini</option>
            <option value="Pitampura">Pitampura</option>
            <option value="Ashok Vihar">Ashok Vihar</option>
            <option value="Dwarka">Dwarka</option>
            <option value="Paschim Vihar">Paschim Vihar</option>
            <option value="Kamla Nagar">Kamla Nagar</option>
            <option value="Saket">Saket</option>
          </optgroup>
        </select>

        <select id="subjectFilter" class="filter-select" onchange="onFilterChange()" style="font-weight: 700;">
          <option value="">📚 All Subjects</option>
          <option value="ALL_CORE">All Core Subjects (Class 1-8)</option>
          <option value="MATH">Mathematics / Maths Focus</option>
          <option value="SCIENCE">Science (Physics, Chemistry, Bio)</option>
          <option value="ENGLISH">English / Grammar Focus</option>
          <option value="COMMERCE">Commerce (Accounts, Economics, BST)</option>
          <option value="LANGUAGES">Foreign Languages (French, Spanish)</option>
          <option value="HINDI_SANSKRIT">Hindi / Sanskrit</option>
          <option value="SST">Social Studies (SST)</option>
          <option value="SPECIAL">Special Educator / Shadow Teacher</option>
          <option value="MUSIC_ARTS">Music / Dance / Arts</option>
        </select>

        <select id="gradeFilter" class="filter-select" onchange="onFilterChange()">
          <option value="">🎓 All Grades</option>
          <option value="Pre-Primary">Pre-Primary (KG, Nursery)</option>
          <option value="Class 1st">Class 1st</option>
          <option value="Class 2nd">Class 2nd</option>
          <option value="Class 3rd">Class 3rd</option>
          <option value="Class 4th">Class 4th</option>
          <option value="Class 5th">Class 5th</option>
          <option value="Class 6th">Class 6th</option>
          <option value="Class 7th">Class 7th</option>
          <option value="Class 8th">Class 8th</option>
          <option value="Class 9th">Class 9th</option>
          <option value="Class 10th">Class 10th</option>
          <option value="Class 11th">Class 11th</option>
          <option value="Class 12th">Class 12th</option>
        </select>

        <select id="editStatusFilter" class="filter-select" onchange="onFilterChange()">
          <option value="ALL">✏️ All Edit Status</option>
          <option value="EDITED">✅ Edited by Staff Only</option>
          <option value="UNEDITED">⚪ Unedited Only</option>
        </select>

        <select id="pageSizeFilter" class="filter-select" onchange="onPageSizeChange()">
          <option value="25">📱 Show 25 / page (Android Fast)</option>
          <option value="50" selected>⚡ Show 50 / page (Standard)</option>
          <option value="100">📑 Show 100 / page</option>
          <option value="ALL">🌐 Show All 513 Leads</option>
        </select>
      </div>`;

if (html.includes(oldSelectGroup)) {
  html = html.replace(oldSelectGroup, newSelectGroup);
  console.log("Updated select filter group with Location & Subject & Page filters.");
}

// 5. Add Staff Sync Strip above Dashboard Shell
const oldShellStart = '  <!-- Dashboard Shell -->\n  <div class="dashboard-shell">';
const newShellStart = `  <!-- Staff Status & Sync Bar -->
  <div class="staff-sync-strip" id="staffSyncStrip">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>✏️ Staff Editor:</span>
      <span id="editedCounterBadge" style="background: white; padding: 2px 8px; border-radius: 9999px; border: 1px solid #BFDBFE; font-weight: 800; color: #1E40AF;">0 Leads Edited</span>
      <span style="color: #64748B; font-size: 11.5px;">(Auto-saved in browser)</span>
    </div>
    <div class="staff-sync-actions">
      <button class="btn btn-emerald" style="padding: 6px 12px; font-size: 11.5px;" onclick="downloadUpdatedHTML()">
        💾 Download Updated HTML
      </button>
      <button class="btn" style="padding: 6px 10px; font-size: 11.5px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #DC2626;" onclick="resetAllStaffEdits()">
        🔄 Reset Edits
      </button>
    </div>
  </div>

  <!-- Dashboard Shell -->
  <div class="dashboard-shell">`;

if (html.includes(oldShellStart)) {
  html = html.replace(oldShellStart, newShellStart);
  console.log("Injected Staff Status & Sync Strip.");
}

// 6. Add Quick Edit Modal HTML and Floating Top Button
const editModalHtml = `
<!-- Quick Edit Modal for Staff -->
<div id="quickEditModal" class="modal-overlay">
  <div class="edit-modal-box">
    <div class="modal-head">
      <div>
        <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>✏️ Quick Edit Lead</span>
          <span id="editModalLeadId" class="card-id-badge" style="font-size: 12px;"></span>
        </div>
        <div id="editModalPhone" style="font-size: 13px; font-weight: 700; color: #059669; margin-top: 2px;"></div>
      </div>
      <button class="modal-close-btn" onclick="closeEditModal()">✕</button>
    </div>

    <!-- Original Address Context Clues -->
    <div class="context-hint">
      <strong>📍 Raw Parent Address / Notes:</strong>
      <div id="editModalContext" style="margin-top: 2px; color: #1E293B;"></div>
    </div>

    <!-- Location Input & Quick Chips -->
    <div class="form-group">
      <label class="form-label">
        <span>Location & Area (Correct / Specify):</span>
        <span style="font-size: 10.5px; color: #64748B;">Click chip or type</span>
      </label>
      <input type="text" id="editModalLocInput" class="form-input" placeholder="e.g. Rohini Sector 14, North West Delhi">
      <div class="chip-container">
        <button type="button" class="chip-btn" onclick="setLocChip('Delhi / NCR')">Delhi / NCR</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Rohini, North West Delhi')">Rohini</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Pitampura, North West Delhi')">Pitampura</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Dwarka, South West Delhi')">Dwarka</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Model Town, North Delhi')">Model Town</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Saket, South Delhi')">Saket</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Noida, NCR')">Noida</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Gurugram, Haryana')">Gurugram</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Faridabad, Haryana')">Faridabad</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Ghaziabad, NCR')">Ghaziabad</button>
        <button type="button" class="chip-btn" onclick="setLocChip('South Delhi')">South Delhi</button>
        <button type="button" class="chip-btn" onclick="setLocChip('North Delhi')">North Delhi</button>
        <button type="button" class="chip-btn" onclick="setLocChip('West Delhi')">West Delhi</button>
        <button type="button" class="chip-btn" onclick="setLocChip('Central Delhi')">Central Delhi</button>
        <button type="button" class="chip-btn" onclick="setLocChip('East Delhi')">East Delhi</button>
      </div>
    </div>

    <!-- Subjects Input & Quick Chips -->
    <div class="form-group">
      <label class="form-label">
        <span>Subjects (Standardize / Correct):</span>
        <span style="font-size: 10.5px; color: #64748B;">Click chip or type</span>
      </label>
      <input type="text" id="editModalSubjInput" class="form-input" placeholder="e.g. All Core Subjects (Maths Focus)">
      <div class="chip-container">
        <button type="button" class="chip-btn" onclick="setSubjChip('All Core Subjects')">All Core Subjects</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('All Core Subjects (Maths Focus)')">Maths Focus</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('All Core Subjects (English Focus)')">English Focus</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Mathematics & Science')">Maths & Science</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Mathematics')">Mathematics</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Physics, Chemistry')">Physics, Chemistry</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Accountancy & Economics')">Commerce / Accounts</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('French Language')">French Language</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Special Educator / Shadow Teacher')">Special Educator</button>
        <button type="button" class="chip-btn" onclick="setSubjChip('Music / Dance / Guitar')">Music / Guitar</button>
      </div>
    </div>

    <!-- Class / Grade -->
    <div class="form-group">
      <label class="form-label">Class / Grade:</label>
      <input type="text" id="editModalClassInput" class="form-input" placeholder="e.g. Class 8th, Class 10th">
    </div>

    <!-- Budget / Fee -->
    <div class="form-group">
      <label class="form-label">Budget / Fee:</label>
      <input type="text" id="editModalFeeInput" class="form-input" placeholder="e.g. Negotiable / Standard, ₹5,000 / month">
    </div>

    <!-- Modal Actions -->
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
      <button class="btn" style="background:#E2E8F0; color: #334155;" onclick="closeEditModal()">Cancel</button>
      <button class="btn btn-emerald" onclick="saveEditModal()">💾 Save Changes</button>
    </div>
  </div>
</div>

<!-- Floating Scroll to Top Button for Android -->
<button id="btnFloatingTop" class="btn-floating-top" onclick="scrollToTop()" title="Scroll to Top">
  ↑
</button>
`;

if (html.includes('<!-- JSON Modal -->')) {
  html = html.replace('<!-- JSON Modal -->', editModalHtml + '\n<!-- JSON Modal -->');
  console.log("Injected Quick Edit Modal & Floating Button.");
}

// 7. Add Pagination Bar before closing tableContainer wrapper
const paginationBarHtml = `
    <!-- Pagination Bar -->
    <div class="pagination-bar" id="paginationBar">
      <div style="font-size: 13px; font-weight: 600; color: #475569;">
        Showing <span id="pageShowingStart">1</span>-<span id="pageShowingEnd">50</span> of <span id="pageTotalCount">513</span> inquiries
      </div>
      <div class="pagination-controls">
        <button class="page-btn" id="prevPageBtn" onclick="changePage(-1)">◀ Previous</button>
        <span class="page-indicator" id="pageIndicatorText">Page 1 of 11</span>
        <button class="page-btn" id="nextPageBtn" onclick="changePage(1)">Next ▶</button>
      </div>
    </div>
`;

if (html.includes('    </div>\n  </div>\n</div>\n\n<!-- Quick Edit Modal')) {
  html = html.replace('    </div>\n  </div>\n</div>\n\n<!-- Quick Edit Modal', '    </div>\n' + paginationBarHtml + '  </div>\n</div>\n\n<!-- Quick Edit Modal');
  console.log("Injected Pagination Bar inside dashboard shell.");
}

// 8. Replace Script block with upgraded logic
const scriptMarker = '// Dynamic View Switching';
const markerIdx = html.indexOf(scriptMarker);

if (markerIdx !== -1) {
  const scriptContent = `
  // LocalStorage Key for Staff Edits
  const STORAGE_KEY = "ATH_STAFF_EDITED_LEADS_V1";
  let staffEdits = {};

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      staffEdits = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load saved edits:", e);
  }

  // Pagination State
  let currentPage = 1;
  let pageSize = 50; // default on Android / mobile
  let filteredIndices = [];

  // Edit Modal State
  let currentEditIndex = -1;

  // Initialize: Inject Edit buttons, apply saved edits, render first page
  function initDashboard() {
    // Inject Edit Buttons into cards and table rows
    const cards = document.querySelectorAll("#cardsFeed .lead-card");
    const rows = document.querySelectorAll("#leadsTable tbody tr");

    cards.forEach((card, idx) => {
      const actionsGrid = card.querySelector(".contact-actions-grid");
      if (actionsGrid && !actionsGrid.querySelector(".action-btn-edit")) {
        const editBtn = document.createElement("button");
        editBtn.className = "action-btn-edit";
        editBtn.type = "button";
        editBtn.innerHTML = "✏️ Edit";
        editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(idx); };
        actionsGrid.appendChild(editBtn);
      }
    });

    rows.forEach((row, idx) => {
      const contactCell = row.cells[1];
      if (contactCell) {
        const actionRow = contactCell.querySelector("div > div");
        if (actionRow && !actionRow.querySelector(".action-btn-edit")) {
          const editBtn = document.createElement("button");
          editBtn.className = "action-btn-edit";
          editBtn.style.padding = "3px 8px";
          editBtn.style.fontSize = "11px";
          editBtn.style.minHeight = "24px";
          editBtn.type = "button";
          editBtn.innerHTML = "✏️ Edit";
          editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(idx); };
          actionRow.appendChild(editBtn);
        }
      }
    });

    // Apply any saved edits from localStorage
    applyAllSavedEdits();

    // Run initial filter & pagination
    onFilterChange();

    // Floating Back to Top listener
    window.addEventListener("scroll", () => {
      const btn = document.getElementById("btnFloatingTop");
      if (btn) {
        if (window.scrollY > 300) {
          btn.classList.add("show");
        } else {
          btn.classList.remove("show");
        }
      }
    }, { passive: true });
  }

  // Apply saved edits into allLeads array and DOM
  function applyAllSavedEdits() {
    const editKeys = Object.keys(staffEdits);
    const counterBadge = document.getElementById("editedCounterBadge");
    if (counterBadge) {
      counterBadge.innerText = editKeys.length + " Leads Edited";
    }

    editKeys.forEach((key) => {
      const idx = parseInt(key, 10);
      if (allLeads[idx] && staffEdits[key]) {
        const edited = staffEdits[key];
        allLeads[idx].location = edited.location ?? allLeads[idx].location;
        allLeads[idx].subjects = edited.subjects ?? allLeads[idx].subjects;
        allLeads[idx].classes = edited.classes ?? allLeads[idx].classes;
        allLeads[idx].budgetFee = edited.budgetFee ?? allLeads[idx].budgetFee;
        allLeads[idx]._isEdited = true;

        updateCardAndRowDom(idx);
      }
    });
  }

  // Update visible Card and Row DOM for lead idx
  function updateCardAndRowDom(idx) {
    const l = allLeads[idx];
    const card = document.querySelector(\`#cardsFeed .lead-card[data-index="\${idx}"]\`);
    const row = document.querySelector(\`#leadsTable tbody tr[data-index="\${idx}"]\`);

    if (card) {
      const locEl = card.querySelector(".loc-main");
      if (locEl) locEl.innerText = l.location;

      const subjEl = card.querySelector(".detail-title");
      if (subjEl) subjEl.innerText = l.subjects;

      const classBadge = card.querySelector(".card-class-badge");
      if (classBadge) {
        classBadge.innerText = l.classes;
        classBadge.title = l.classes;
      }

      let headRow = card.querySelector(".card-head-row > div");
      if (headRow && !card.querySelector(".badge-edited")) {
        const badge = document.createElement("span");
        badge.className = "badge-edited";
        badge.innerHTML = "✓ Edited";
        headRow.appendChild(badge);
      }
    }

    if (row) {
      const classBadge = row.cells[2]?.querySelector(".card-class-badge");
      if (classBadge) classBadge.innerText = l.classes;

      if (row.cells[3]) row.cells[3].innerHTML = \`<div style="max-width: 200px; font-weight: 600;">\${escapeHtml(l.subjects)}</div>\`;

      const locEl = row.cells[4]?.querySelector(".loc-main");
      if (locEl) locEl.innerText = l.location;

      if (row.cells[0] && !row.cells[0].querySelector(".badge-edited")) {
        const badge = document.createElement("div");
        badge.className = "badge-edited";
        badge.style.marginTop = "3px";
        badge.innerHTML = "✓ Edited";
        row.cells[0].appendChild(badge);
      }
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Quick Edit Modal Handlers
  function openEditModal(idx) {
    currentEditIndex = idx;
    const l = allLeads[idx];
    if (!l) return;

    document.getElementById("editModalLeadId").innerText = l.leadId;
    document.getElementById("editModalPhone").innerText = "📞 " + l.phone;
    document.getElementById("editModalContext").innerText = (l.fullAddress ? l.fullAddress : "No extra address notes") + (l.rawNotes ? " | Notes: " + l.rawNotes : "");
    document.getElementById("editModalLocInput").value = l.location || "";
    document.getElementById("editModalSubjInput").value = l.subjects || "";
    document.getElementById("editModalClassInput").value = l.classes || "";
    document.getElementById("editModalFeeInput").value = l.budgetFee || "";

    document.getElementById("quickEditModal").classList.add("active");
  }

  function closeEditModal() {
    document.getElementById("quickEditModal").classList.remove("active");
    currentEditIndex = -1;
  }

  function setLocChip(val) {
    document.getElementById("editModalLocInput").value = val;
  }

  function setSubjChip(val) {
    document.getElementById("editModalSubjInput").value = val;
  }

  function saveEditModal() {
    if (currentEditIndex < 0 || !allLeads[currentEditIndex]) return;

    const newLoc = document.getElementById("editModalLocInput").value.trim();
    const newSubj = document.getElementById("editModalSubjInput").value.trim();
    const newClass = document.getElementById("editModalClassInput").value.trim();
    const newFee = document.getElementById("editModalFeeInput").value.trim();

    if (!newLoc) {
      alert("Please enter a valid location");
      return;
    }
    if (!newSubj) {
      alert("Please enter valid subjects");
      return;
    }

    allLeads[currentEditIndex].location = newLoc;
    allLeads[currentEditIndex].subjects = newSubj;
    if (newClass) allLeads[currentEditIndex].classes = newClass;
    if (newFee) allLeads[currentEditIndex].budgetFee = newFee;
    allLeads[currentEditIndex]._isEdited = true;

    staffEdits[currentEditIndex] = {
      location: newLoc,
      subjects: newSubj,
      classes: newClass || allLeads[currentEditIndex].classes,
      budgetFee: newFee || allLeads[currentEditIndex].budgetFee,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staffEdits));
    } catch (e) {
      console.warn("localStorage quota exceeded:", e);
    }

    updateCardAndRowDom(currentEditIndex);
    const counterBadge = document.getElementById("editedCounterBadge");
    if (counterBadge) {
      counterBadge.innerText = Object.keys(staffEdits).length + " Leads Edited";
    }

    closeEditModal();
    showToast(\`Lead \${allLeads[currentEditIndex].leadId} updated!\`);
  }

  function resetAllStaffEdits() {
    if (!confirm("Are you sure you want to reset all staff edits on this device? This will restore original data.")) return;
    localStorage.removeItem(STORAGE_KEY);
    staffEdits = {};
    window.location.reload();
  }

  // Dynamic View Switching
  function setViewMode(mode) {
    const cardsFeed = document.getElementById("cardsFeed");
    const tableContainer = document.getElementById("tableContainer");
    const cardBtn = document.getElementById("cardViewBtn");
    const tableBtn = document.getElementById("tableViewBtn");

    if (mode === 'card') {
      cardsFeed.style.setProperty('display', window.innerWidth >= 640 ? 'grid' : 'flex', 'important');
      tableContainer.style.setProperty('display', 'none', 'important');
      cardBtn.classList.add("active");
      tableBtn.classList.remove("active");
    } else {
      cardsFeed.style.setProperty('display', 'none', 'important');
      tableContainer.style.setProperty('display', 'block', 'important');
      tableBtn.classList.add("active");
      cardBtn.classList.remove("active");
    }
    renderCurrentPage();
  }

  // Smart Filter Logic
  function onFilterChange() {
    const query = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    const locFilter = document.getElementById("locFilter").value;
    const subjFilter = document.getElementById("subjectFilter").value;
    const grade = document.getElementById("gradeFilter").value;
    const editStatus = document.getElementById("editStatusFilter").value;

    filteredIndices = [];

    const isDelhiNcrArea = (loc) => {
      return /delhi|noida|gurgaon|gurugram|faridabad|ghaziabad|rohini|dwarka|pitampura|model town|saket|okhla|karol bagh|kamla nagar|ashok vihar|paschim vihar|punjabi bagh|janakpuri|burari|kalkaji|sarita vihar|daryaganj|mori gate|tri nagar|nawada|timarpur|shakti nagar|rana pratap bagh|gurmandi|parmanand colony|vipin garden|greater kailash|amar colony|outram lines/i.test(loc);
    };

    for (let i = 0; i < allLeads.length; i++) {
      const l = allLeads[i];
      let show = true;

      // Text Query
      if (query) {
        const fullText = (l.phone + " " + l.location + " " + l.classes + " " + l.subjects + " " + l.budgetFee + " " + (l.rawNotes || "") + " " + (l.fullAddress || "")).toLowerCase();
        if (!fullText.includes(query)) show = false;
      }

      // Location Smart Filter
      if (show && locFilter) {
        const locLower = (l.location || "").toLowerCase();
        if (locFilter === "DELHI_NCR_ONLY") {
          if (!isDelhiNcrArea(l.location)) show = false;
        } else if (locFilter === "GENERIC_DELHI_NCR") {
          const isGeneric = (locLower === "delhi / ncr" || locLower === "delhi/ncr" || locLower === "delhi" || locLower === "ncr");
          if (!isGeneric) show = false;
        } else if (locFilter === "OUTSIDE_DELHI_NCR") {
          if (isDelhiNcrArea(l.location)) show = false;
        } else {
          if (!locLower.includes(locFilter.toLowerCase())) show = false;
        }
      }

      // Subject Smart Filter
      if (show && subjFilter) {
        const s = (l.subjects || "").toLowerCase();
        if (subjFilter === "ALL_CORE") {
          if (!s.includes("all core") && !s.includes("all subjects")) show = false;
        } else if (subjFilter === "MATH") {
          if (!s.includes("math")) show = false;
        } else if (subjFilter === "SCIENCE") {
          if (!/science|physics|chemistry|biology/i.test(s)) show = false;
        } else if (subjFilter === "ENGLISH") {
          if (!s.includes("english") && !s.includes("grammar")) show = false;
        } else if (subjFilter === "COMMERCE") {
          if (!/account|economic|commerce|bst/i.test(s)) show = false;
        } else if (subjFilter === "LANGUAGES") {
          if (!/french|spanish|german|language/i.test(s)) show = false;
        } else if (subjFilter === "HINDI_SANSKRIT") {
          if (!/hindi|sanskrit/i.test(s)) show = false;
        } else if (subjFilter === "SST") {
          if (!/social studies|sst|history|geography/i.test(s)) show = false;
        } else if (subjFilter === "SPECIAL") {
          if (!/special|shadow|educator/i.test(s)) show = false;
        } else if (subjFilter === "MUSIC_ARTS") {
          if (!/music|dance|guitar|art/i.test(s)) show = false;
        }
      }

      // Grade Filter
      if (show && grade) {
        if (grade === "Pre-Primary") {
          if (!/Pre-Nursery|Nursery|KG|UKG|LKG/i.test(l.classes)) show = false;
        } else if (!l.classes.includes(grade)) {
          show = false;
        }
      }

      // Edit Status Filter
      if (show && editStatus && editStatus !== "ALL") {
        const isEdited = !!staffEdits[i];
        if (editStatus === "EDITED" && !isEdited) show = false;
        if (editStatus === "UNEDITED" && isEdited) show = false;
      }

      if (show) {
        filteredIndices.push(i);
      }
    }

    document.getElementById("visibleCount").innerText = filteredIndices.length;
    currentPage = 1;
    renderCurrentPage();
  }

  // Page Size Handler
  function onPageSizeChange() {
    const val = document.getElementById("pageSizeFilter").value;
    if (val === "ALL") {
      pageSize = 999999;
    } else {
      pageSize = parseInt(val, 10);
    }
    currentPage = 1;
    renderCurrentPage();
  }

  // Render Current Page
  function renderCurrentPage() {
    const total = filteredIndices.length;
    const cards = document.querySelectorAll("#cardsFeed .lead-card");
    const rows = document.querySelectorAll("#leadsTable tbody tr");

    cards.forEach(c => c.style.display = "none");
    rows.forEach(r => r.style.display = "none");

    if (total === 0) {
      document.getElementById("pageShowingStart").innerText = "0";
      document.getElementById("pageShowingEnd").innerText = "0";
      document.getElementById("pageTotalCount").innerText = "0";
      document.getElementById("pageIndicatorText").innerText = "Page 0 of 0";
      document.getElementById("prevPageBtn").disabled = true;
      document.getElementById("nextPageBtn").disabled = true;
      return;
    }

    const totalPages = Math.ceil(total / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);

    for (let i = startIdx; i < endIdx; i++) {
      const realIdx = filteredIndices[i];
      if (cards[realIdx]) cards[realIdx].style.display = "";
      if (rows[realIdx]) rows[realIdx].style.display = "";
    }

    document.getElementById("pageShowingStart").innerText = startIdx + 1;
    document.getElementById("pageShowingEnd").innerText = endIdx;
    document.getElementById("pageTotalCount").innerText = total;
    document.getElementById("pageIndicatorText").innerText = \`Page \${currentPage} of \${totalPages}\`;
    document.getElementById("prevPageBtn").disabled = (currentPage <= 1);
    document.getElementById("nextPageBtn").disabled = (currentPage >= totalPages);
  }

  function changePage(delta) {
    currentPage += delta;
    renderCurrentPage();
    const shell = document.querySelector(".dashboard-shell");
    if (shell) {
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Toast Notification
  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Copied: " + text);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast("Copied: " + text);
    } catch (e) {
      showToast("Failed to copy");
    }
    document.body.removeChild(ta);
  }

  // Download Updated HTML File with Baked-in Data & Edits!
  function downloadUpdatedHTML() {
    showToast("Generating updated HTML file...");
    const cleanLeads = allLeads.map(l => {
      const copy = { ...l };
      delete copy._isEdited;
      return copy;
    });

    const currentDoc = document.documentElement.outerHTML;
    const leadsJsonString = JSON.stringify(cleanLeads);
    
    const updatedHtml = currentDoc.replace(/const allLeads = \\[.*?\\];/s, 'const allLeads = ' + leadsJsonString + ';');

    const blob = new Blob([updatedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = \`today_parents_dashboard_updated_\${dateStr}.html\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Updated HTML successfully!");
  }

  // Export Updated CSV
  function downloadCSV() {
    showToast("Generating CSV...");
    const headers = [
      "Lead ID",
      "Phone",
      "Grade / Class",
      "Subjects",
      "Location & Area",
      "Full Address",
      "Budget / Fee",
      "Tutor Preference",
      "Board",
      "Mode",
      "Status",
      "Notes"
    ];

    const rows = allLeads.map(l => [
      l.leadId,
      l.phone,
      l.classes,
      l.subjects,
      l.location,
      l.fullAddress || "",
      l.budgetFee || "",
      l.tutorPreference || "",
      l.board || "",
      l.systemMode || "OFFLINE",
      l.status || "COMPLETE_READY",
      l.rawNotes || ""
    ]);

    const csvContent = [
      headers.map(h => \`"\${h.replace(/"/g, '""')}"\`).join(","),
      ...rows.map(r => r.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(","))
    ].join("\\r\\n");

    const blob = new Blob(["\\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "today_parents_data_updated.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("CSV Downloaded!");
  }

  // Export Updated JSON
  function downloadJSON() {
    const cleanLeads = allLeads.map(l => {
      const copy = { ...l };
      delete copy._isEdited;
      return copy;
    });
    const blob = new Blob([JSON.stringify(cleanLeads, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "today_parents_data_updated.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("JSON Downloaded!");
  }

  function copyUploadPayload() {
    const cleanLeads = allLeads.map(l => {
      const copy = { ...l };
      delete copy._isEdited;
      return copy;
    });
    copyText(JSON.stringify(cleanLeads, null, 2));
  }

  function openPayloadModal() {
    const preview = document.getElementById("modalJsonPreview");
    preview.innerText = JSON.stringify(allLeads.slice(0, 10), null, 2) + "\\n// ... Showing 10 of " + allLeads.length + " leads total";
    document.getElementById("payloadModal").classList.add("active");
  }

  function closePayloadModal() {
    document.getElementById("payloadModal").classList.remove("active");
  }

  function copyModalPayload() {
    copyUploadPayload();
  }

  // Start initialization on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }

  // Default view according to screen size
  if (window.innerWidth <= 768) {
    setViewMode('card');
  } else {
    setViewMode('table');
  }
</script>

</body>
</html>
`;

  html = html.slice(0, markerIdx) + scriptContent;
  console.log("Replaced script with upgraded filtering, editing, pagination, and download engine!");
} else {
  console.error("Could not find scriptMarker!");
}

console.log("Writing to:", srcPath);
fs.writeFileSync(srcPath, html, 'utf8');

console.log("Writing to:", destPublicPath);
fs.writeFileSync(destPublicPath, html, 'utf8');

console.log("SUCCESS! Both files upgraded.");
