const SAMPLE_DATA_URL = 'data/videos.sample.json';
const STORAGE_KEY = 'videoFinderDataset_v1';

const state = {
  videos: [],
  filtered: [],
  selectedPlatforms: new Set(['Instagram']),
  matchMode: 'all',
  sourceLabel: '尚未載入',
  sourceDetails: '可載入示範資料或匯入你自己的 JSON/CSV。'
};

const els = {
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  fileInput: document.getElementById('fileInput'),
  naturalQuery: document.getElementById('naturalQuery'),
  applyNaturalBtn: document.getElementById('applyNaturalBtn'),
  platformChips: document.getElementById('platformChips'),
  platformAllBtn: document.getElementById('platformAllBtn'),
  languageSelect: document.getElementById('languageSelect'),
  minDuration: document.getElementById('minDuration'),
  maxDuration: document.getElementById('maxDuration'),
  productInput: document.getElementById('productInput'),
  colorInput: document.getElementById('colorInput'),
  keywordInput: document.getElementById('keywordInput'),
  creatorInput: document.getElementById('creatorInput'),
  sortSelect: document.getElementById('sortSelect'),
  resultsMeta: document.getElementById('resultsMeta'),
  statsRow: document.getElementById('statsRow'),
  dataInfo: document.getElementById('dataInfo'),
  resultsList: document.getElementById('resultsList'),
  copyUrlsBtn: document.getElementById('copyUrlsBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  productSuggestions: document.getElementById('productSuggestions'),
  colorSuggestions: document.getElementById('colorSuggestions'),
  resultCardTemplate: document.getElementById('resultCardTemplate')
};

const KNOWN_LANGUAGES = [
  'Cantonese',
  'Mandarin',
  'English',
  'Japanese',
  'Korean',
  'Thai',
  'Spanish',
  'French',
  'Bilingual'
];

const NATURAL_LANGUAGE_MAP = {
  instagram: 'Instagram',
  ig: 'Instagram',
  reels: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  小紅書: 'Xiaohongshu',
  廣東話: 'Cantonese',
  粵語: 'Cantonese',
  中文: 'Mandarin',
  國語: 'Mandarin',
  普通話: 'Mandarin',
  英文: 'English',
  英語: 'English',
  日文: 'Japanese',
  韓文: 'Korean',
  雙語: 'Bilingual',
  bilingual: 'Bilingual'
};

const COLOR_ALIASES = {
  pink: 'pink',
  粉紅: 'pink',
  粉红: 'pink',
  rose: 'pink',
  red: 'red',
  紅: 'red',
  红: 'red',
  orange: 'orange',
  橙: 'orange',
  yellow: 'yellow',
  黃: 'yellow',
  黄: 'yellow',
  green: 'green',
  綠: 'green',
  绿: 'green',
  blue: 'blue',
  藍: 'blue',
  蓝: 'blue',
  purple: 'purple',
  紫: 'purple',
  brown: 'brown',
  啡: 'brown',
  棕: 'brown',
  beige: 'beige',
  奶茶色: 'beige',
  米色: 'beige',
  black: 'black',
  黑: 'black',
  white: 'white',
  白: 'white',
  grey: 'gray',
  gray: 'gray',
  灰: 'gray'
};

const PRODUCT_HINTS = [
  'coffee', 'latte', 'tea', 'matcha', 'cake', 'croissant', 'bag', 'handbag', 'skincare', 'lipstick', 'shoe',
  'chair', 'sofa', 'camera', 'phone', 'laptop', 'watch', 'perfume', 'bottle', 'book', 'fencing', 'cat'
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  const cached = readLocalData();
  if (cached?.length) {
    setDataset(cached, '本機暫存資料', '已從瀏覽器本機載入上一次匯入的資料。');
  } else {
    await loadSampleData();
  }
}

function bindEvents() {
  els.loadSampleBtn.addEventListener('click', loadSampleData);
  els.resetBtn.addEventListener('click', () => {
    resetFilters();
    applyFilters();
  });
  els.fileInput.addEventListener('change', handleFileUpload);
  els.applyNaturalBtn.addEventListener('click', applyNaturalQuery);
  els.platformAllBtn.addEventListener('click', toggleAllPlatforms);
  els.copyUrlsBtn.addEventListener('click', copyUrls);
  els.exportJsonBtn.addEventListener('click', exportJson);
  els.exportCsvBtn.addEventListener('click', exportCsv);

  [
    els.languageSelect,
    els.minDuration,
    els.maxDuration,
    els.productInput,
    els.colorInput,
    els.keywordInput,
    els.creatorInput,
    els.sortSelect,
    els.naturalQuery
  ].forEach((el) => {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });

  document.querySelectorAll('[data-match-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.matchMode = btn.dataset.matchMode;
      document.querySelectorAll('[data-match-mode]').forEach((node) => node.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

async function loadSampleData() {
  try {
    const res = await fetch(SAMPLE_DATA_URL);
    const raw = await res.json();
    setDataset(raw, '內建示範資料', '目前載入的是 mock data，方便你直接看畫面、篩選方式與 GitHub Pages 部署效果。');
  } catch (error) {
    console.error(error);
    showEmpty('載入示範資料失敗，請重新整理頁面。');
  }
}

function setDataset(rawVideos, sourceLabel, sourceDetails) {
  const videos = sanitizeDataset(rawVideos);
  state.videos = videos;
  state.sourceLabel = sourceLabel;
  state.sourceDetails = sourceDetails;
  persistLocalData(videos);
  populateDynamicControls(videos);
  applyFilters();
}

function sanitizeDataset(rawVideos) {
  if (!Array.isArray(rawVideos)) return [];
  return rawVideos
    .map((item, index) => ({
      id: item.id || `video-${index + 1}`,
      url: item.url || '',
      platform: item.platform || 'Instagram',
      title: item.title || '未命名影片',
      summary: item.summary || '',
      language: item.language || 'Unknown',
      creator: item.creator || '',
      products: toArray(item.products),
      backgroundColors: toArray(item.backgroundColors),
      hashtags: toArray(item.hashtags),
      objects: toArray(item.objects),
      scene: item.scene || '',
      durationSec: toNumber(item.durationSec),
      publishedAt: item.publishedAt || '',
      notes: item.notes || ''
    }))
    .filter((item) => item.url || item.title);
}

function populateDynamicControls(videos) {
  const platforms = uniq(videos.map((v) => v.platform).filter(Boolean));
  const languages = uniq([...KNOWN_LANGUAGES, ...videos.map((v) => v.language).filter(Boolean)]);
  const products = uniq(videos.flatMap((v) => v.products)).sort((a, b) => a.localeCompare(b));
  const colors = uniq(videos.flatMap((v) => v.backgroundColors)).sort((a, b) => a.localeCompare(b));

  renderPlatformChips(platforms);
  populateLanguageSelect(languages);
  renderSuggestions(els.productSuggestions, products.slice(0, 20), els.productInput);
  renderSuggestions(els.colorSuggestions, colors.slice(0, 20), els.colorInput);
}

function renderPlatformChips(platforms) {
  els.platformChips.innerHTML = '';
  const currentSelection = state.selectedPlatforms.size ? new Set(state.selectedPlatforms) : new Set(platforms);
  if (!state.selectedPlatforms.size) {
    state.selectedPlatforms = currentSelection;
  }

  platforms.forEach((platform) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = platform;
    if (currentSelection.has(platform)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.selectedPlatforms.has(platform)) {
        state.selectedPlatforms.delete(platform);
      } else {
        state.selectedPlatforms.add(platform);
      }
      if (!state.selectedPlatforms.size) {
        platforms.forEach((name) => state.selectedPlatforms.add(name));
      }
      renderPlatformChips(platforms);
      applyFilters();
    });
    els.platformChips.appendChild(btn);
  });
}

function populateLanguageSelect(languages) {
  const current = els.languageSelect.value;
  els.languageSelect.innerHTML = '<option value="">全部語言</option>';
  languages.forEach((language) => {
    const opt = document.createElement('option');
    opt.value = language;
    opt.textContent = language;
    els.languageSelect.appendChild(opt);
  });
  if ([...els.languageSelect.options].some((opt) => opt.value === current)) {
    els.languageSelect.value = current;
  }
}

function renderSuggestions(container, values, targetInput) {
  container.innerHTML = '';
  values.forEach((value) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion-chip';
    btn.textContent = value;
    btn.addEventListener('click', () => {
      targetInput.value = appendCommaValue(targetInput.value, value);
      applyFilters();
    });
    container.appendChild(btn);
  });
}

function applyNaturalQuery() {
  const query = els.naturalQuery.value.trim();
  if (!query) return;

  const normalized = normalizeText(query);
  const platforms = uniq(Object.entries(NATURAL_LANGUAGE_MAP)
    .filter(([key, mapped]) => ['Instagram', 'TikTok', 'YouTube', 'Xiaohongshu'].includes(mapped) && normalized.includes(normalizeText(key)))
    .map(([, mapped]) => mapped));
  if (platforms.length) {
    state.selectedPlatforms = new Set(platforms);
    renderPlatformChips(uniq(state.videos.map((v) => v.platform).filter(Boolean)));
  }

  const languages = uniq(Object.entries(NATURAL_LANGUAGE_MAP)
    .filter(([key, mapped]) => !['Instagram', 'TikTok', 'YouTube', 'Xiaohongshu'].includes(mapped) && normalized.includes(normalizeText(key)))
    .map(([, mapped]) => mapped));
  if (languages.length) {
    els.languageSelect.value = languages[0];
  }

  const colors = uniq(Object.entries(COLOR_ALIASES)
    .filter(([key]) => normalized.includes(normalizeText(key)))
    .map(([, mapped]) => mapped));
  if (colors.length) {
    els.colorInput.value = colors.join(', ');
  }

  const lowerQuery = query.toLowerCase();
  const productHits = PRODUCT_HINTS.filter((hint) => lowerQuery.includes(hint.toLowerCase()));
  if (productHits.length) {
    els.productInput.value = uniq(productHits).join(', ');
  }

  const durationMatch = query.match(/(\d+)\s*(?:至|-|到)\s*(\d+)\s*秒/);
  if (durationMatch) {
    els.minDuration.value = durationMatch[1];
    els.maxDuration.value = durationMatch[2];
  } else {
    const singleDurationMatch = query.match(/(\d+)\s*秒/);
    if (singleDurationMatch) {
      els.maxDuration.value = singleDurationMatch[1];
    }
  }

  if (!productHits.length) {
    els.keywordInput.value = query;
  }

  applyFilters();
}

function toggleAllPlatforms() {
  const platforms = uniq(state.videos.map((v) => v.platform).filter(Boolean));
  const allSelected = platforms.every((name) => state.selectedPlatforms.has(name));
  state.selectedPlatforms = allSelected ? new Set() : new Set(platforms);
  if (!state.selectedPlatforms.size) {
    platforms.forEach((name) => state.selectedPlatforms.add(name));
  }
  renderPlatformChips(platforms);
  applyFilters();
}

function applyFilters() {
  const filters = collectFilters();
  const filtered = state.videos
    .map((video) => scoreVideo(video, filters))
    .filter((result) => result.pass)
    .sort((a, b) => compareResults(a, b, filters.sortBy));

  state.filtered = filtered;
  renderStats(filtered, filters);
  renderDataInfo(filters);
  renderResults(filtered);
  els.resultsMeta.textContent = `目前共有 ${state.videos.length} 條影片資料，篩選後顯示 ${filtered.length} 條。`;
}

function collectFilters() {
  return {
    selectedPlatforms: [...state.selectedPlatforms],
    language: els.languageSelect.value.trim(),
    minDuration: toNumber(els.minDuration.value),
    maxDuration: toNumber(els.maxDuration.value),
    products: splitCsvInput(els.productInput.value),
    colors: splitCsvInput(els.colorInput.value).map(aliasColor),
    keywords: splitCsvInput(els.keywordInput.value, true),
    creator: els.creatorInput.value.trim(),
    sortBy: els.sortSelect.value,
    matchMode: state.matchMode
  };
}

function scoreVideo(video, filters) {
  const reasons = [];
  let checks = [];
  let score = 0;

  const platformPass = !filters.selectedPlatforms.length || filters.selectedPlatforms.includes(video.platform);
  checks.push(platformPass);
  if (platformPass && filters.selectedPlatforms.length) {
    score += 2;
    reasons.push(`平台符合：${video.platform}`);
  }

  const languagePass = !filters.language || normalizeText(video.language) === normalizeText(filters.language);
  checks.push(languagePass);
  if (languagePass && filters.language) {
    score += 2;
    reasons.push(`語言符合：${video.language}`);
  }

  const minPass = !filters.minDuration || video.durationSec >= filters.minDuration;
  const maxPass = !filters.maxDuration || video.durationSec <= filters.maxDuration;
  const durationPass = minPass && maxPass;
  checks.push(durationPass);
  if (durationPass && (filters.minDuration || filters.maxDuration)) {
    score += 1;
    reasons.push(`片長符合：${video.durationSec || 0} 秒`);
  }

  const creatorPass = !filters.creator || normalizeText(video.creator).includes(normalizeText(filters.creator));
  checks.push(creatorPass);
  if (creatorPass && filters.creator) {
    score += 1;
    reasons.push(`創作者符合：${video.creator}`);
  }

  const productPass = !filters.products.length || includesAllOrAny(video.products, filters.products, filters.matchMode);
  checks.push(productPass);
  if (productPass && filters.products.length) {
    const matchedProducts = matchTokens(video.products, filters.products);
    score += matchedProducts.length * 2;
    reasons.push(`產品匹配：${matchedProducts.join('、')}`);
  }

  const colorPass = !filters.colors.length || includesAllOrAny(video.backgroundColors.map(aliasColor), filters.colors, filters.matchMode);
  checks.push(colorPass);
  if (colorPass && filters.colors.length) {
    const matchedColors = matchTokens(video.backgroundColors.map(aliasColor), filters.colors);
    score += matchedColors.length * 2;
    reasons.push(`背景顏色匹配：${matchedColors.join('、')}`);
  }

  const searchableFields = [
    video.title,
    video.summary,
    video.scene,
    video.creator,
    video.notes,
    ...video.hashtags,
    ...video.objects,
    ...video.products,
    ...video.backgroundColors
  ].join(' | ');

  const keywordPass = !filters.keywords.length || includesKeywordMode(searchableFields, filters.keywords, filters.matchMode);
  checks.push(keywordPass);
  if (keywordPass && filters.keywords.length) {
    const matchedKeywords = filters.keywords.filter((token) => normalizeText(searchableFields).includes(normalizeText(token)));
    score += matchedKeywords.length * 1.5;
    reasons.push(`關鍵字命中：${matchedKeywords.join('、')}`);
  }

  const activeChecks = checks.filter((_, index) => isActiveCheck(filters, index));
  const pass = filters.matchMode === 'all'
    ? activeChecks.every(Boolean)
    : activeChecks.some(Boolean) || noActiveFilter(filters);

  return {
    video,
    pass,
    score: Number(score.toFixed(1)),
    reasons: reasons.length ? reasons : ['未設定額外條件，按預設列出影片。']
  };
}

function isActiveCheck(filters, index) {
  const flags = [
    filters.selectedPlatforms.length > 0,
    !!filters.language,
    !!filters.minDuration || !!filters.maxDuration,
    !!filters.creator,
    filters.products.length > 0,
    filters.colors.length > 0,
    filters.keywords.length > 0
  ];
  return flags[index];
}

function noActiveFilter(filters) {
  return !(
    filters.selectedPlatforms.length || filters.language || filters.minDuration || filters.maxDuration || filters.creator ||
    filters.products.length || filters.colors.length || filters.keywords.length
  );
}

function compareResults(a, b, sortBy) {
  switch (sortBy) {
    case 'newest_desc':
      return new Date(b.video.publishedAt || 0) - new Date(a.video.publishedAt || 0) || b.score - a.score;
    case 'duration_asc':
      return (a.video.durationSec || 0) - (b.video.durationSec || 0) || b.score - a.score;
    case 'duration_desc':
      return (b.video.durationSec || 0) - (a.video.durationSec || 0) || b.score - a.score;
    case 'title_asc':
      return a.video.title.localeCompare(b.video.title, 'zh-Hant') || b.score - a.score;
    case 'score_desc':
    default:
      return b.score - a.score || new Date(b.video.publishedAt || 0) - new Date(a.video.publishedAt || 0);
  }
}

function renderStats(filtered, filters) {
  const list = filtered.map((item) => item.video);
  const totalUrls = list.filter((item) => item.url).length;
  const avgDuration = list.length ? Math.round(list.reduce((sum, item) => sum + (item.durationSec || 0), 0) / list.length) : 0;
  const topLanguage = mode(list.map((item) => item.language).filter(Boolean)) || '—';
  const topPlatform = mode(list.map((item) => item.platform).filter(Boolean)) || '—';

  const cards = [
    { label: '結果數量', value: filtered.length, note: '符合目前條件的影片' },
    { label: '可用網址', value: totalUrls, note: '可直接打開／複製的連結' },
    { label: '平均片長', value: `${avgDuration}s`, note: '按目前結果計算' },
    { label: '最常見', value: `${topPlatform} / ${topLanguage}`, note: filters.language ? '已套用語言條件' : '依結果分佈得出' }
  ];

  els.statsRow.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <span>${card.note}</span>
    </article>
  `).join('');
}

function renderDataInfo(filters) {
  const activeParts = [];
  if (filters.selectedPlatforms.length) activeParts.push(`平台：${filters.selectedPlatforms.join('、')}`);
  if (filters.language) activeParts.push(`語言：${filters.language}`);
  if (filters.products.length) activeParts.push(`產品：${filters.products.join('、')}`);
  if (filters.colors.length) activeParts.push(`顏色：${filters.colors.join('、')}`);
  if (filters.keywords.length) activeParts.push(`關鍵字：${filters.keywords.join('、')}`);
  if (filters.creator) activeParts.push(`創作者：${filters.creator}`);
  if (filters.minDuration || filters.maxDuration) {
    activeParts.push(`片長：${filters.minDuration || 0} - ${filters.maxDuration || '∞'} 秒`);
  }

  els.dataInfo.innerHTML = `
    <p><strong>資料來源：</strong>${escapeHtml(state.sourceLabel)}</p>
    <p>${escapeHtml(state.sourceDetails)}</p>
    <p><strong>目前篩選：</strong>${escapeHtml(activeParts.length ? activeParts.join(' ｜ ') : '未設定任何條件')}</p>
  `;
}

function renderResults(filtered) {
  els.resultsList.innerHTML = '';
  if (!filtered.length) {
    showEmpty('沒有找到符合條件的影片。你可以放寬條件、改用「中其中一部分都顯示」，或者匯入更多資料。');
    return;
  }

  filtered.forEach((entry) => {
    const fragment = els.resultCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.result-card');
    const badgeRow = fragment.querySelector('.badge-row');
    const title = fragment.querySelector('.video-title');
    const meta = fragment.querySelector('.video-meta');
    const summary = fragment.querySelector('.video-summary');
    const infoGrid = fragment.querySelector('.info-grid');
    const reasonList = fragment.querySelector('.reason-list');
    const scorePill = fragment.querySelector('.score-pill');
    const openLink = fragment.querySelector('.open-link');
    const copyBtn = fragment.querySelector('.copy-link-btn');

    [entry.video.platform, entry.video.language, `${entry.video.durationSec || 0}s`].forEach((label) => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = label;
      badgeRow.appendChild(badge);
    });

    title.textContent = entry.video.title;
    meta.textContent = `創作者：${entry.video.creator || '未提供'} ｜ 發佈時間：${formatDate(entry.video.publishedAt)} ｜ 網址：${entry.video.url || '未提供'}`;
    summary.textContent = entry.video.summary || '未提供影片簡介。';
    scorePill.textContent = `分數 ${entry.score}`;

    const infoCells = [
      { label: '產品', value: joinOrDash(entry.video.products) },
      { label: '背景顏色', value: joinOrDash(entry.video.backgroundColors) },
      { label: '場景 / 物件', value: joinOrDash([entry.video.scene, ...entry.video.objects].filter(Boolean)) },
      { label: 'Hashtags', value: joinOrDash(entry.video.hashtags) }
    ];

    infoCells.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'info-cell';
      cell.innerHTML = `<h5>${escapeHtml(item.label)}</h5><p>${escapeHtml(item.value)}</p>`;
      infoGrid.appendChild(cell);
    });

    entry.reasons.forEach((reason) => {
      const li = document.createElement('li');
      li.textContent = reason;
      reasonList.appendChild(li);
    });

    if (entry.video.url) {
      openLink.href = entry.video.url;
    } else {
      openLink.removeAttribute('href');
      openLink.classList.add('disabled');
      openLink.textContent = '未提供網址';
    }

    copyBtn.addEventListener('click', async () => {
      if (!entry.video.url) return;
      await navigator.clipboard.writeText(entry.video.url);
      copyBtn.textContent = '已複製';
      setTimeout(() => (copyBtn.textContent = '複製網址'), 1200);
    });

    els.resultsList.appendChild(card);
  });
}

function showEmpty(message) {
  els.resultsList.innerHTML = `
    <div class="empty-state">
      <p class="result-empty">${escapeHtml(message)}</p>
      <p class="empty-note">建議先載入示範資料，或者匯入你整理好的 JSON / CSV 影片資料。</p>
    </div>
  `;
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    let data;
    if (file.name.toLowerCase().endsWith('.json')) {
      data = JSON.parse(text);
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      data = parseCsv(text);
    } else {
      throw new Error('只支援 JSON 或 CSV');
    }
    setDataset(data, `用戶匯入：${file.name}`, '這批資料已儲存在瀏覽器本機，可直接重新開啟頁面繼續使用。');
    event.target.value = '';
  } catch (error) {
    alert(`匯入失敗：${error.message}`);
  }
}

async function copyUrls() {
  const urls = state.filtered.map((item) => item.video.url).filter(Boolean);
  if (!urls.length) {
    alert('目前沒有可複製的網址。');
    return;
  }
  await navigator.clipboard.writeText(urls.join('\n'));
  els.copyUrlsBtn.textContent = '已複製';
  setTimeout(() => (els.copyUrlsBtn.textContent = '複製網址'), 1200);
}

function exportJson() {
  const payload = state.filtered.map((item) => item.video);
  downloadFile(JSON.stringify(payload, null, 2), `video-results-${timestamp()}.json`, 'application/json');
}

function exportCsv() {
  const rows = state.filtered.map((item) => ({
    id: item.video.id,
    platform: item.video.platform,
    title: item.video.title,
    url: item.video.url,
    language: item.video.language,
    creator: item.video.creator,
    durationSec: item.video.durationSec,
    publishedAt: item.video.publishedAt,
    products: item.video.products.join('|'),
    backgroundColors: item.video.backgroundColors.join('|'),
    hashtags: item.video.hashtags.join('|'),
    objects: item.video.objects.join('|'),
    scene: item.video.scene,
    summary: item.video.summary,
    notes: item.video.notes
  }));
  const csv = toCsv(rows);
  downloadFile(csv, `video-results-${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}

function resetFilters() {
  state.selectedPlatforms = new Set(uniq(state.videos.map((v) => v.platform).filter(Boolean)));
  renderPlatformChips(uniq(state.videos.map((v) => v.platform).filter(Boolean)));
  els.languageSelect.value = '';
  els.minDuration.value = '';
  els.maxDuration.value = '';
  els.productInput.value = '';
  els.colorInput.value = '';
  els.keywordInput.value = '';
  els.creatorInput.value = '';
  els.naturalQuery.value = '';
  els.sortSelect.value = 'score_desc';
  state.matchMode = 'all';
  document.querySelectorAll('[data-match-mode]').forEach((node) => node.classList.toggle('active', node.dataset.matchMode === 'all'));
}

function readLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistLocalData(videos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch {
    // ignore quota or storage failures
  }
}

function splitCsvInput(input, splitBySpace = false) {
  if (!input) return [];
  const raw = splitBySpace ? input.split(/[\n,，]+/) : input.split(/[\n,，]+/);
  return uniq(raw.map((item) => item.trim()).filter(Boolean));
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[|,，]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().trim();
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function mode(arr) {
  const counter = new Map();
  arr.forEach((item) => counter.set(item, (counter.get(item) || 0) + 1));
  let maxItem = '';
  let maxCount = 0;
  for (const [item, count] of counter.entries()) {
    if (count > maxCount) {
      maxItem = item;
      maxCount = count;
    }
  }
  return maxItem;
}

function joinOrDash(arr) {
  return arr && arr.length ? arr.join('、') : '—';
}

function appendCommaValue(current, next) {
  const items = splitCsvInput(current);
  if (!items.includes(next)) items.push(next);
  return items.join(', ');
}

function aliasColor(value) {
  const key = String(value || '').trim();
  return COLOR_ALIASES[key] || COLOR_ALIASES[normalizeText(key)] || normalizeText(key);
}

function includesAllOrAny(videoValues, filterValues, modeType) {
  const normalizedVideo = videoValues.map((item) => normalizeText(item));
  const normalizedFilter = filterValues.map((item) => normalizeText(item));
  if (modeType === 'all') {
    return normalizedFilter.every((token) => normalizedVideo.some((value) => value.includes(token)));
  }
  return normalizedFilter.some((token) => normalizedVideo.some((value) => value.includes(token)));
}

function includesKeywordMode(text, keywords, modeType) {
  const normalized = normalizeText(text);
  if (modeType === 'all') {
    return keywords.every((token) => normalized.includes(normalizeText(token)));
  }
  return keywords.some((token) => normalized.includes(normalizeText(token)));
}

function matchTokens(videoValues, filterValues) {
  const normalizedVideo = videoValues.map((item) => normalizeText(item));
  return filterValues.filter((token) => normalizedVideo.some((value) => value.includes(normalizeText(token))));
}

function formatDate(value) {
  if (!value) return '未提供';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function timestamp() {
  const date = new Date();
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate()), '-', pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = csvToRows(text.trim());
  const headers = rows.shift();
  if (!headers?.length) return [];

  return rows.map((row, index) => {
    const item = {};
    headers.forEach((header, i) => {
      item[header] = row[i] ?? '';
    });
    item.id = item.id || `imported-${index + 1}`;
    return item;
  });
}

function csvToRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows.map((r) => r.map((cell) => cell.trim()));
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))
  ].join('\n');
}
