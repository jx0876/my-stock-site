/* ============================================
   my_features.js — UX 擴充邏輯
   暗色 / 大字 切換、tooltip 自動標、PWA 註冊
   localStorage 儲存偏好
   ============================================ */
(function () {
  'use strict';

  const LS = {
    dark:   'mf_dark',
    large:  'mf_large',
    pinned: 'mf_pinned',   // ["2330","2317",...]
    names:  'mf_names',    // {"2330":"台積電",...} 名稱快取
  };

  // ── 1. 載入儲存的偏好 ─────────────────
  function loadPrefs() {
    if (localStorage.getItem(LS.dark)  === '1') document.body.classList.add('mf-dark');
    if (localStorage.getItem(LS.large) === '1') document.body.classList.add('mf-large');
    syncButtons();
  }

  function syncButtons() {
    const dBtn = document.getElementById('mfDarkBtn');
    const lBtn = document.getElementById('mfLargeBtn');
    if (dBtn) dBtn.classList.toggle('active', document.body.classList.contains('mf-dark'));
    if (lBtn) lBtn.classList.toggle('active', document.body.classList.contains('mf-large'));
  }

  // ── 2. 切換功能 ─────────────────
  function toggleDark() {
    const on = document.body.classList.toggle('mf-dark');
    localStorage.setItem(LS.dark, on ? '1' : '0');
    syncButtons();
  }
  function toggleLarge() {
    const on = document.body.classList.toggle('mf-large');
    localStorage.setItem(LS.large, on ? '1' : '0');
    syncButtons();
  }

  // ── 3. 指標 tooltip 字典 ─────────────────
  const TIPS = {
    'KD':       'KD 指標：\n判斷股票過熱或超賣。\nK<20 過冷（可能反彈）\nK>80 過熱（可能回檔）',
    'RSI':      'RSI 相對強弱：\n0~100 範圍。\n<30 超賣、>70 超買。\n極端值常出現反轉。',
    'MA':       '移動平均線：\nMA20 = 近 20 日平均價。\n股價站上 MA20 = 短期偏多。',
    'MA5':      'MA5 = 近 5 日平均收盤價。\n短線參考。',
    'MA20':     'MA20 = 近 20 日平均收盤價。\n中短期支撐 / 壓力。',
    'MA60':     'MA60 = 近 60 日平均收盤價（季線）。\n中期支撐 / 壓力，跌破常代表趨勢轉弱。',
    'MACD':     'MACD：\n判斷趨勢轉折。\n黃金交叉（DIF 上穿）偏多，\n死亡交叉偏空。',
    'DIF':      'MACD DIF 線：\n短期動能。',
    'DEA':      'MACD DEA 線（信號線）：\nDIF 的平滑線，與 DIF 交叉時產生訊號。',
    '量比':     '量比：\n今日量 ÷ 近期平均量。\n>1.5 量增、>2 量爆。',
    '布林':     '布林通道：\n價格在 +2 / -2 標準差區間遊走。\n碰上軌過熱、碰下軌過冷。',
    '黃金交叉': '黃金交叉：\n短期均線（如 MA5）向上穿過長期均線（如 MA20），偏多訊號。',
    '死亡交叉': '死亡交叉：\n短期均線向下跌破長期均線，偏空訊號。',
  };

  // 自動掃描頁面文字，找關鍵字加 tooltip
  function autoTagTooltips(root) {
    if (!root) return;
    const keys = Object.keys(TIPS);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p || p.closest('[data-mf-tagged]')) return NodeFilter.FILTER_REJECT;
        if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
        // 只標短文字（避免句子）
        if (node.nodeValue.length > 30) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      for (const key of keys) {
        // 精確匹配（前後可有空白標點）
        const re = new RegExp(`(^|[^\\w\\u4e00-\\u9fff])(${escapeRe(key)})(?=$|[^\\w\\u4e00-\\u9fff])`);
        if (re.test(node.nodeValue)) {
          const parent = node.parentElement;
          if (parent && !parent.hasAttribute('data-mf-tip')) {
            parent.setAttribute('data-mf-tip', TIPS[key]);
            parent.setAttribute('data-mf-tagged', '1');
          }
          break;
        }
      }
    }
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ── 4. 注入工具列 ─────────────────
  function injectToolbar() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('mfToolbar')) return;
    const placeholder = header.querySelector('.text-xs.text-slate-400') || header.querySelector('div:last-child');
    const bar = document.createElement('div');
    bar.className = 'mf-toolbar';
    bar.id = 'mfToolbar';
    bar.innerHTML = `
      <button id="mfDarkBtn"  class="mf-btn" title="暗色模式">🌙 <span class="mf-btn-label">暗色</span></button>
      <button id="mfLargeBtn" class="mf-btn" title="大字模式">🔍 <span class="mf-btn-label">大字</span></button>
      <button id="mfInstallBtn" class="mf-btn" title="安裝到桌面" style="display:none">📱 <span class="mf-btn-label">安裝</span></button>
    `;
    if (placeholder && placeholder.parentElement) {
      placeholder.parentElement.insertBefore(bar, placeholder);
    } else {
      header.appendChild(bar);
    }
    document.getElementById('mfDarkBtn').addEventListener('click', toggleDark);
    document.getElementById('mfLargeBtn').addEventListener('click', toggleLarge);
  }

  // ── 5. PWA 安裝提示 ─────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('mfInstallBtn');
    if (btn) {
      btn.style.display = '';
      btn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') btn.style.display = 'none';
        deferredPrompt = null;
      };
    }
  });

  // ── 6. Service Worker（PWA 必要）─────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // ── 6.5 釘選卡片 ─────────────────
  function getPinned() {
    try { return JSON.parse(localStorage.getItem(LS.pinned) || '[]'); }
    catch { return []; }
  }
  function setPinned(arr) {
    localStorage.setItem(LS.pinned, JSON.stringify([...new Set(arr)]));
  }
  function getNames() {
    try { return JSON.parse(localStorage.getItem(LS.names) || '{}'); }
    catch { return {}; }
  }
  function saveName(code, name) {
    if (!name) return;
    const m = getNames();
    m[code] = name;
    localStorage.setItem(LS.names, JSON.stringify(m));
  }

  // 一次性抓全市場名稱對照（FinMind TaiwanStockInfo，~7000 檔，cache 永久）
  let _nameMapPromise = null;
  async function ensureNameMap() {
    const cur = getNames();
    // 已有 > 1000 檔視為完整，直接用
    if (Object.keys(cur).length > 1000) return cur;
    if (_nameMapPromise) return _nameMapPromise;
    _nameMapPromise = (async () => {
      try {
        const r = await fetch('https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo');
        const j = await r.json();
        const data = j.data || [];
        const m = getNames();
        for (const row of data) {
          if (row.stock_id && row.stock_name) m[row.stock_id] = row.stock_name;
        }
        localStorage.setItem(LS.names, JSON.stringify(m));
        return m;
      } catch { return getNames(); }
    })();
    return _nameMapPromise;
  }

  // 名字到位後，更新已渲染卡片標題
  async function refreshCardNames() {
    const map = await ensureNameMap();
    document.querySelectorAll('.mf-pin-card').forEach((card) => {
      const code = card.dataset.code;
      const title = card.querySelector('.font-black.text-slate-800.text-sm.truncate');
      if (title && map[code]) title.textContent = map[code];
    });
  }

  function signalLabel(pct) {
    if (pct >= 3)  return { txt: '🔴 強勢上攻', cls: 'text-rose-600' };
    if (pct >= 1)  return { txt: '🟢 可考慮買進', cls: 'text-rose-600' };
    if (pct >= -1) return { txt: '🟡 中性觀望', cls: 'text-yellow-600' };
    if (pct >= -3) return { txt: '🟢 偏向觀察', cls: 'text-rose-600' };
    return { txt: '⚠️ 弱勢回檔', cls: 'text-green-600' };
  }

  // 30 秒 cache，避免短時間重打
  const _priceCache = new Map();   // code -> { ts, data }
  const PRICE_TTL = 30000;

  async function fetchLast(code) {
    const cached = _priceCache.get(code);
    if (cached && Date.now() - cached.ts < PRICE_TTL) return cached.data;

    const end   = new Date().toISOString().slice(0,10);
    const start = new Date(Date.now() - 20*86400000).toISOString().slice(0,10);
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${code}&start_date=${start}&end_date=${end}`;
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j.status && j.status !== 200) {
        // FinMind 回錯誤（配額、IP 擋等）
        return { error: j.msg || 'API 忙碌' };
      }
      const d = j.data || [];
      if (d.length < 1) return null;
      const last = d[d.length-1];
      const prev = d.length >= 2 ? d[d.length-2] : last;
      const price = +last.close;
      const change = price - +prev.close;
      const pct = (+prev.close) ? (change / +prev.close * 100) : 0;
      const data = { price, change, pct };
      _priceCache.set(code, { ts: Date.now(), data });
      return data;
    } catch { return null; }
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function buildCard(code) {
    const name = getNames()[code] || code;
    return `
      <div class="mf-pin-card screen-card relative text-left bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl p-3 transition cursor-pointer" data-code="${code}">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="font-black text-slate-800 text-sm truncate">${name}</div>
          <button class="mf-unpin text-slate-400 hover:text-red-500 text-xs px-1" data-code="${code}" title="移除釘選">✕</button>
        </div>
        <div class="font-mono text-xs text-slate-500 mb-1.5">${code}</div>
        <div class="flex items-baseline gap-2 mb-1.5">
          <span class="font-black text-slate-800 mf-price">—</span>
          <span class="text-xs font-bold mf-chg">—</span>
        </div>
        <div class="text-xs font-bold mf-signal text-yellow-600">🟡 中性觀望</div>
      </div>
    `;
  }

  async function refreshCard(card) {
    const code = card.dataset.code;
    const r = await fetchLast(code);
    if (!r) {
      card.querySelector('.mf-price').textContent = '無資料';
      return false;
    }
    if (r.error) {
      card.querySelector('.mf-price').textContent = '⏳';
      card.querySelector('.mf-chg').textContent = 'API 忙碌';
      return false;
    }
    const arrow = r.change > 0 ? '▲' : (r.change < 0 ? '▼' : '─');
    const cls   = r.change > 0 ? 'signal-bull' : (r.change < 0 ? 'signal-bear' : 'signal-neutral');
    card.querySelector('.mf-price').textContent = r.price.toFixed(2);
    const chg = card.querySelector('.mf-chg');
    chg.textContent = `${arrow} ${Math.abs(r.change).toFixed(2)} (${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%)`;
    chg.className = `text-xs font-bold ${cls}`;
    const sig = signalLabel(r.pct);
    const sigEl = card.querySelector('.mf-signal');
    sigEl.textContent = sig.txt;
    sigEl.className = `text-xs font-bold ${sig.cls}`;
    return true;
  }

  // 接管原站 #pinnedGrid：把陽春卡片換成豐富卡片（含價格 + 漲跌 + 訊號）
  let _enhancing = false;
  async function enhancePinnedGrid() {
    const grid = document.getElementById('pinnedGrid');
    if (!grid || _enhancing) return;
    // 已被我換過就跳過
    if (grid.querySelector('.mf-pin-card')) return;
    const codes = Array.from(grid.querySelectorAll('[data-code]'))
                       .map((el) => el.dataset.code);
    if (codes.length === 0) return;
    _enhancing = true;
    // 把 grid class 也對齊本日適合進場（gap-2.5 而非 gap-3）
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5';
    grid.innerHTML = codes.map(buildCard).join('');
    // 綁移除：直接寫原站 key（taiwan_stock_pins_v1）+ 重觸發原站 renderPins
    grid.querySelectorAll('.mf-unpin').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = b.dataset.code;
        const KEY = 'taiwan_stock_pins_v1';
        try {
          const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
          localStorage.setItem(KEY, JSON.stringify(arr.filter((c) => c !== code)));
        } catch {}
        // 立刻 DOM 移除
        b.closest('.mf-pin-card').remove();
        if (!grid.querySelector('.mf-pin-card')) {
          const sec = document.getElementById('pinnedSection');
          if (sec) sec.classList.add('hidden');
        }
        // 觸發原站重渲染（更新它內部狀態，例如☆按鈕變回未釘選）
        if (typeof window.renderPins === 'function') {
          try { window.renderPins(); } catch {}
        }
      });
    });
    // 點卡片 → 觸發查詢
    grid.querySelectorAll('.mf-pin-card').forEach((c) => {
      c.addEventListener('click', (e) => {
        if (e.target.closest('.mf-unpin')) return;
        const inp = document.getElementById('stockInput');
        const form = document.getElementById('searchForm');
        if (inp && form) {
          inp.value = c.dataset.code;
          form.requestSubmit ? form.requestSubmit() : form.submit();
        }
      });
    });
    // 抓即時價格（逐檔 + 間隔 250ms，避免撞 FinMind 匿名限額）
    (async () => {
      const list = Array.from(grid.querySelectorAll('.mf-pin-card'));
      for (let i = 0; i < list.length; i++) {
        await refreshCard(list[i]);
        if (i < list.length - 1) await sleep(250);
      }
    })();
    // 補名稱（fire and forget）
    refreshCardNames();
    _enhancing = false;
  }

  // 自動快取查詢過的股票名稱（從 #lastUpdate 或 input 旁的顯示讀）
  function watchNameUpdates() {
    const obs = new MutationObserver(() => {
      // 嘗試從頁面找「代號 + 名稱」配對（例如 h2 / strong / b 內容）
      document.querySelectorAll('h1,h2,h3,strong,b').forEach((el) => {
        const m = el.textContent.match(/^([^\d\s]+)\s*\(?(\d{4,6}[A-Z]?)\)?$/) ||
                  el.textContent.match(/^(\d{4,6}[A-Z]?)\s+([^\d\s]+)$/);
        if (m) {
          const [code, name] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
          if (code && name) saveName(code, name);
        }
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ── 6.8 浮動更新按鈕 ─────────────────
  function injectFab() {
    if (document.getElementById('mfFab')) return;
    const fab = document.createElement('button');
    fab.id = 'mfFab';
    fab.className = 'mf-fab';
    fab.title = '更新所有釘選股價';
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"></path><polyline points="21 3 21 9 15 9"></polyline></svg>`;
    const toast = document.createElement('div');
    toast.id = 'mfFabToast';
    toast.className = 'mf-fab-toast';
    document.body.appendChild(fab);
    document.body.appendChild(toast);

    fab.addEventListener('click', async () => {
      if (fab.classList.contains('spinning')) return;
      const cards = Array.from(document.querySelectorAll('.mf-pin-card'));
      if (cards.length === 0) {
        showToast('沒有釘選股票');
        return;
      }
      fab.classList.add('spinning');
      let ok = 0, fail = 0;
      // 逐檔抓 + 間隔 250ms 避免撞 FinMind 匿名限額
      for (let i = 0; i < cards.length; i++) {
        showToast(`更新 ${i + 1}/${cards.length}...`);
        const r = await refreshCard(cards[i]);
        r ? ok++ : fail++;
        if (i < cards.length - 1) await sleep(250);
      }
      fab.classList.remove('spinning');
      if (fail === 0) showToast(`✅ 已更新 ${ok} 檔`);
      else showToast(`⚠️ ${ok} 成功 / ${fail} 失敗（API 忙）`);
    });

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => toast.classList.remove('show'), 1800);
    }
  }

  // ── 7. 啟動 ─────────────────
  function init() {
    injectToolbar();
    injectFab();
    watchNameUpdates();
    ensureNameMap();   // 背景預抓全市場名稱
    loadPrefs();
    autoTagTooltips(document.body);
    // 監看原站 #pinnedGrid 內容變化 → 立即接管渲染
    const tryEnhance = () => enhancePinnedGrid();
    const pinObs = new MutationObserver(tryEnhance);
    const grid = document.getElementById('pinnedGrid');
    if (grid) pinObs.observe(grid, { childList: true });
    tryEnhance();
    // 也定期掃（保險，若原站延遲注入）
    setTimeout(tryEnhance, 500);
    setTimeout(tryEnhance, 2000);
    // 內容會被原 JS 動態替換，觀察 DOM 變化重新標
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) autoTagTooltips(node);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
