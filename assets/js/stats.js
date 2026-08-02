/**
 * Freesia Stats Layer
 *
 * Responsibilities:
 * - Scan on-chain Swap activity
 * - Count active wallets and swaps
 * - Estimate pool TVL
 * - Render activity chart
 * - Render per-pool activity breakdown
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - wallet.js
 * - leaderboard.js (LB_BLOCK_RANGE, LB_CHUNK)
 * - app.js i18n state
 */

// =====================================================================
// STATS
// =====================================================================

// =====================================================================
// 24. STATS FUNCTIONS
// =====================================================================

const ST_BUCKETS = 14;

async function refreshStatsView() {
    const p = dataProvider();
    if (!p) return;
    const phaseEl = document.getElementById('statsPhase');
    const breakdownEl = document.getElementById('stPoolBreakdown');
    if (breakdownEl) setSafeContent(breakdownEl, t('lb_reading'));

    try {
        const latest = await p.getBlockNumber();
        const fromBlock = Math.max(0, latest - LB_BLOCK_RANGE);
        const wallets = new Set();
        const perPool = {};
        const buckets = new Array(ST_BUCKETS).fill(0);
        const span = Math.max(1, latest - fromBlock);
        let totalSwaps = 0;

        for (const [key, addr] of Object.entries(POOLS)) {
            perPool[key] = { count: 0, volume: 0 };
            const pool = new ethers.Contract(addr, POOL_ABI, p);
            for (let start = fromBlock; start <= latest; start += LB_CHUNK) {
                const end = Math.min(start + LB_CHUNK - 1, latest);
                let events = [];
                try {
                    events = await pool.queryFilter(pool.filters.Swap(), start, end);
                } catch (e) { continue; }
                for (const ev of events) {
                    const trader = (ev.args?.trader || '').toLowerCase();
                    if (trader) wallets.add(trader);
                    totalSwaps++;
                    perPool[key].count++;
                    try {
                        const amt = parseFloat(ethers.formatUnits(ev.args.amountIn, 18));
                        if (isFinite(amt)) perPool[key].volume += amt;
                    } catch (e) {}
                    const idx = Math.min(ST_BUCKETS - 1,
                        Math.floor(((ev.blockNumber - fromBlock) / span) * ST_BUCKETS));
                    if (idx >= 0) buckets[idx]++;
                }
                await sleep(60);
            }
        }

        let tvl = 0, activePools = 0;
        for (const [, addr] of Object.entries(POOLS)) {
            try {
                const pool = new ethers.Contract(addr, POOL_ABI, p);
                const [rA, rB] = await Promise.all([pool.reserveA(), pool.reserveB()]);
                const a = parseFloat(ethers.formatUnits(rA, 18));
                const b = parseFloat(ethers.formatUnits(rB, 18));
                if (a > 0 && b > 0) activePools++;
                tvl += a + b;
            } catch (e) {}
        }

        document.getElementById('stWallets').textContent = wallets.size.toLocaleString('en-US');
        document.getElementById('stSwaps').textContent = totalSwaps.toLocaleString('en-US');
        document.getElementById('stTvl').textContent = fmt(tvl, 0);
        document.getElementById('stPools').textContent = `${activePools}/${Object.keys(POOLS).length}`;

        if (phaseEl) {
            if (wallets.size <= 1) {
                phaseEl.style.display = '';
                phaseEl.innerHTML = t('st_phase');
            } else {
                phaseEl.style.display = 'none';
            }
        }

        renderStatsChart(buckets);
        renderPoolBreakdown(perPool, totalSwaps);

        const scope = document.getElementById('stScopeNote');
        if (scope) {
            scope.textContent = (LANG === 'en'
                ? `Read from the last ~${LB_BLOCK_RANGE.toLocaleString('en-US')} blocks on LitVM Testnet. Older activity isn't covered.`
                : `Dibaca dari ~${LB_BLOCK_RANGE.toLocaleString('en-US')} blok terakhir di LitVM Testnet. Aktivitas lebih lama tidak tercakup.`);
        }
    } catch (err) {
        console.error('Statistik gagal dimuat:', err);
        if (breakdownEl) setSafeContent(breakdownEl, t('st_fail'));
    }
}

function renderStatsChart(buckets) {
    const svg = document.getElementById('stChart');
    const labels = document.getElementById('stChartLabels');
    const note = document.getElementById('stChartNote');
    const rangeEl = document.getElementById('stChartRange');
    if (!svg) return;

    const total = buckets.reduce((a, b) => a + b, 0);
    const max = Math.max(...buckets, 1);
    const W = 320, H = 110, gap = 3;
    const bw = (W - gap * (buckets.length - 1)) / buckets.length;

    svg.innerHTML = buckets.map((v, i) => {
        const h = v === 0 ? 2 : Math.max(3, (v / max) * (H - 8));
        const x = i * (bw + gap);
        const y = H - h;
        const op = v === 0 ? 0.18 : 0.55 + (v / max) * 0.45;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--accent)" opacity="${op.toFixed(2)}"><title>${v} swap</title></rect>`;
    }).join('');

    if (labels) labels.innerHTML = '<span>' + t('st_chart_older') + '</span><span>' + t('st_chart_newer') + '</span>';
    if (rangeEl) rangeEl.textContent = total > 0 ? `${total} ${t('lb_swaps')}` : t('st_none');
    if (note) {
        note.textContent = total === 0
            ? t('st_chart_empty')
            : (LANG === 'en'
                ? `Each column covers ~${Math.round(LB_BLOCK_RANGE / ST_BUCKETS).toLocaleString('en-US')} blocks. Column height = swap count.`
                : `Tiap kolom mewakili ~${Math.round(LB_BLOCK_RANGE / ST_BUCKETS).toLocaleString('en-US')} blok. Tinggi kolom = jumlah swap.`);
    }
}

function renderPoolBreakdown(perPool, totalSwaps) {
    const el = document.getElementById('stPoolBreakdown');
    if (!el) return;
    const rows = Object.entries(perPool);
    if (!rows.length || totalSwaps === 0) {
        setSafeContent(el, t('lb_empty'));
        return;
    }
    rows.sort((a, b) => b[1].count - a[1].count);
    el.innerHTML = '';
    rows.forEach(([key, v]) => {
        const pct = totalSwaps > 0 ? (v.count / totalSwaps) * 100 : 0;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:column; gap:5px;';
        const top = document.createElement('div');
        top.style.cssText = 'display:flex; justify-content:space-between; font-size:12.5px;';
        const left = document.createElement('span');
        left.style.cssText = 'color:var(--text-primary); font-weight:600;';
        left.textContent = key.replace('-', ' / ');
        const right = document.createElement('span');
        right.style.cssText = 'color:var(--text-secondary);';
        right.textContent = `${v.count} swap · ${pct.toFixed(0)}%`;
        top.appendChild(left);
        top.appendChild(right);
        const bar = document.createElement('div');
        bar.className = 'stat-bar-track';
        const fill = document.createElement('div');
        fill.className = 'stat-bar-fill';
        fill.style.width = `${Math.max(pct, v.count > 0 ? 3 : 0).toFixed(1)}%`;
        bar.appendChild(fill);
        wrapper.appendChild(top);
        wrapper.appendChild(bar);
        el.appendChild(wrapper);
    });
}
