/**
 * Freesia Pool & Liquidity Layer
 *
 * Responsibilities:
 * - Selected pool state
 * - Pool reserve display
 * - Pool selection
 * - Add liquidity
 * - Remove liquidity
 * - Pool health rendering
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - ui.js
 * - wallet.js
 * - app.js global state and i18n
 *
 * Dimuat sebelum app.js. Fungsi baru dieksekusi setelah
 * bootstrap aplikasi selesai.
 */

// =====================================================================
// POOL STATE & HELPERS
// =====================================================================

let selectedPool = POOL_LIST[0];
let poolTab = { pA: 0, pB: 0, totalSupply: 0, loaded: false };

function currentPoolAddress() { return poolFor(selectedPool.a, selectedPool.b); }

// =====================================================================
// 18. POOL FUNCTIONS
// =====================================================================

async function loadSelectedPoolReserves() {
    const addr = currentPoolAddress();
    const p = dataProvider();
    if (!addr || !p) { poolTab.loaded = false; return false; }
    try {
        const pool = new ethers.Contract(addr, POOL_ABI, p);
        const [rA, rB, tA, ts] = await Promise.all([
            pool.reserveA(), pool.reserveB(), pool.tokenA(), pool.totalSupply()
        ]);
        const rAn = parseFloat(ethers.formatUnits(rA, 18));
        const rBn = parseFloat(ethers.formatUnits(rB, 18));
        const aAddr = (TOKENS[selectedPool.a].address || '').toLowerCase();
        const contractAIsOurA = (tA.toLowerCase() === aAddr);
        poolTab = {
            pA: contractAIsOurA ? rAn : rBn,
            pB: contractAIsOurA ? rBn : rAn,
            totalSupply: parseFloat(ethers.formatUnits(ts, 18)),
            loaded: true
        };
        return true;
    } catch (err) {
        console.error('Gagal memuat reserve pool terpilih:', err);
        poolTab.loaded = false;
        return false;
    }
}

function poolRatioAB() {
    if (poolTab.loaded && poolTab.pA > 0 && poolTab.pB > 0) {
        return { rA: poolTab.pA, rB: poolTab.pB };
    }
    return null;
}

function onAddAInput(v) {
    const valA = parseNum(v);
    const r = poolRatioAB();
    if (r) {
        document.getElementById('addAmountB').value = valA ? fmt(valA * (r.rB / r.rA), 6) : '';
    }
}

function onAddBInput(v) {
    const valB = parseNum(v);
    const r = poolRatioAB();
    if (r) {
        document.getElementById('addAmountA').value = valB ? fmt(valB * (r.rA / r.rB), 6) : '';
    }
}

async function refreshPoolView() {
    const poolAddress = currentPoolAddress();
    if (!poolAddress) return;
    const A = selectedPool.a, B = selectedPool.b;

    const titleEl = document.getElementById('poolViewTitle');
    if (titleEl) titleEl.textContent = t('pool_title') + ' ' + selectedPool.label;
    const lblA = document.getElementById('poolReserveALabel');
    const lblB = document.getElementById('poolReserveBLabel');
    if (lblA) lblA.textContent = t('reserve') + ' ' + A;
    if (lblB) lblB.textContent = t('reserve') + ' ' + B;
    const addLblA = document.getElementById('addLabelA');
    const addLblB = document.getElementById('addLabelB');
    if (addLblA) addLblA.textContent = t('add') + ' ' + A;
    if (addLblB) addLblB.textContent = t('add') + ' ' + B;
    const symA = document.getElementById('addSymbolA');
    const symB = document.getElementById('addSymbolB');
    if (symA) symA.textContent = A;
    if (symB) symB.textContent = B;
    const icoA = document.getElementById('addIconA');
    const icoB = document.getElementById('addIconB');
    if (icoA) { icoA.textContent = TOKENS[A].letter; icoA.style.background = TOKENS[A].color; }
    if (icoB) { icoB.textContent = TOKENS[B].letter; icoB.style.background = TOKENS[B].color; }

    try {
        const p = dataProvider();
        if (!p) return;
        const pool = new ethers.Contract(poolAddress, POOL_ABI, p);
        await loadSelectedPoolReserves();

        document.getElementById('poolReserveA').textContent = `${fmt(poolTab.pA, 2)} ${A}`;
        document.getElementById('poolReserveB').textContent = `${fmt(poolTab.pB, 2)} ${B}`;
        document.getElementById('poolTotalSupply').textContent = fmt(poolTab.totalSupply, 4);
        renderPoolHealth(poolTab.pA, poolTab.pB);

        document.getElementById('addBalanceA').textContent = state.connected ? fmt(TOKENS[A].balance, 4) : '—';
        document.getElementById('addBalanceB').textContent = state.connected ? fmt(TOKENS[B].balance, 4) : '—';

        if (state.connected && userAddress) {
            const myLp = await pool.balanceOf(userAddress);
            const myLpNum = parseFloat(ethers.formatUnits(myLp, 18));
            const totalNum = poolTab.totalSupply;
            document.getElementById('poolMyLp').textContent = fmt(myLpNum, 6);
            document.getElementById('poolMyShare').textContent = totalNum > 0 ? `${((myLpNum/totalNum)*100).toFixed(4)}%` : '0%';
            document.getElementById('removeLpBalance').textContent = fmt(myLpNum, 6);
            onRemoveInput(document.getElementById('removeLpAmount').value || '0');
        }

        const addBtn = document.getElementById('addLiqBtn');
        const removeBtn = document.getElementById('removeLiqBtn');
        if (addBtn) addBtn.textContent = state.connected ? t('add_liq_btn') : t('connect_wallet');
        if (removeBtn) removeBtn.textContent = state.connected ? t('remove_liq_btn') : t('connect_wallet');
    } catch (err) {
        console.error('Failed to load pool stats:', err);
    }
}

async function selectPool(key) {
    const p = POOL_LIST.find(x => x.key === key);
    if (!p) return;
    selectedPool = p;
    poolTab.loaded = false;
    ['addAmountA','addAmountB','removeLpAmount'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('[data-poolkey]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-poolkey') === key);
    });
    await refreshPoolView();
}

// =====================================================================
// 19. ADD/REMOVE LIQUIDITY FUNCTIONS
// =====================================================================

async function executeAddLiquidity() {
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }
    const poolAddress = currentPoolAddress();
    const A = selectedPool.a, B = selectedPool.b;
    const amountA = parseNum(document.getElementById('addAmountA').value);
    const amountB = parseNum(document.getElementById('addAmountB').value);
    if (amountA <= 0 || amountB <= 0) { showToast(t('enter_both')); return; }

    const btn = document.getElementById('addLiqBtn');
    if (!btn) return;
    btn.disabled = true;
    try {
        const tokA = new ethers.Contract(TOKENS[A].address, ERC20_ABI, signer);
        const tokB = new ethers.Contract(TOKENS[B].address, ERC20_ABI, signer);
        const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);
        const amtA = ethers.parseUnits(amountA.toFixed(18), 18);
        const amtB = ethers.parseUnits(amountB.toFixed(18), 18);

        btn.textContent = t('tx_approving_t').replace('{s}', A);
        if ((await tokA.allowance(userAddress, poolAddress)) < amtA) await (await tokA.approve(poolAddress, amtA)).wait();
        btn.textContent = t('tx_approving_t').replace('{s}', B);
        if ((await tokB.allowance(userAddress, poolAddress)) < amtB) await (await tokB.approve(poolAddress, amtB)).wait();

        btn.textContent = t('tx_adding');
        const tA = (await pool.tokenA()).toLowerCase();
        const ourAIsContractA = (tA === (TOKENS[A].address || '').toLowerCase());
        const argA = ourAIsContractA ? amtA : amtB;
        const argB = ourAIsContractA ? amtB : amtA;
        const tx = await pool.addLiquidity(argA, argB);
        const receipt = await tx.wait();

        showToast(t('ok_liq_added'), receipt?.hash);
        document.getElementById('addAmountA').value = '';
        document.getElementById('addAmountB').value = '';
        await loadOnChainBalances();
        await sleep(150);
        await refreshPoolView();
    } catch (err) {
        console.error(err);
        showError(err, 'addLiquidity');
    } finally {
        btn.disabled = false;
        btn.textContent = state.connected ? t('add_liq_btn') : t('connect_wallet');
    }
}

function setRemovePercent(pct) {
    const myLp = parseNum(document.getElementById('poolMyLp').textContent);
    document.getElementById('removeLpAmount').value = fmt(myLp * pct, 6);
    onRemoveInput(document.getElementById('removeLpAmount').value);
}

function onRemoveInput(v) {
    const lpAmount = parseNum(v);
    if (!poolTab.loaded || poolTab.totalSupply <= 0) return;
    const outA = (lpAmount / poolTab.totalSupply) * poolTab.pA;
    const outB = (lpAmount / poolTab.totalSupply) * poolTab.pB;
    document.getElementById('removeEstimate').textContent =
        `${t('youll_receive')} ${fmt(outA,6)} ${selectedPool.a} + ${fmt(outB,6)} ${selectedPool.b}`;
}

async function executeRemoveLiquidity() {
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }
    const poolAddress = currentPoolAddress();
    const lpAmount = parseNum(document.getElementById('removeLpAmount').value);
    if (lpAmount <= 0) { showToast(t('enter_lp')); return; }

    const btn = document.getElementById('removeLiqBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = t('tx_removing');
    try {
        const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);
        const lpWei = ethers.parseUnits(lpAmount.toFixed(18), 18);

        const [rAraw, rBraw, tsRaw] = await Promise.all([
            pool.reserveA(), pool.reserveB(), pool.totalSupply()
        ]);
        if (tsRaw <= 0n || rAraw <= 0n || rBraw <= 0n) {
            showError({ message: 'pool data unavailable or empty reserves' }, 'removeLiquidity');
            return;
        }
        if (lpWei > tsRaw) {
            showError({ message: 'LP amount exceeds total supply' }, 'removeLiquidity');
            return;
        }
        const slipBpsRm = BigInt(Math.round((state.slippage || 0.5) * 100));
        const estA = (lpWei * rAraw) / tsRaw;
        const estB = (lpWei * rBraw) / tsRaw;
        const minA = (estA * (10000n - slipBpsRm)) / 10000n;
        const minB = (estB * (10000n - slipBpsRm)) / 10000n;
        const tx = await pool.removeLiquidity(lpWei, minA, minB);
        const receipt = await tx.wait();
        showToast(t('ok_liq_removed'), receipt?.hash);
        document.getElementById('removeLpAmount').value = '';
        await loadOnChainBalances();
        await sleep(150);
        await refreshPoolView();
    } catch (err) {
        console.error(err);
        showError(err, 'removeLiquidity');
    } finally {
        btn.disabled = false;
        btn.textContent = state.connected ? t('remove_liq_btn') : t('connect_wallet');
    }
}

// =====================================================================
// 20. POOL HEALTH
// =====================================================================

function renderPoolHealth(reserveA, reserveB) {
    const box = document.getElementById('poolHealth');
    if (!box) return;
    if (!reserveA || !reserveB || reserveA <= 0 || reserveB <= 0) { box.style.display = 'none'; return; }
    box.style.display = '';
    const notes = [];
    let health = 0;
    const depth = reserveA + reserveB;
    if (depth < 5000) {
        health = Math.max(health, 1);
        notes.push(t('ph_thin').replace('{d}', fmt(depth, 0)));
    } else {
        notes.push(t('ph_depth').replace('{d}', fmt(depth, 0)).replace('{a}', selectedPool.a).replace('{b}', selectedPool.b));
    }
    if (selectedPool.key === 'USDC-DAI') {
        const ratio = reserveA / reserveB;
        const imbalance = Math.abs(ratio - 1) * 100;
        if (imbalance > 15) {
            health = Math.max(health, 2);
            notes.push(t('ph_imb_big').replace('{r}', ratio.toFixed(3)));
        } else if (imbalance > 5) {
            health = Math.max(health, 1);
            notes.push(t('ph_imb_mid').replace('{r}', ratio.toFixed(3)));
        } else {
            notes.push(t('ph_balanced').replace('{r}', ratio.toFixed(3)));
        }
    }
    const verdict = [
        { icon:'💧', title:t('ph_healthy'), color:'var(--accent)' },
        { icon:'👀', title:t('ph_watch'), color:'var(--warning)' },
        { icon:'⚠️', title:t('ph_alert'), color:'var(--danger)' },
    ][health];
    setSafeContent(document.getElementById('poolHealthIcon'), verdict.icon);
    setSafeContent(document.getElementById('poolHealthTitle'), verdict.title);
    document.getElementById('poolHealthTitle').style.color = verdict.color;
    box.style.borderColor = verdict.color;
    const frag = document.createDocumentFragment();
    for (const n of notes) {
        const div = document.createElement('div');
        div.textContent = '• ' + n;
        frag.appendChild(div);
    }
    document.getElementById('poolHealthBody').replaceChildren(frag);
}
