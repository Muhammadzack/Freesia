// =====================================================================
// 1–2. SHARED UTILITIES DIPINDAHKAN KE assets/js/utils.js
// =====================================================================

// =====================================================================
// 3–4. KONFIGURASI DIPINDAHKAN KE assets/js/config.js
// =====================================================================

// =====================================================================
// 5. STATE VARIABLES
// =====================================================================

// Provider dan wallet state dipindahkan ke assets/js/wallet.js.

let state = {
    pay: 'USDC',
    receive: 'DAI',
    slippage: 0.5,
    connected: false,
    pickerTarget: null
};

let poolReserves = { a: 0, b: 0, tokenA: null, tokenB: null, loaded: false };

// =====================================================================
// 6. HELPER DOMAIN FUNCTIONS
// Helper murni dipindahkan ke assets/js/utils.js.
// =====================================================================

function poolFor(symA, symB) {
    return POOLS[`${symA}-${symB}`] || POOLS[`${symB}-${symA}`] || null;
}

// currentPoolAddress dipindahkan ke assets/js/pool.js.
// Staking helpers dipindahkan ke assets/js/staking.js.

// =====================================================================
// 7. WALLET DETECTION DIPINDAHKAN KE assets/js/wallet.js
// =====================================================================

// =====================================================================
// 8. TOAST & ERROR HANDLING DIPINDAHKAN KE assets/js/ui.js
// =====================================================================

// =====================================================================
// 9. I18N DIPINDAHKAN KE assets/js/i18n.js
// =====================================================================

// =====================================================================
// 10. CORE SWAP FUNCTIONS
// =====================================================================

async function loadPoolReserves() {
    const poolAddress = poolFor(state.pay, state.receive);
    const p = dataProvider();
    if (!poolAddress || !p) { poolReserves.loaded = false; return false; }
    try {
        return await rpcQueue.add(async () => {
            const pool = new ethers.Contract(poolAddress, POOL_ABI, p);
            const [rA, rB, tA, tB, ts] = await Promise.all([
                pool.reserveA(), pool.reserveB(), pool.tokenA(), pool.tokenB(), pool.totalSupply()
            ]);
            poolReserves = {
                a: parseFloat(ethers.formatUnits(rA, 18)),
                b: parseFloat(ethers.formatUnits(rB, 18)),
                totalSupply: parseFloat(ethers.formatUnits(ts, 18)),
                tokenA: tA.toLowerCase(),
                tokenB: tB.toLowerCase(),
                loaded: true
            };
            return true;
        });
    } catch (err) {
        console.error('Gagal memuat reserve pool:', err);
        poolReserves.loaded = false;
        return false;
    }
}

// =====================================================================
// SWAP QUOTE & RISK CALCULATIONS DIPINDAHKAN KE assets/js/swap.js
// =====================================================================

// =====================================================================
// 10–11. SWAP UI & EXECUTION DIPINDAHKAN KE assets/js/swap.js
// =====================================================================

// =====================================================================
// 12. WALLET CONNECTION DIPINDAHKAN KE assets/js/wallet.js
// =====================================================================

// =====================================================================
// 13. TRANSACTION HISTORY DIPINDAHKAN KE assets/js/history.js
// =====================================================================

// =====================================================================
// 14–16. APPLICATION UI DIPINDAHKAN KE assets/js/ui.js
// =====================================================================

// =====================================================================
// 17. SWAP CHART DIPINDAHKAN KE assets/js/swap.js
// =====================================================================

// =====================================================================
// 18–20. POOL & LIQUIDITY DIPINDAHKAN KE assets/js/pool.js
// =====================================================================

// =====================================================================
// 21. EARN & STAKING DIPINDAHKAN KE assets/js/staking.js
// =====================================================================

// =====================================================================
// 22. PORTFOLIO DIPINDAHKAN KE assets/js/portfolio.js
// =====================================================================

// =====================================================================
// 23. LEADERBOARD DIPINDAHKAN KE assets/js/leaderboard.js
// =====================================================================

// =====================================================================
// 24. STATS DIPINDAHKAN KE assets/js/stats.js
// =====================================================================

// =====================================================================
// 25. FAUCET DIPINDAHKAN KE assets/js/faucet.js
// =====================================================================

// =====================================================================
// 26. IL CALCULATOR
// =====================================================================

function renderIL(sliderVal) {
    const pct = Number(sliderVal);
    const r = 1 + pct / 100;
    const lbl = document.getElementById('ilPctLabel');
    const moveEl = document.getElementById('ilPriceMove');
    const resEl = document.getElementById('ilResult');
    const noteEl = document.getElementById('ilNote');
    if (!resEl) return;

    if (lbl) lbl.textContent = (pct >= 0 ? '+' : '') + pct + '%';
    if (moveEl) moveEl.textContent = (pct >= 0 ? '+' : '') + pct + '%';

    let ilPct = 0;
    if (r > 0) {
        const il = (2 * Math.sqrt(r)) / (1 + r) - 1;
        ilPct = il * 100;
    }
    const shown = Math.abs(ilPct);
    resEl.textContent = '-' + shown.toFixed(2) + '%';

    let color = 'var(--accent)';
    let note = t('il_note_small');
    if (shown >= 5) {
        color = 'var(--danger)';
        note = t('il_note_big');
    } else if (shown >= 1) {
        color = 'var(--warning)';
        note = t('il_note_mid');
    } else if (pct === 0) {
        note = t('il_note_zero');
    }
    resEl.style.color = color;
    if (noteEl) noteEl.textContent = note;
}

// =====================================================================
// 27. THEME FUNCTIONS
// =====================================================================

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyThemeIcon() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const isLight = currentTheme() === 'light';
    btn.innerHTML = isLight ?
        '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a1 1 0 0 0-1.3-1.2A10.3 10.3 0 1 0 21.7 15.5a1 1 0 0 0-1.2-1.3z"/></svg>' :
        '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 2.4v2.4M12 19.2v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/></g></svg>';
    btn.title = isLight ? 'Ganti ke tema gelap' : 'Ganti ke tema terang';
}

function toggleTheme() {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('freesia_theme', next); } catch (e) {}
    applyThemeIcon();
}

applyThemeIcon();

// =====================================================================
// 28. STATUS BAR FUNCTIONS
// =====================================================================

async function pingLatency() {
    const dot = document.getElementById('netDot');
    const lat = document.getElementById('netLatency');

    if (!dot || !lat) return;

    try {
        let diagnostics =
            typeof getRpcDiagnostics === 'function'
                ? getRpcDiagnostics()
                : null;

        let preferred = diagnostics?.endpoints?.find(
            item =>
                item.id === diagnostics.preferredRpc &&
                item.healthy === true
        );

        // Health monitor mungkin belum selesai saat page baru load.
        if (
            (!preferred || preferred.latency == null) &&
            typeof refreshRpcHealth === 'function'
        ) {
            await refreshRpcHealth();

            diagnostics =
                typeof getRpcDiagnostics === 'function'
                    ? getRpcDiagnostics()
                    : null;

            preferred = diagnostics?.endpoints?.find(
                item =>
                    item.id === diagnostics.preferredRpc &&
                    item.healthy === true
            );
        }

        if (!preferred || preferred.latency == null) {
            throw new Error(
                'No healthy RPC latency available'
            );
        }

        const ms = preferred.latency;

        lat.textContent = ms + ' ms';

        let color = 'var(--accent)';

        // RPC latency thresholds tuned for mobile/browser use.
        if (ms >= 1500) {
            color = 'var(--danger)';
        } else if (ms >= 800) {
            color = 'var(--warning)';
        }

        dot.style.background = color;
        dot.style.boxShadow =
            '0 0 6px ' + color;

        dot.title =
            'RPC: ' +
            (preferred.label || preferred.id) +
            ' · ' +
            ms +
            ' ms';

    } catch (e) {
        lat.textContent = t('net_disconnected');

        dot.style.background =
            'var(--danger)';

        dot.style.boxShadow = 'none';

        dot.title = 'RPC unavailable';
    }
}

async function refreshStatusPrices() {
    // Simplified - just show placeholder
    const els = ['pxLTC', 'pxETH', 'pxBTC'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

function startStatusBar() {
    if (typeof startRpcHealthMonitor === 'function') {
        startRpcHealthMonitor();
    }

    pingLatency();
    refreshStatusPrices();
    setInterval(() => { if (!document.hidden) pingLatency(); }, 15000);
    setInterval(() => { if (!document.hidden) refreshStatusPrices(); }, 60000);
}

// =====================================================================
// 29. INTRO FUNCTIONS
// =====================================================================

const INTRO_KEY = 'freesia_intro_seen';

function dismissIntro() {
    const el = document.getElementById('introOverlay');
    if (el) el.classList.remove('show');
    try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
    document.removeEventListener('keydown', introKey);
}

function introKey(e) { if (e.key === 'Escape') dismissIntro(); }

function maybeShowIntro() {
    let seen = null;
    try { seen = localStorage.getItem(INTRO_KEY); } catch (e) { seen = '1'; }
    if (seen) return;
    const el = document.getElementById('introOverlay');
    if (!el) return;
    el.classList.add('show');
    el.addEventListener('click', (e) => { if (e.target === el) dismissIntro(); });
    document.addEventListener('keydown', introKey);
    const btn = document.getElementById('introStart');
    if (btn) setTimeout(() => btn.focus(), 120);
}

// =====================================================================
// 30. FOOTER LINKS
// =====================================================================

const LINKS = {
    report: 'https://github.com/Muhammadzack/Freesia/issues/new/choose',
    landing: 'https://freesiadex.xyz',
    x: 'https://x.com/freesiadex',
    github: 'https://github.com/Muhammadzack',
    docs: 'https://docs.freesiadex.xyz'
};
const BUILDER_HANDLE = '@0xZackBh';
const BUILDER_X = 'https://x.com/0xZackBh';

const ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 2.8 11h2.4v9.2h5.2v-5.6h3.2v5.6h5.2V11h2.4z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.79 1.07.79 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>',
    docs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5zM8 12h8v1.6H8zm0 3.4h8V17H8zm0-6.8h4v1.6H8z"/></svg>',
    verify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2 4.6 5.3v5.4c0 4.6 3.1 8.9 7.4 10.1 4.3-1.2 7.4-5.5 7.4-10.1V5.3z"/><path d="m8.8 12.1 2.2 2.2 4.2-4.4" fill="none" stroke="var(--bg-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    log: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zm3.4 4.4v1.7h7.2V7.4zm0 4.1v1.7h7.2v-1.7zm0 4.1v1.7h4.6v-1.7z"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6 22.2 20.4H1.8zM11.1 9v5.4h1.8V9zm0 6.9v1.9h1.8v-1.9z"/></svg>'
};

function renderFooterLinks() {
    const nav = document.getElementById('siteLinks');
    if (!nav) return;

    const external = [
        { key:'x', label:'X', url: LINKS.x },
        { key:'github', label:'GitHub', url: LINKS.github },
        { key:'docs', label:'Docs', url: LINKS.docs }
    ].filter(it => it.url && it.url.trim() !== '');

    const homeHtml = LINKS.landing
        ? `<a class="site-link" href="${LINKS.landing}" title="Kembali ke beranda">
               ${ICONS.home}<span>Beranda</span>
           </a>`
        : '';

    const proofHtml = `
        <a class="site-link" href="/verify">
            ${ICONS.verify}<span data-i18n="nav_verify">Verifikasi</span>
        </a>
        <a class="site-link" href="/insiden">
            ${ICONS.log}<span data-i18n="nav_log">Insiden</span>
        </a>
        <a class="site-link" href="${LINKS.report}" target="_blank" rel="noopener noreferrer">
            ${ICONS.report}<span data-i18n="nav_report">Laporkan masalah</span>
        </a>`;

    nav.innerHTML = homeHtml + proofHtml + external.map(it =>
        `<a class="site-link" href="${it.url}" target="_blank" rel="noopener noreferrer" title="${it.label}">
            ${ICONS[it.key] || ''}<span>${it.label}</span>
         </a>`).join('');

    const builder = document.getElementById('builderLink');
    if (builder) {
        builder.textContent = BUILDER_HANDLE;
        builder.href = BUILDER_X || '#';
    }

    const logo = document.getElementById('logoLink');
    if (logo && LINKS.landing) logo.href = LINKS.landing;
}

renderFooterLinks();

// =====================================================================
// 31. INITIALIZATION
// =====================================================================

// Watch for wallet
(function watchForWallet() {
    const DEADLINE_MS = 3000;
    const INTERVAL_MS = 250;
    let waited = 0;
    let listenersAttached = false;

    function attachListeners(eth) {
        if (listenersAttached) return;
        if (eth && typeof eth.on === 'function') {
            eth.on('accountsChanged', () => window.location.reload());
            eth.on('chainChanged', () => window.location.reload());
            listenersAttached = true;
        }
    }

    const timer = setInterval(() => {
        try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}
        const eth = getEthereumProvider();
        if (eth) {
            attachListeners(eth);
            hideWalletWarning();
            clearInterval(timer);
            return;
        }
        waited += INTERVAL_MS;
        if (waited >= DEADLINE_MS) {
            clearInterval(timer);
            showWalletWarning();
        }
    }, INTERVAL_MS);
})();

// Bootstrap public data
(async function bootstrapPublicData() {
    const ok = await loadPoolReserves();
    if (ok) {
        refreshLabels();
        drawImpactChart();
        await updateFromPay();
    } else {
        console.warn('Reserve pool belum bisa dimuat dari RPC publik.');
        drawImpactChart();
    }
})();

// Refresh pool data periodically
setInterval(async () => {
    if (document.hidden) return;
    const ok = await loadPoolReserves();
    if (ok) { refreshLabels(); drawImpactChart(); }
}, 30000);

// Init language
(function initLang() {
    let saved = 'id';
    try { saved = localStorage.getItem('freesia_lang') || 'id'; } catch (e) {}
    setLang(saved);
})();

// Start status bar
startStatusBar();

// Show intro
maybeShowIntro();

// Initial refresh
refreshLabels();
validateBalance(parseNum(document.getElementById('payInput')?.value || '0'));

LOG('Freesia DEX initialized with security improvements');
LOG('RPC Queue: 3 requests per 500ms');
LOG('Debug mode:', DEBUG);
