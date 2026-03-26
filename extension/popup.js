const $ = (id) => document.getElementById(id);
const els = {
  mode: $('mode'),
  query: $('query'),
  maxItems: $('maxItems'),
  scrollRounds: $('scrollRounds'),
  runBtn: $('runBtn'),
  copyBtn: $('copyBtn'),
  downloadBtn: $('downloadBtn'),
  status: $('status'),
};

let latestPayload = null;

function setStatus(text) {
  els.status.textContent = text;
}

async function getActiveInstagramTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.url || !tab.url.includes('instagram.com')) {
    throw new Error('請先在目前視窗打開 Instagram 網頁版分頁');
  }
  return tab;
}

async function sendToContent(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

els.runBtn.addEventListener('click', async () => {
  try {
    setStatus('執行中...');
    const tab = await getActiveInstagramTab();
    const payload = {
      mode: els.mode.value,
      query: els.query.value.trim(),
      maxItems: Number(els.maxItems.value || 30),
      scrollRounds: Number(els.scrollRounds.value || 6),
    };
    const res = await sendToContent(tab.id, { type: 'RUN_IG_SEARCH', payload });
    latestPayload = res;
    setStatus(JSON.stringify({
      status: res?.status,
      sourceUrl: res?.sourceUrl,
      count: res?.items?.length || 0,
      note: res?.note || ''
    }, null, 2));
  } catch (err) {
    setStatus(`失敗：${err.message}`);
  }
});

els.copyBtn.addEventListener('click', async () => {
  try {
    if (!latestPayload) throw new Error('未有結果可複製');
    await navigator.clipboard.writeText(JSON.stringify(latestPayload, null, 2));
    setStatus(`已複製 JSON，結果數：${latestPayload.items?.length || 0}`);
  } catch (err) {
    setStatus(`複製失敗：${err.message}`);
  }
});

els.downloadBtn.addEventListener('click', async () => {
  try {
    if (!latestPayload) throw new Error('未有結果可下載');
    const blob = new Blob([JSON.stringify(latestPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({
      url,
      filename: `ig-video-finder-${Date.now()}.json`,
      saveAs: true,
    });
    setStatus(`已開始下載 JSON，結果數：${latestPayload.items?.length || 0}`);
  } catch (err) {
    setStatus(`下載失敗：${err.message}`);
  }
});
