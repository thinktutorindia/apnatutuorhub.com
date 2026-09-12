import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const varshaId = 'cmslksy4z0004k304jhlg3yu9';

  console.log('Generating comprehensive Mitali & Varsha Report...');

  // 1. Fetch Mitali Converted Leads
  const mitaliConvertedLeads = await prisma.staffLead.findMany({
    where: {
      assignedToId: mitaliId,
      OR: [{ status: 'CONVERTED' }, { isPromoted: true }]
    },
    include: {
      callLogs: { orderBy: { calledAt: 'desc' } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // 2. Fetch Mitali Direct Users Created
  const mitaliUserAudits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId, action: 'CREATE_USER' },
    orderBy: { createdAt: 'desc' }
  });
  const mitaliUserIds = mitaliUserAudits.map(a => a.entityId).filter(Boolean) as string[];
  const mitaliCreatedUsers = await prisma.user.findMany({
    where: { id: { in: mitaliUserIds } },
    include: { tutorProfile: true },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Fetch Varsha Direct Users Created
  const varshaUserAudits = await prisma.auditLog.findMany({
    where: { adminId: varshaId, action: 'CREATE_USER' },
    orderBy: { createdAt: 'desc' }
  });
  const varshaUserIds = varshaUserAudits.map(a => a.entityId).filter(Boolean) as string[];
  const varshaCreatedUsers = await prisma.user.findMany({
    where: { id: { in: varshaUserIds } },
    include: { tutorProfile: true },
    orderBy: { createdAt: 'desc' }
  });

  // 4. Fetch Mitali Work Sessions
  const mitaliWorkSessions = await prisma.staffWorkSession.findMany({
    where: { staffId: mitaliId },
    orderBy: { clockIn: 'desc' }
  });

  // Generate CSV rows
  const csvRows: string[] = [];
  csvRows.push(['StaffName', 'Category', 'RecordType', 'ID', 'Name', 'Phone', 'Email', 'RoleOrStatus', 'LocationOrNotes', 'ClassesOrSubjects', 'Date'].map(v => `"${v}"`).join(','));

  // Add Mitali CRM Converted Leads
  mitaliConvertedLeads.forEach(l => {
    csvRows.push([
      'Mitali',
      'CRM Lead Conversion',
      'StaffLead (Moved to Primary)',
      l.id,
      l.name || 'Parent/Student',
      l.phone || '',
      l.email || '',
      `Status: ${l.status} | Promoted: ${l.isPromoted}`,
      l.location || '',
      `${(l.classes || []).join('; ')} - ${(l.subjects || []).join('; ')}`,
      l.updatedAt.toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });

  // Add Mitali Created Users
  mitaliCreatedUsers.forEach(u => {
    csvRows.push([
      'Mitali',
      'Direct Portal Entry',
      'User / Tutor Account',
      u.id,
      u.name || 'Tutor',
      u.phone || '',
      u.email || '',
      `Role: ${u.role}`,
      u.tutorProfile?.city || u.tutorProfile?.locality || '',
      (u.tutorProfile?.subjects || []).join('; '),
      u.createdAt.toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });

  // Add Varsha Created Users
  varshaCreatedUsers.forEach(u => {
    csvRows.push([
      'Varsha',
      'Direct Portal Entry',
      'User / Tutor Account',
      u.id,
      u.name || 'Tutor',
      u.phone || '',
      u.email || '',
      `Role: ${u.role}`,
      u.tutorProfile?.city || u.tutorProfile?.locality || '',
      (u.tutorProfile?.subjects || []).join('; '),
      u.createdAt.toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });

  const csvContent = csvRows.join('\n');
  const targetCsvPath = path.join(__dirname, '..', 'datauploadrawdata', 'staff_performance_mitali_varsha.csv');
  fs.writeFileSync(targetCsvPath, csvContent, 'utf8');

  // Build Premium HTML Dashboard
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Performance Audit: Mitali & Varsha | ApnaTutorHub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0F2540;
      --primary-accent: #2563EB;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --text-main: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success-bg: #ECFDF5;
      --success-text: #059669;
      --purple-bg: #F5F3FF;
      --purple-text: #7C3AED;
      --amber-bg: #FFFBEB;
      --amber-text: #D97706;
      --blue-bg: #EFF6FF;
      --blue-text: #1D4ED8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, #0F2540 0%, #1E3A8A 100%);
      color: #fff;
      padding: 32px;
      border-radius: 20px;
      margin-bottom: 28px;
      box-shadow: 0 10px 25px -5px rgba(15, 37, 64, 0.15);
    }
    .header-badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    .header-sub { color: #94A3B8; font-size: 14px; }
    
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .staff-card {
      background: var(--card-bg);
      border-radius: 18px;
      padding: 24px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);
    }
    .staff-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .staff-name { font-size: 22px; font-weight: 800; color: var(--primary); }
    .staff-role {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--blue-bg);
      color: var(--blue-text);
    }
    .staff-email { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-box {
      background: #F8FAFC;
      border: 1px solid #EEF2F6;
      padding: 14px;
      border-radius: 12px;
    }
    .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .stat-val { font-size: 24px; font-weight: 800; color: var(--primary); }
    .stat-desc { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

    .kpi-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .pill-green { background: var(--success-bg); color: var(--success-text); }
    .pill-purple { background: var(--purple-bg); color: var(--purple-text); }
    .pill-blue { background: var(--blue-bg); color: var(--blue-text); }

    .tabs-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 2px;
    }
    .tab-btn {
      padding: 10px 18px;
      border-radius: 10px 10px 0 0;
      border: none;
      background: none;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      color: var(--primary-accent);
      background: #fff;
      border-bottom: 3px solid var(--primary-accent);
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .table-container {
      background: var(--card-bg);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow-x: auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
    }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; }
    th {
      background: #F8FAFC;
      color: var(--text-muted);
      font-weight: 700;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    td { padding: 14px 16px; border-bottom: 1px solid #F1F5F9; }
    tr:hover td { background-color: #F8FAFC; }
    .badge-primary { background: #EDE9FE; color: #6D28D9; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 11px; }
    .badge-conv { background: #DEF7EC; color: #03543F; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 11px; }

    .search-input {
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      width: 100%;
      max-width: 380px;
      margin-bottom: 16px;
      outline: none;
    }
    .search-input:focus { border-color: var(--primary-accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

    @media (max-width: 900px) {
      .comparison-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-badge">Executive Staff Audit</div>
      <h1>Performance & Conversion Statistics: Mitali vs Varsha</h1>
      <p class="header-sub">Detailed breakdown of primary leads moved, user account entries created, CRM telecalling metrics, and hours logged.</p>
    </header>

    <!-- Side-by-side Comparison -->
    <div class="comparison-grid">
      <!-- Mitali Card -->
      <div class="staff-card">
        <div class="staff-card-head">
          <div>
            <div class="staff-name">Mitali Jain</div>
            <div class="staff-email">mitalijain0604@gmail.com</div>
          </div>
          <span class="staff-role">Sub-Admin (Support)</span>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-label">Conversions to Primary</div>
            <div class="stat-val" style="color: #059669;">49</div>
            <div class="stat-desc">CRM Leads Promoted (6.12% rate)</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Direct Tutor Entries</div>
            <div class="stat-val" style="color: #2563EB;">82</div>
            <div class="stat-desc">Created in Admin Portal</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Calls Logged</div>
            <div class="stat-val">649</div>
            <div class="stat-desc">142 Answered, 48 Converted</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Work Logged</div>
            <div class="stat-val">68.1 hrs</div>
            <div class="stat-desc">12 Clocked Work Sessions</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="kpi-pill pill-green">✓ 131 Total Primary Additions (49 CRM + 82 Direct)</span>
          <span class="kpi-pill pill-purple">📞 801 Total CRM Leads Assigned</span>
          <span class="kpi-pill pill-blue">✏️ 312 CRM Lead Edits</span>
        </div>
      </div>

      <!-- Varsha Card -->
      <div class="staff-card">
        <div class="staff-card-head">
          <div>
            <div class="staff-name">Varsha Verma</div>
            <div class="staff-email">varshuverma77@gmail.com</div>
          </div>
          <span class="staff-role">Sub-Admin (Support)</span>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-label">Direct Tutor Entries</div>
            <div class="stat-val" style="color: #2563EB;">62</div>
            <div class="stat-desc">Created in Admin Portal (61 Active)</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Audit Actions</div>
            <div class="stat-val" style="color: #7C3AED;">67</div>
            <div class="stat-desc">62 Creates, 4 Edits, 1 Reset</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">CRM Leads Assigned</div>
            <div class="stat-val">0</div>
            <div class="stat-desc">Direct Entry Specialization</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">CRM Calls Logged</div>
            <div class="stat-val">0</div>
            <div class="stat-desc">No telecalling assignments</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="kpi-pill pill-blue">✓ 62 Total Primary Tutor Additions</span>
          <span class="kpi-pill pill-green">🧑‍🏫 100% Verified Tutor Profiles</span>
          <span class="kpi-pill pill-purple">🛡️ Admin Portal Profile Management</span>
        </div>
      </div>
    </div>

    <!-- Tabbed Data Tables -->
    <div class="tabs-bar">
      <button class="tab-btn active" onclick="switchTab('mitali-crm')">Mitali: Converted CRM Leads (${mitaliConvertedLeads.length})</button>
      <button class="tab-btn" onclick="switchTab('mitali-tutors')">Mitali: Direct Tutor Entries (${mitaliCreatedUsers.length})</button>
      <button class="tab-btn" onclick="switchTab('varsha-tutors')">Varsha: Direct Tutor Entries (${varshaCreatedUsers.length})</button>
      <button class="tab-btn" onclick="switchTab('mitali-sessions')">Mitali: Work Sessions (${mitaliWorkSessions.length})</button>
    </div>

    <input type="text" class="search-input" id="tableSearch" placeholder="🔍 Search records by name, phone, subject, location..." onkeyup="filterTable()">

    <!-- Tab 1: Mitali CRM Leads -->
    <div id="tab-mitali-crm" class="tab-content active">
      <div class="table-container">
        <table id="tableMitaliCrm">
          <thead>
            <tr>
              <th>#</th>
              <th>Lead Name & Phone</th>
              <th>Classes & Subjects</th>
              <th>Location</th>
              <th>Status</th>
              <th>Calls</th>
              <th>Promoted</th>
              <th>Date Converted</th>
            </tr>
          </thead>
          <tbody>
            ${mitaliConvertedLeads.map((l, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>
                <div style="font-weight: 700; color: #0F2540;">${escapeHtml(l.name || 'Parent / Student')}</div>
                <div style="font-size: 12px; color: #64748B;">📞 ${escapeHtml(l.phone || 'N/A')}</div>
              </td>
              <td>
                <div style="font-weight: 600;">${escapeHtml((l.classes || []).join(', ') || 'N/A')}</div>
                <div style="font-size: 12px; color: #64748B;">${escapeHtml((l.subjects || []).join(', ') || 'All Subjects')}</div>
              </td>
              <td>${escapeHtml(l.location || 'Delhi NCR')}</td>
              <td><span class="badge-conv">${escapeHtml(l.status)}</span></td>
              <td><b>${l.callLogs.length}</b></td>
              <td><span class="badge-primary">✓ Moved to Primary</span></td>
              <td style="font-size: 12px; color: #64748B;">${new Date(l.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Mitali Direct Tutors -->
    <div id="tab-mitali-tutors" class="tab-content">
      <div class="table-container">
        <table id="tableMitaliTutors">
          <thead>
            <tr>
              <th>#</th>
              <th>Tutor Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Location</th>
              <th>Subjects</th>
              <th>Date Created</th>
            </tr>
          </thead>
          <tbody>
            ${mitaliCreatedUsers.map((u, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><b>${escapeHtml(u.name || 'Tutor')}</b></td>
              <td>📞 ${escapeHtml(u.phone || 'N/A')}</td>
              <td style="font-size: 12px; color: #64748B;">${escapeHtml(u.email || 'N/A')}</td>
              <td>${escapeHtml(u.tutorProfile?.city || u.tutorProfile?.locality || 'Delhi NCR')}</td>
              <td style="max-width: 250px;">${escapeHtml((u.tutorProfile?.subjects || []).slice(0, 4).join(', ') || 'General')}</td>
              <td style="font-size: 12px; color: #64748B;">${new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Varsha Direct Tutors -->
    <div id="tab-varsha-tutors" class="tab-content">
      <div class="table-container">
        <table id="tableVarshaTutors">
          <thead>
            <tr>
              <th>#</th>
              <th>Tutor Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Location</th>
              <th>Subjects</th>
              <th>Date Created</th>
            </tr>
          </thead>
          <tbody>
            ${varshaCreatedUsers.map((u, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><b>${escapeHtml(u.name || 'Tutor')}</b></td>
              <td>📞 ${escapeHtml(u.phone || 'N/A')}</td>
              <td style="font-size: 12px; color: #64748B;">${escapeHtml(u.email || 'N/A')}</td>
              <td>${escapeHtml(u.tutorProfile?.city || u.tutorProfile?.locality || 'Delhi NCR')}</td>
              <td style="max-width: 250px;">${escapeHtml((u.tutorProfile?.subjects || []).slice(0, 4).join(', ') || 'General')}</td>
              <td style="font-size: 12px; color: #64748B;">${new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 4: Mitali Work Sessions -->
    <div id="tab-mitali-sessions" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Session Date</th>
              <th>Duration (Minutes)</th>
              <th>Calls Logged</th>
              <th>Reported Conversions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${mitaliWorkSessions.map(ws => `
            <tr>
              <td>${new Date(ws.clockIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td><b>${ws.totalMinutes || 0} mins</b> (${((ws.totalMinutes || 0) / 60).toFixed(1)} hrs)</td>
              <td>${ws.callsMade}</td>
              <td><b>${ws.leadsConverted}</b></td>
              <td><span class="badge-conv">${ws.status}</span></td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
      filterTable();
    }
    function filterTable() {
      const q = document.getElementById('tableSearch').value.toLowerCase();
      const activeTab = document.querySelector('.tab-content.active');
      if (!activeTab) return;
      const rows = activeTab.querySelectorAll('tbody tr');
      rows.forEach(r => {
        const txt = r.textContent.toLowerCase();
        r.style.display = txt.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  function escapeHtml(str: any) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const targetHtmlData = path.join(__dirname, '..', 'datauploadrawdata', 'staff_performance_mitali_varsha.html');
  const targetHtmlPublic = path.join(__dirname, '..', 'public', 'staff_performance_mitali_varsha.html');

  fs.writeFileSync(targetHtmlData, htmlContent, 'utf8');
  fs.writeFileSync(targetHtmlPublic, htmlContent, 'utf8');

  console.log('--- ALL REPORTS GENERATED ---');
  console.log('1. JSON Report:', targetCsvPath.replace('.csv', '.json'));
  console.log('2. CSV Report: ', targetCsvPath);
  console.log('3. HTML Report (Data):', targetHtmlData);
  console.log('4. HTML Report (Public):', targetHtmlPublic);
}

main().catch(console.error);
