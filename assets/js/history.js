/**
 * Freesia Transaction History Layer
 *
 * Responsibilities:
 * - Local transaction history cache
 * - History validation
 * - On-chain Swap history scanning
 * - History rendering
 * - Merge local and blockchain records
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - wallet.js
 * - leaderboard.js (LB_BLOCK_RANGE, LB_CHUNK)
 * - app.js shared state / i18n
 */

// =====================================================================
// HISTORY STATE
// =====================================================================

let txHistory = [];
let historyLoading = false;

// =====================================================================
// 13. HISTORY FUNCTIONS
// =====================================================================

function historyKey() {
    return userAddress ? 'freesia_tx_' + userAddress.toLowerCase() : null;
}

function loadHistoryCache() {
    const k = historyKey();
    if (!k) { txHistory = []; return; }
    try {
        const raw = localStorage.getItem(k);
        const parsed = raw ? JSON.parse(raw) : [];
        txHistory = (Array.isArray(parsed) ? parsed : []).filter(isValidTxEntry).slice(0, 30);
    } catch (e) { txHistory = []; }
}

function saveHistoryCache() {
    const k = historyKey();
    if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(txHistory.slice(0, 30))); } catch (e) {}
}

function isValidTxEntry(tx) {
    if (!tx || typeof tx !== 'object') return false;
    const okStr = (s) => typeof s === 'string' && s.length > 0 && s.length <= 24 && !/[<>"']/.test(s);
    if (!okStr(tx.pay) || !okStr(tx.receive)) return false;
    if (!(isFinite(tx.payVal) && tx.payVal >= 0 && tx.payVal < 1e15)) return false;
    if (!(isFinite(tx.receiveVal) && tx.receiveVal >= 0 && tx.receiveVal < 1e15)) return false;
    if (tx.hash !== null && tx.hash !== undefined && !TX_HASH_RE.test(tx.hash)) return false;
    if (tx.block !== null && tx.block !== undefined && !(isFinite(tx.block) && tx.block >= 0)) return false;
    return true;
}

function renderHistory() {
    const el = document.getElementById('txList');
    if (!el) return;
    const note = document.getElementById('txNote');
    const clearBtn = document.getElementById('txClearBtn');

    if (!state.connected) {
        setSafeContent(el, t('hist_connect'));
        if (note) note.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    if (!txHistory.length) {
        setSafeContent(el, historyLoading ? t('hist_loading') : t('hist_none'));
        if (note) note.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    el.innerHTML = '';
    txHistory.slice(0, 10).forEach(tx => {
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.style.cssText = 'align-items:flex-start; gap:8px;';
        
        const left = document.createElement('div');
        left.style.cssText = 'display:flex; flex-direction:column; gap:2px; min-width:0;';
        const pair = document.createElement('span');
        pair.style.cssText = 'font-weight:600; color:var(--text-primary);';
        pair.textContent = `${safeText(tx.pay)} → ${safeText(tx.receive)}`;
        const amt = document.createElement('span');
        amt.className = 'amt';
        amt.style.cssText = 'font-weight:500; color:var(--text-secondary); font-size:11.5px;';
        amt.textContent = `${fmt(tx.payVal, 4)} → ${fmt(tx.receiveVal, 4)}`;
        left.appendChild(pair);
        left.appendChild(amt);
        
        const right = document.createElement('div');
        if (tx.hash && TX_HASH_RE.test(tx.hash)) {
            const link = document.createElement('a');
            link.className = 'status';
            link.style.cssText = 'text-decoration:underline;';
            link.href = `${LITVM_NETWORK.blockExplorerUrls[0]}/tx/${tx.hash}`;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = t('hist_view');
            right.appendChild(link);
        } else {
            const span = document.createElement('span');
            span.className = 'status';
            span.style.cssText = 'opacity:.6;';
            span.textContent = t('hist_local');
            right.appendChild(span);
        }
        
        item.appendChild(left);
        item.appendChild(right);
        el.appendChild(item);
    });

    if (note) {
        note.style.display = '';
        setSafeContent(note, historyLoading
            ? t('hist_loading')
            : t('hist_scope').replace('{n}', LB_BLOCK_RANGE.toLocaleString('en-US')));
    }
    if (clearBtn) clearBtn.style.display = '';
}

function clearHistoryCache() {
    const k = historyKey();
    if (k) { try { localStorage.removeItem(k); } catch (e) {} }
    txHistory = [];
    renderHistory();
    refreshHistoryPanel();
}

async function refreshHistoryPanel() {
    if (!state.connected || !userAddress) { renderHistory(); return; }
    if (!txHistory.length) loadHistoryCache();
    renderHistory();
    await loadOnChainHistory();
}

async function loadOnChainHistory() {
    const p = dataProvider();
    if (!p || !userAddress) return;
    historyLoading = true;
    renderHistory();
    try {
        const latest = await p.getBlockNumber();
        const fromBlock = Math.max(0, latest - LB_BLOCK_RANGE);
        const found = [];

        for (const [, addr] of Object.entries(POOLS)) {
            const pool = new ethers.Contract(addr, POOL_ABI, p);
            for (let start = fromBlock; start <= latest; start += LB_CHUNK) {
                const end = Math.min(start + LB_CHUNK - 1, latest);
                let events = [];
                try {
                    events = await pool.queryFilter(pool.filters.Swap(userAddress), start, end);
                } catch (e) { continue; }
                for (const ev of events) {
                    try {
                        found.push({
                            pay: symbolOf(ev.args.tokenIn),
                            receive: symbolOf(ev.args.tokenOut),
                            payVal: parseFloat(ethers.formatUnits(ev.args.amountIn, 18)),
                            receiveVal: parseFloat(ethers.formatUnits(ev.args.amountOut, 18)),
                            hash: ev.transactionHash,
                            block: ev.blockNumber
                        });
                    } catch (e) {}
                }
                await sleep(60);
            }
        }
        mergeHistory(found);
    } catch (err) {
        console.error('Histori on-chain gagal dimuat:', err);
    } finally {
        historyLoading = false;
        renderHistory();
    }
}

function symbolOf(addr) {
    const a = (addr || '').toLowerCase();
    for (const [sym, tk] of Object.entries(TOKENS)) {
        if ((tk.address || '').toLowerCase() === a) return sym;
    }
    return a ? a.slice(0, 6) + '…' : '?';
}

function mergeHistory(incoming) {
    const seen = new Set(txHistory.map(x => x.hash).filter(Boolean));
    for (const tx of incoming) {
        if (tx.hash && seen.has(tx.hash)) continue;
        if (tx.hash) seen.add(tx.hash);
        txHistory.push(tx);
    }
    txHistory.sort((a, b) => (b.block || Infinity) - (a.block || Infinity));
    txHistory = txHistory.slice(0, 30);
    saveHistoryCache();
}
