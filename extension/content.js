const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'RUN_IG_SEARCH') {
    run(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'error', note: err.message, items: [] }));
    return true;
  }
});

async function run(payload) {
  const { mode, query, maxItems = 30, scrollRounds = 6 } = payload || {};
  if (!location.hostname.includes('instagram.com')) {
    throw new Error('目前分頁不是 Instagram');
  }

  if (mode === 'hashtag') {
    const tag = (query || '').replace(/^#/, '').trim();
    if (!tag) throw new Error('Hashtag 模式需要輸入搜尋字');
    location.href = `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
    await sleep(3500);
  } else if (mode === 'keyword') {
    if (!query) throw new Error('Keyword 模式需要輸入搜尋字');
    await tryKeywordSearch(query);
  }

  await autoScroll(scrollRounds);
  const items = await collectCurrentPage(maxItems);
  return {
    status: 'ok',
    sourceUrl: location.href,
    collectedAt: new Date().toISOString(),
    mode,
    query,
    items,
    note: mode === 'keyword'
      ? 'Keyword 模式依賴 Instagram 畫面結構，若結果少可改用 hashtag 模式或手動打開結果頁後再用 collect 模式。'
      : '收集完成。'
  };
}

async function tryKeywordSearch(query) {
  const searchInput = findSearchInput();
  if (!searchInput) {
    throw new Error('找不到 Instagram 搜尋框。你可以先手動打開搜尋欄，再重試。');
  }

  searchInput.focus();
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);

  for (const ch of query) {
    searchInput.value += ch;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(80);
  }

  searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  await sleep(2200);

  const clickable = Array.from(document.querySelectorAll('a'))
    .find(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').toLowerCase();
      return href.includes('/explore/tags/') || text.includes(query.toLowerCase());
    });
  if (clickable) {
    clickable.click();
    await sleep(3000);
  }
}

function findSearchInput() {
  const selectors = [
    'input[placeholder*="Search"]',
    'input[aria-label*="Search"]',
    'input[placeholder*="搜尋"]',
    'input[aria-label*="搜尋"]',
    'input[placeholder*="search"]',
    'input[aria-label*="search"]',
    'input[type="text"]'
  ];
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

async function autoScroll(rounds) {
  let sameHeightCount = 0;
  let lastHeight = 0;
  for (let i = 0; i < rounds; i++) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(1800);
    const h = document.body.scrollHeight;
    if (h === lastHeight) sameHeightCount++;
    else sameHeightCount = 0;
    lastHeight = h;
    if (sameHeightCount >= 2) break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(500);
}

async function collectCurrentPage(maxItems) {
  const anchors = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]'));
  const seen = new Set();
  const items = [];

  for (const a of anchors) {
    const href = a.href;
    if (!href || seen.has(href)) continue;
    seen.add(href);

    const img = a.querySelector('img');
    const title = img?.alt || a.getAttribute('aria-label') || '';
    const caption = getNearbyText(a) || title;
    const thumbnailUrl = img?.src || '';
    const dominantColorName = thumbnailUrl ? await safeColorFromUrl(thumbnailUrl) : 'unknown';

    items.push({
      platform: 'Instagram',
      url: href,
      title,
      caption,
      altText: img?.alt || '',
      thumbnailUrl,
      dominantColorName,
      pageText: caption,
      collectedAt: new Date().toISOString(),
      owner: findOwnerFromLink(href),
    });

    if (items.length >= maxItems) break;
  }

  return items;
}

function getNearbyText(anchor) {
  const chunks = new Set();
  const imgAlt = anchor.querySelector('img')?.alt;
  if (imgAlt) chunks.add(imgAlt);
  const aria = anchor.getAttribute('aria-label');
  if (aria) chunks.add(aria);

  const parent = anchor.closest('article, div');
  if (parent) {
    const txt = (parent.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) chunks.add(txt.slice(0, 220));
  }
  return Array.from(chunks).join(' · ');
}

function findOwnerFromLink(href) {
  try {
    const u = new URL(href);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] || '';
  } catch {
    return '';
  }
}

async function safeColorFromUrl(url) {
  try {
    const resp = await fetch(url, { credentials: 'omit' });
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(24, 24);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 30) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (!count) return 'unknown';
    return rgbToColorName(Math.round(r / count), Math.round(g / count), Math.round(b / count));
  } catch {
    return 'unknown';
  }
}

function rgbToColorName(r, g, b) {
  const palette = {
    red: [220, 50, 47],
    orange: [243, 156, 18],
    yellow: [241, 196, 15],
    green: [46, 204, 113],
    blue: [52, 152, 219],
    purple: [155, 89, 182],
    pink: [232, 126, 164],
    brown: [141, 110, 99],
    black: [45, 45, 45],
    white: [236, 240, 241],
    gray: [149, 165, 166],
  };

  let winner = 'unknown';
  let best = Infinity;
  for (const [name, [pr, pg, pb]] of Object.entries(palette)) {
    const d = Math.sqrt((r-pr)**2 + (g-pg)**2 + (b-pb)**2);
    if (d < best) {
      best = d;
      winner = name;
    }
  }
  return winner;
}
