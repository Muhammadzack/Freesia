/**
 * Freesia Leaderboard Layer
 *
 * Responsibilities:
 * - Leaderboard state
 * - On-chain Swap event scanning
 * - Ranking by swap count / volume
 * - Leaderboard rendering
 *
 * Shared:
 * - LB_BLOCK_RANGE and LB_CHUNK are also used by Stats.
 */

// =====================================================================
// LEADERBOARD STATE
// =====================================================================

let lbData = [];
let lbSort = 'count';

// =====================================================================
// 23. LEADERBOARD FUNCTIONS
// =====================================================================

const LB_BLOCK_RANGE = 50000;
const LB_CHUNK = 9000;

function setLeaderboardSort(mode) {
    lbSort = mode;
    document.getElementById('lbSortCount')?.classList.toggle('active', mode === 'count');
    document.getElementById('lbSortVolume')?.classList.toggle('active', mode === 'volume');
    renderLeaderboardList();
}

function renderLeaderboardList() {
    const list = document.getElementById('lbList');
    if (!list) return;
    if (!lbData.length) {
        setSafeContent(list, t('lb_empty'));
        return;
    }
    const sorted = [...lbData].sort((a, b) =>
        lbSort === 'count' ? b.count - a.count : b.volume - a.volume);
    const medals = ['🥇','🥈','🥉'];
    const me = (userAddress || '').toLowerCase();

    list.innerHTML = '';
    sorted.slice(0, 20).forEach((row, i) => {
        const isMe = row.addr === me;
        const addrSafe = safeText(row.addr);
        const short = addrSafe.slice(0, 6) + '…' + addrSafe.slice(-4);
        const rank = medals[i] || `#${i + 1}`;
        
        const div = document.createElement('div');
        div.className = 'pf-row';
        if (isMe) div.style.borderColor = 'var(--accent)';
        
        const left = document.createElement('div');
        left.className = 'pf-row-left';
        const rankIcon = document.createElement('div');
        rankIcon.className = 'token-icon';
        rankIcon.style.cssText = 'background:var(--bg-secondary); color:var(--text-primary); font-size:12px; width:30px; height:30px;';
        rankIcon.textContent = rank;
        const info = document.createElement('div');
        info.className = 'pf-row-info';
        const title = document.createElement('span');
        title.className = 'pf-row-title';
        title.textContent = short;
        if (isMe) {
            const you = document.createElement('b');
            you.style.color = 'var(--accent)';
            you.textContent = ' ' + t('lb_you');
            title.appendChild(you);
        }
        const sub = document.createElement('span');
        sub.className = 'pf-row-sub';
        sub.textContent = `${row.count} ${t('lb_swaps')}`;
        info.appendChild(title);
        info.appendChild(sub);
        left.appendChild(rankIcon);
        left.appendChild(info);
        
        const right = document.createElement('div');
        right.className = 'pf-row-right';
        const amount = document.createElement('span');
        amount.className = 'pf-row-amount';
        amount.textContent = fmt(row.volume, 2);
        const usd = document.createElement('span');
        usd.className = 'pf-row-usd';
        usd.textContent = t('lb_volin');
        right.appendChild(amount);
        right.appendChild(usd);
        
        div.appendChild(left);
        div.appendChild(right);
        list.appendChild(div);
    });
}

async function refreshLeaderboardView() {
    const list = document.getElementById('lbList');
    const scope = document.getElementById('lbScopeNote');
    const p = dataProvider();
    if (!p || !list) return;
    setSafeContent(list, t('lb_reading'));

    try {
        const latest = await p.getBlockNumber();
        const fromBlock = Math.max(0, latest - LB_BLOCK_RANGE);
        const tally = {};

        for (const [, addr] of Object.entries(POOLS)) {
            const pool = new ethers.Contract(addr, POOL_ABI, p);
            for (let start = fromBlock; start <= latest; start += LB_CHUNK) {
                const end = Math.min(start + LB_CHUNK - 1, latest);
                let events = [];
                try {
                    events = await pool.queryFilter(pool.filters.Swap(), start, end);
                } catch (e) { continue; }
                for (const ev of events) {
                    const trader = (ev.args?.trader || '').toLowerCase();
                    if (!trader) continue;
                    let amt = 0;
                    try { amt = parseFloat(ethers.formatUnits(ev.args.amountIn, 18)); } catch (e) {}
                    if (!tally[trader]) tally[trader] = { count: 0, volume: 0 };
                    tally[trader].count += 1;
                    tally[trader].volume += isFinite(amt) ? amt : 0;
                }
                await sleep(60);
            }
        }

        lbData = Object.entries(tally).map(([addr, v]) => ({ addr, count: v.count, volume: v.volume }));
        if (scope) {
            scope.textContent = lbData.length
                ? (LANG === 'en'
                    ? `Read from the last ~${LB_BLOCK_RANGE.toLocaleString('en-US')} blocks on LitVM Testnet. Older swaps aren't covered.`
                    : `Dibaca dari ~${LB_BLOCK_RANGE.toLocaleString('en-US')} blok terakhir di LitVM Testnet. Swap lebih lama tidak tercakup.`)
                : t('scope_note');
        }
        renderLeaderboardList();
    } catch (err) {
        console.error('Leaderboard gagal dimuat:', err);
        setSafeContent(list, t('lb_fail'));
    }
}
