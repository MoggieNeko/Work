const els = {
  jsonInput: document.getElementById('jsonInput'),
  fileInput: document.getElementById('fileInput'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  languageFilter: document.getElementById('languageFilter'),
  productInput: document.getElementById('productInput'),
  colorFilter: document.getElementById('colorFilter'),
  strictMode: document.getElementById('strictMode'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  resetBtn: document.getElementById('resetBtn'),
  results: document.getElementById('results'),
  rawCount: document.getElementById('rawCount'),
  resultCount: document.getElementById('resultCount'),
  highScoreCount: document.getElementById('highScoreCount'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
};

let rawItems = [];
let analyzedItems = [];

const SAMPLE_DATA = {
  source: 'demo',
  items: [
    {
      platform: 'Instagram',
      url: 'https://www.instagram.com/reel/demo1/',
      title: 'Coffee routine reel',
      caption: 'Morning coffee setup with grinder and latte art',
      thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
      dominantColorName: 'brown',
      pageText: 'coffee grinder latte art barista morning coffee setup',
      collectedAt: new Date().toISOString(),
    },
    {
      platform: 'Instagram',
      url: 'https://www.instagram.com/reel/demo2/',
      title: 'Blue background skincare',
      caption: 'Skincare flatlay with blue background and serum bottle',
      thumbnailUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=600',
      dominantColorName: 'blue',
      pageText: 'skincare serum flatlay beauty routine blue background',
      collectedAt: new Date().toISOString(),
    },
  ],
};

function normalizeItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function parsePayload(text) {
  const parsed = JSON.parse(text);
  return normalizeItems(parsed);
}

function detectLanguage(text) {
  const t = `${text || ''}`.trim();
  if (!t) return 'unknown';
  if (/[\u3040-\u30ff]/.test(t)) return 'ja';
  if (/[\uac00-\ud7af]/.test(t)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh';
  if (/[a-zA-Z]/.test(t)) return 'en';
  return 'unknown';
}

function tokenizeKeywords(value) {
  return value
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

function cleanText(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function analyze(items) {
  const langFilter = els.languageFilter.value;
  const productKeywords = tokenizeKeywords(els.productInput.value);
  const colorFilter = els.colorFilter.value;
  const strict = els.strictMode.checked;

  const out = items.map((item) => {
    const text = cleanText(item.title, item.caption, item.pageText, item.altText, item.owner);
    const language = item.detectedLanguage || detectLanguage(text);
    const color = (item.dominantColorName || 'unknown').toLowerCase();

    let score = 0;
    const reasons = [];

    const productMatches = productKeywords.filter((kw) => text.toLowerCase().includes(kw));
    if (productMatches.length) {
      score += productMatches.length * 30;
      reasons.push(`產品關鍵字：${productMatches.join(', ')}`);
    }

    if (langFilter !== 'all') {
      if (language === langFilter) {
        score += 18;
        reasons.push(`語言符合：${language}`);
      } else if (strict) {
        score -= 100;
      }
    }

    if (colorFilter) {
      if (color === colorFilter) {
        score += 16;
        reasons.push(`顏色符合：${color}`);
      } else if (strict && color !== 'unknown') {
        score -= 100;
      }
    }

    if (item.url?.includes('/reel/')) {
      score += 12;
      reasons.push('Reel 內容');
    }

    if (item.caption) score += 8;
    if (item.thumbnailUrl) score += 6;
    if (item.pageText) score += 4;

    let confidence = 'low';
    if (score >= 45) confidence = 'high';
    else if (score >= 20) confidence = 'medium';

    const keep = strict
      ? score > 0 &&
        (langFilter === 'all' || language === langFilter) &&
        (!colorFilter || color === colorFilter || color === 'unknown') &&
        (productKeywords.length === 0 || productMatches.length === productKeywords.length)
      : score > 0 || productKeywords.length === 0;

    return {
      ...item,
      detectedLanguage: language,
      dominantColorName: color,
      score,
      matchReasons: reasons,
      matchedProducts: productMatches,
      confidence,
      keep,
    };
  })
  .filter(item => item.keep)
  .sort((a, b) => b.score - a.score);

  analyzedItems = out;
  renderResults(out);
}

function renderResults(items) {
  els.results.innerHTML = '';
  els.rawCount.textContent = rawItems.length;
  els.resultCount.textContent = items.length;
  els.highScoreCount.textContent = items.filter(i => i.score >= 45).length;

  if (!items.length) {
    els.results.innerHTML = '<div class="empty">目前沒有結果。先匯入 extension JSON，再用較寬鬆條件測試。</div>';
    return;
  }

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card';
    const thumb = item.thumbnailUrl ? `<img class="thumb" src="${escapeHtml(item.thumbnailUrl)}" alt="thumbnail" />` : '<div class="thumb"></div>';
    const tags = [
      `score ${item.score}`,
      item.detectedLanguage || 'unknown',
      item.dominantColorName || 'unknown',
      item.confidence,
      ...(item.matchedProducts || []),
    ].map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="card-inner">
        <div>${thumb}</div>
        <div class="meta">
          <h3><a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.caption || item.url || 'Untitled')}</a></h3>
          <p>${escapeHtml(item.caption || item.pageText || '沒有更多說明')}</p>
          <p><span class="score">分數：${item.score}</span>${item.matchReasons?.length ? ` · ${escapeHtml(item.matchReasons.join(' / '))}` : ''}</p>
          <div class="tags">${tags}</div>
        </div>
      </div>
    `;
    els.results.appendChild(card);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function exportCsv(items) {
  const headers = ['url', 'title', 'caption', 'detectedLanguage', 'dominantColorName', 'score', 'confidence', 'matchedProducts'];
  const rows = items.map(item => headers.map(h => {
    const val = h === 'matchedProducts' ? (item[h] || []).join('|') : (item[h] ?? '');
    return `"${String(val).replaceAll('"', '""')}"`;
  }).join(','));
  downloadFile('ig-video-finder-results.csv', [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.analyzeBtn.addEventListener('click', () => {
  try {
    rawItems = parsePayload(els.jsonInput.value);
    analyze(rawItems);
  } catch (err) {
    alert(`JSON 讀取失敗：${err.message}`);
  }
});

els.resetBtn.addEventListener('click', () => {
  els.languageFilter.value = 'all';
  els.productInput.value = '';
  els.colorFilter.value = '';
  els.strictMode.checked = false;
  analyzedItems = [];
  renderResults([]);
});

els.loadSampleBtn.addEventListener('click', () => {
  els.jsonInput.value = JSON.stringify(SAMPLE_DATA, null, 2);
});

els.fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  els.jsonInput.value = await file.text();
});

els.exportCsvBtn.addEventListener('click', () => exportCsv(analyzedItems));
els.exportJsonBtn.addEventListener('click', () => downloadFile('ig-video-finder-results.json', JSON.stringify(analyzedItems, null, 2), 'application/json'));

renderResults([]);
