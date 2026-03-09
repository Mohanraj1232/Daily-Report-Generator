(() => {
  'use strict';

  // ---- DOM refs ----
  const form = document.getElementById('reportForm');
  const usernameInput = document.getElementById('username');
  const platformSelect = document.getElementById('platform');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const generateBtn = document.getElementById('generateBtn');
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('errorBox');
  const resultSection = document.getElementById('resultSection');
  const resultCount = document.getElementById('resultCount');
  const tbody = document.querySelector('#reportTable tbody');
  const copyBtn = document.getElementById('copyBtn');
  const csvBtn = document.getElementById('csvBtn');
  const excelBtn = document.getElementById('excelBtn');
  const themeToggle = document.getElementById('themeToggle');
  const leetcodeNote = document.getElementById('leetcodeNote');
  const statsBar = document.getElementById('statsBar');

  let currentData = [];

  // ---- theme toggle ----
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      themeToggle.textContent = '🌙 Dark';
    } else {
      document.documentElement.classList.remove('light');
      themeToggle.textContent = '☀ Light';
    }
    localStorage.setItem('theme', theme);
  }

  applyTheme(localStorage.getItem('theme') || 'dark');

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  // ---- leetcode note visibility ----
  function updateLeetcodeNote() {
    if (platformSelect.value === 'leetcode') {
      leetcodeNote.classList.remove('hidden');
    } else {
      leetcodeNote.classList.add('hidden');
    }
  }
  updateLeetcodeNote();
  platformSelect.addEventListener('change', updateLeetcodeNote);

  // ---- helpers ----
  function formatDate(iso) {
    const d = new Date(iso);
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function badgeClass(difficulty) {
    const d = (difficulty || '').toLowerCase();
    if (d === 'easy') return 'badge-easy';
    if (d === 'medium') return 'badge-medium';
    if (d === 'hard') return 'badge-hard';
    return 'badge-unknown';
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---- stats bar ----
  function renderStats(submissions) {
    const counts = { easy: 0, medium: 0, hard: 0, unknown: 0 };
    for (const s of submissions) {
      const d = (s.difficulty || '').toLowerCase();
      if (d === 'easy') counts.easy++;
      else if (d === 'medium') counts.medium++;
      else if (d === 'hard') counts.hard++;
      else counts.unknown++;
    }
    statsBar.innerHTML =
      `<span class="stats-total">📊 ${submissions.length} Submission${submissions.length !== 1 ? 's' : ''} Found</span>` +
      `<span class="stats-breakdown">` +
        `<span class="stat-easy">Easy: ${counts.easy}</span>` +
        `<span class="stat-medium">Medium: ${counts.medium}</span>` +
        `<span class="stat-hard">Hard: ${counts.hard}</span>` +
        (counts.unknown ? `<span class="stat-unknown">Unknown: ${counts.unknown}</span>` : '') +
      `</span>`;
    show(statsBar);
  }

  // ---- fetch ----
  async function fetchReport(username, platform, startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    const url = `/api/${platform}/${encodeURIComponent(username)}?${params}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  // ---- render table ----
  function renderTable(submissions) {
    tbody.innerHTML = '';

    // Sort by date
    submissions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let lastDate = '';
    submissions.forEach((s) => {
      const dateStr = formatDate(s.date);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;

      const tr = document.createElement('tr');
      const problemUrl = s.problemLink || s.link;
      tr.innerHTML = `
        <td>${showDate ? escapeHtml(dateStr) : ''}</td>
        <td><a href="${escapeHtml(problemUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a></td>
        <td><a href="${escapeHtml(s.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.link)}</a></td>
        <td>${escapeHtml(s.platform)}</td>
        <td>${escapeHtml(s.topics || '')}</td>
        <td><span class="badge ${badgeClass(s.difficulty)}">${escapeHtml(s.difficulty)}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---- form submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const platform = platformSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!username) return;

    hide(errorBox);
    hide(resultSection);
    hide(statsBar);
    show(loader);
    generateBtn.disabled = true;

    try {
      const result = await fetchReport(username, platform, startDate, endDate);

      let submissions;
      if (platform === 'all') {
        submissions = result.submissions || [];
        if (result.errors && result.errors.length) {
          errorBox.textContent = 'Partial errors: ' + result.errors.join(' | ');
          show(errorBox);
        }
      } else {
        submissions = Array.isArray(result) ? result : [];
      }

      currentData = submissions;
      resultCount.textContent = `${submissions.length} submission${submissions.length !== 1 ? 's' : ''} found`;
      renderTable(submissions);
      renderStats(submissions);
      show(resultSection);
    } catch (err) {
      errorBox.textContent = err.message;
      show(errorBox);
    } finally {
      hide(loader);
      generateBtn.disabled = false;
    }
  });

  // ---- copy table ----
  copyBtn.addEventListener('click', () => {
    if (!currentData.length) return;

    // Build HTML table so hyperlinks survive paste into spreadsheets
    let html = '<table><tr><th>DATE</th><th>PROGRAM TITLE</th><th>LINK</th><th>PLATFORM</th><th>TOPIC</th><th>DIFFICULTY</th></tr>';
    // Build plain text fallback
    const headerText = 'DATE\tPROGRAM TITLE\tLINK\tPLATFORM\tTOPIC\tDIFFICULTY';
    let lastDate = '';
    const textRows = [];
    currentData.forEach((s) => {
      const dateStr = formatDate(s.date);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;
      const problemUrl = s.problemLink || s.link;
      html += `<tr>
        <td>${showDate ? escapeHtml(dateStr) : ''}</td>
        <td><a href="${escapeHtml(problemUrl)}">${escapeHtml(s.title)}</a></td>
        <td><a href="${escapeHtml(s.link)}">${escapeHtml(s.link)}</a></td>
        <td>${escapeHtml(s.platform)}</td>
        <td>${escapeHtml(s.topics || '')}</td>
        <td>${escapeHtml(s.difficulty)}</td>
      </tr>`;
      textRows.push([
        showDate ? dateStr : '',
        s.title,
        s.link,
        s.platform,
        s.topics || '',
        s.difficulty,
      ].join('\t'));
    });
    html += '</table>';
    const text = [headerText, ...textRows].join('\n');

    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([text], { type: 'text/plain' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
    ]).then(() => {
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => (copyBtn.textContent = '📋 Copy Table'), 1500);
    });
  });

  // ---- export CSV ----
  csvBtn.addEventListener('click', () => {
    if (!currentData.length) return;
    const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['DATE', 'PROGRAM TITLE', 'LINK', 'PLATFORM', 'TOPIC', 'DIFFICULTY'].map(csvEscape).join(',');
    let lastDate = '';
    const rows = currentData.map((s) => {
      const dateStr = formatDate(s.date);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;
      return [
        showDate ? dateStr : '',
        s.title,
        s.link,
        s.platform,
        s.topics || '',
        s.difficulty,
      ].map(csvEscape).join(',');
    });
    downloadFile('report.csv', 'text/csv;charset=utf-8;', '\uFEFF' + [header, ...rows].join('\r\n'));
  });

  // ---- export Excel (TSV with .xls) ----
  excelBtn.addEventListener('click', () => {
    if (!currentData.length) return;
    const header = 'DATE\tPROGRAM TITLE\tLINK\tPLATFORM\tTOPIC\tDIFFICULTY';
    let lastDate = '';
    const rows = currentData.map((s) => {
      const dateStr = formatDate(s.date);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;
      return [
        showDate ? dateStr : '',
        s.title,
        s.link,
        s.platform,
        s.topics || '',
        s.difficulty,
      ].join('\t');
    });

    // Build a simple HTML table that Excel can open
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>';
    html += '<tr><th>DATE</th><th>PROGRAM TITLE</th><th>LINK</th><th>PLATFORM</th><th>TOPIC</th><th>DIFFICULTY</th></tr>';
    lastDate = '';
    currentData.forEach((s) => {
      const dateStr = formatDate(s.date);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;
      html += `<tr>
        <td>${showDate ? escapeHtml(dateStr) : ''}</td>
        <td>${escapeHtml(s.title)}</td>
        <td><a href="${escapeHtml(s.link)}">${escapeHtml(s.link)}</a></td>
        <td>${escapeHtml(s.platform)}</td>
        <td>${escapeHtml(s.topics || '')}</td>
        <td>${escapeHtml(s.difficulty)}</td>
      </tr>`;
    });
    html += '</table></body></html>';

    downloadFile('report.xls', 'application/vnd.ms-excel', html);
  });

  function downloadFile(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
})();
