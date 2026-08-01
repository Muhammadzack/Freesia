/**
 * Freesia Swap Calculation Layer
 *
 * Responsibilities:
 * - Resolve active pool reserves
 * - Calculate AMM output quotes
 * - Calculate exchange rates
 * - Calculate price impact and swap loss
 * - Estimate maximum trade size
 * - Classify swap risk
 * - Resolve approximate USD prices
 *
 * Runtime dependencies:
 * - config.js: TOKENS
 * - app.js state: state, poolReserves
 *
 * Functions are declared before app.js but only executed after
 * the application state has been initialized.
 */

// =====================================================================
// SWAP QUOTE & RISK CALCULATIONS
// =====================================================================

function reservesFor(fromSym, toSym) {
    if (!poolReserves.loaded) return null;
    const fromAddr = (TOKENS[fromSym].address || '').toLowerCase();
    if (fromAddr === poolReserves.tokenA) return { rIn: poolReserves.a, rOut: poolReserves.b };
    if (fromAddr === poolReserves.tokenB) return { rIn: poolReserves.b, rOut: poolReserves.a };
    return null;
}

function quoteOut(amountIn, rIn, rOut) {
    if (!(amountIn > 0) || !(rIn > 0) || !(rOut > 0)) return 0;
    const inAfterFee = amountIn * 0.997;
    return (inAfterFee * rOut) / (rIn + inAfterFee);
}

function rate(from, to) {
    const r = reservesFor(from, to);
    if (r && r.rIn > 0) return r.rOut / r.rIn;
    return TOKENS[from].price / TOKENS[to].price;
}

function priceImpact(payVal) {
    const r = reservesFor(state.pay, state.receive);
    if (!r || !(payVal > 0) || !(r.rIn > 0) || !(r.rOut > 0)) return 0;
    const spot = r.rOut / r.rIn;
    const out = quoteOut(payVal, r.rIn, r.rOut);
    const exec = out / payVal;
    const impact = (1 - exec / spot) * 100;
    return Math.max(0, Math.min(impact, 99));
}

function swapLoss(payVal) {
    const r = reservesFor(state.pay, state.receive);
    if (!r || !(payVal > 0) || !(r.rIn > 0) || !(r.rOut > 0)) return null;
    const spot = r.rOut / r.rIn;
    const idealOut = payVal * spot;
    const actualOut = quoteOut(payVal, r.rIn, r.rOut);
    const lostTokens = idealOut - actualOut;
    const outPrice = usdPriceOf(state.receive);
    const lostUsd = outPrice === null ? null : lostTokens * outPrice;
    return { impact: priceImpact(payVal), lostTokens, lostUsd, idealOut, actualOut };
}

function maxSizeForImpact(targetImpactPct) {
    const r = reservesFor(state.pay, state.receive);
    if (!r || !(r.rIn > 0) || !(r.rOut > 0) || !(targetImpactPct > 0)) return null;
    let lo = 0, hi = r.rIn * 0.5;
    for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const spot = r.rOut / r.rIn;
        const out = quoteOut(mid, r.rIn, r.rOut);
        const imp = mid > 0 ? (1 - (out / mid) / spot) * 100 : 0;
        if (imp > targetImpactPct) hi = mid; else lo = mid;
    }
    return lo > 0 ? lo : null;
}

function riskLevel(impact) {
    if (impact >= 15) return 'severe';
    if (impact >= 5) return 'high';
    if (impact >= 2) return 'moderate';
    return 'low';
}

function usdPriceOf(sym) {
    if (sym === 'USDC') return 1;
    const r = reservesFor('USDC', sym);
    if (r && r.rOut > 0) return r.rIn / r.rOut;
    return null;
}

// =====================================================================
// SWAP UI, VALIDATION & EXECUTION
// =====================================================================

let swapInFlight = false;
let swapNonce = 0;
let quoteSeq = 0;

function refreshLabels() {
    const paySym = document.getElementById('paySymbol');
    const recvSym = document.getElementById('receiveSymbol');
    if (paySym) paySym.textContent = state.pay;
    if (recvSym) recvSym.textContent = state.receive;

    const pIcon = document.getElementById('payIcon');
    const rIcon = document.getElementById('receiveIcon');
    if (pIcon) {
        pIcon.textContent = TOKENS[state.pay].letter;
        pIcon.style.background = TOKENS[state.pay].color;
    }
    if (rIcon) {
        rIcon.textContent = TOKENS[state.receive].letter;
        rIcon.style.background = TOKENS[state.receive].color;
    }

    const payBal = document.getElementById('payBalance');
    const recvBal = document.getElementById('receiveBalance');
    if (payBal) payBal.textContent = state.connected ? fmt(TOKENS[state.pay].balance, 4) : '—';
    if (recvBal) recvBal.textContent = state.connected ? fmt(TOKENS[state.receive].balance, 4) : '—';

    const chartLabel = document.getElementById('chartPairLabel');
    if (chartLabel) chartLabel.textContent = `${state.pay} / ${state.receive}`;

    const rateReady = reservesFor(state.pay, state.receive) !== null;
    const rateLabel = document.getElementById('rateLabel');
    if (rateLabel) {
        rateLabel.textContent = rateReady
            ? `1 ${state.pay} = ${fmt(rate(state.pay, state.receive), 4)} ${state.receive}`
            : '—';
    }
}

async function updateFromPay() {
    const seq = ++quoteSeq;
    const payVal = parseNum(document.getElementById('payInput').value);
    let receiveVal = 0;

    const poolAddress = poolFor(state.pay, state.receive);
    const dp = dataProvider();

    if (dp && poolAddress && payVal > 0) {
        try {
            const payToken = TOKENS[state.pay];
            const receiveToken = TOKENS[state.receive];
            const pool = new ethers.Contract(poolAddress, POOL_ABI, dp);
            const amountIn = ethers.parseUnits(payVal.toFixed(payToken.decimals), payToken.decimals);
            const amountOut = await rpcQueue.add(() =>
                pool.getAmountOut(payToken.address, amountIn)
            );
            if (seq !== quoteSeq) return;
            receiveVal = parseFloat(ethers.formatUnits(amountOut, receiveToken.decimals));
        } catch (err) {
            console.error('Kutipan on-chain gagal:', err);
        }
    }
    if (seq !== quoteSeq) return;

    if (receiveVal === 0 && payVal > 0) {
        const r = reservesFor(state.pay, state.receive);
        if (r) {
            receiveVal = quoteOut(payVal, r.rIn, r.rOut);
        }
    }

    const recvInput = document.getElementById('receiveInput');
    if (recvInput) recvInput.value = (payVal && receiveVal) ? fmt(receiveVal, 6) : '';
    updateUsdAndImpact(payVal, receiveVal);
    drawImpactChart();
    validateBalance(payVal);
}

function updateUsdAndImpact(payVal, receiveVal) {
    const payPrice = usdPriceOf(state.pay);
    const recvPrice = usdPriceOf(state.receive);

    const payUsd = document.getElementById('payUsd');
    const recvUsd = document.getElementById('receiveUsd');
    if (payUsd) payUsd.textContent = payPrice === null ? '—' : `≈ $${fmt(payVal * payPrice)}`;
    if (recvUsd) recvUsd.textContent = recvPrice === null ? '—' : `≈ $${fmt(receiveVal * recvPrice)}`;

    const impact = priceImpact(payVal);
    const impactLabel = document.getElementById('impactLabel');
    if (impactLabel) impactLabel.textContent = `${impact.toFixed(2)}%`;

    const impactRow = impactLabel?.closest('.rate-row');
    if (impactRow) {
        impactRow.classList.toggle('impact-high', impact > 3);
        impactRow.classList.toggle('impact-low', impact <= 3);
    }

    const minReceived = receiveVal * (1 - state.slippage / 100);
    const minLabel = document.getElementById('minReceivedLabel');
    if (minLabel) minLabel.textContent = receiveVal > 0 ? `${fmt(minReceived, 6)} ${state.receive}` : '—';

    const capEl = document.getElementById('minReceivedCaption');
    if (capEl) capEl.textContent = t('min_received_slip').replace('{s}', state.slippage);

    renderLossPanel(payVal);
    renderSafetyCheck(payVal, priceImpact(payVal));
}

function renderLossPanel(payVal) {
    const panel = document.getElementById('lossPanel');
    if (!panel) return 'low';

    const loss = swapLoss(payVal);
    if (!loss || !(payVal > 0)) { panel.style.display = 'none'; return 'low'; }

    const level = riskLevel(loss.impact);
    if (level === 'low') { panel.style.display = 'none'; return level; }

    panel.style.display = '';
    panel.className = 'loss-panel ' + level;

    const icon = { moderate:'⚠️', high:'⚠️', severe:'🛑' }[level];
    const title = {
        moderate: t('loss_t_moderate'),
        high:     t('loss_t_high'),
        severe:   t('loss_t_severe')
    }[level];

    setSafeContent(document.getElementById('lossIcon'), icon);
    setSafeContent(document.getElementById('lossTitle'), title);

    const amountEl = document.getElementById('lossAmount');
    if (loss.lostUsd !== null) {
        setSafeContent(amountEl, `≈ $${fmt(loss.lostUsd, 2)}`);
    } else {
        setSafeContent(amountEl, `≈ ${fmt(loss.lostTokens, 4)} ${state.receive}`);
    }

    setSafeContent(document.getElementById('lossExplain'),
        t('loss_explain')
            .replace('{ideal}', fmt(loss.idealOut, 4))
            .replace('{actual}', fmt(loss.actualOut, 4))
            .replace(/{sym}/g, state.receive)
            .replace('{imp}', loss.impact.toFixed(2)));

    const adviceEl = document.getElementById('lossAdvice');
    const safeSize = maxSizeForImpact(2);
    if (safeSize && safeSize < payVal) {
        setSafeContent(adviceEl,
            t('loss_advice_max')
                .replace('{amt}', fmt(safeSize, 2))
                .replace('{sym}', state.pay));
    } else {
        setSafeContent(adviceEl, t('loss_advice_limited'));
    }

    return level;
}

async function renderSafetyCheck(payVal, impact) {
    const box = document.getElementById('safetyCheck');
    if (!box) return;
    if (!payVal || payVal <= 0 || !reservesFor(state.pay, state.receive)) {
        box.style.display = 'none';
        return;
    }
    box.style.display = '';
    const notes = [];
    let risk = 0;

    if (impact > 5) {
        risk = Math.max(risk, 2);
        notes.push(t('sc_imp_high').replace('{i}', impact.toFixed(1)));
    } else if (impact > 2) {
        risk = Math.max(risk, 1);
        notes.push(t('sc_imp_mid').replace('{i}', impact.toFixed(1)));
    } else {
        notes.push(t('sc_imp_low').replace('{i}', impact.toFixed(1)));
    }

    // DIA oracle check (simplified)
    try {
        const poolRate = rate(state.pay, state.receive);
        if (poolRate > 0 && state.pay === 'USDC' && state.receive === 'DAI') {
            // Simple check: DAI should be ~0.831-1 USDC
            if (poolRate < 0.5 || poolRate > 1.5) {
                risk = Math.max(risk, 2);
                notes.push(t('sc_dev_big').replace('{d}', Math.abs((poolRate - 1) * 100).toFixed(0)));
            }
        }
    } catch (e) {}

    const verdict = [
        { icon:'🛡️', title:t('safety_safe'), color:'var(--accent)' },
        { icon:'⚠️', title:t('safety_caution'), color:'var(--warning)' },
        { icon:'🚨', title:t('safety_risky'), color:'var(--danger)' },
    ][risk];

    setSafeContent(document.getElementById('safetyIcon'), verdict.icon);
    setSafeContent(document.getElementById('safetyTitle'), verdict.title);
    document.getElementById('safetyTitle').style.color = verdict.color;
    box.style.borderColor = verdict.color;

    const frag = document.createDocumentFragment();
    for (const n of notes) {
        const div = document.createElement('div');
        div.textContent = '• ' + n;
        frag.appendChild(div);
    }
    if (risk === 2) {
        const tip = document.createElement('div');
        tip.style.color = 'var(--text-primary)';
        tip.style.marginTop = '4px';
        tip.textContent = t('safety_tip');
        frag.appendChild(tip);
    }
    document.getElementById('safetyBody').replaceChildren(frag);
}

function validateBalance(payVal) {
    const section = document.getElementById('paySection');
    const btn = document.getElementById('swapBtn');
    if (!btn) return;

    const overBalance = payVal > TOKENS[state.pay].balance;
    if (section) section.classList.toggle('error', overBalance);

    btn.classList.remove('risk-high', 'risk-severe');

    if (!state.connected) {
        btn.textContent = t('connect_to_swap');
        btn.disabled = false;
    } else if (payVal <= 0) {
        btn.textContent = t('enter_amount');
        btn.disabled = true;
    } else if (overBalance) {
        btn.textContent = t('insufficient_balance').replace('{sym}', state.pay);
        btn.disabled = true;
    } else {
        const loss = swapLoss(payVal);
        const level = loss ? riskLevel(loss.impact) : 'low';

        if (level === 'severe') {
            btn.textContent = t('swap_severe_btn');
            btn.classList.add('risk-severe');
        } else if (level === 'high') {
            btn.textContent = t('swap_high_btn');
            btn.classList.add('risk-high');
        } else {
            btn.textContent = t('swap_btn');
        }
        btn.disabled = false;
    }
}

function onPayInput(v) {
    clearTimeout(payDebounce);
    payDebounce = setTimeout(() => updateFromPay(), 250);
}

function onReceiveInput(v) {
    clearTimeout(receiveDebounce);
    receiveDebounce = setTimeout(() => updateFromReceive(), 250);
}

let payDebounce = null, receiveDebounce = null;

function setPercent(pct) {
    if (!state.connected) { showToast(t('connect_first')); return; }
    const bal = TOKENS[state.pay].balance;
    document.getElementById('payInput').value = fmt(bal * pct, 6);
    updateFromPay();
}

async function swapTokens() {
    [state.pay, state.receive] = [state.receive, state.pay];
    await loadPoolReserves();
    refreshLabels();
    updateFromPay();
}

// =====================================================================
// 11. EXECUTE SWAP
// =====================================================================

function confirmRiskySwap({ impact, lossText, idealOut, actualOut, requireTyping }) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('riskModal');
        const typeBox = document.getElementById('riskTypeBox');
        const input   = document.getElementById('riskInput');
        const goBtn   = document.getElementById('riskProceed');
        const cancel  = document.getElementById('riskCancel');
        const PHRASE  = t('risk_phrase');

        const typeLabel = document.getElementById('riskTypeLabel');
        if (typeLabel) typeLabel.innerHTML = t('risk_type_label').replace('{p}', '<b>' + PHRASE + '</b>');
        if (input) input.placeholder = PHRASE;

        setSafeContent(document.getElementById('riskImpact'), `${impact.toFixed(2)}%`);
        setSafeContent(document.getElementById('riskLoss'), lossText);
        setSafeContent(document.getElementById('riskDetail'),
            t('risk_detail')
                .replace('{i}', fmt(idealOut, 4))
                .replace('{a}', fmt(actualOut, 4))
                .replace(/{sym}/g, state.receive));

        if (typeBox) typeBox.style.display = requireTyping ? '' : 'none';
        if (input) input.value = '';
        if (goBtn) {
            goBtn.disabled = !!requireTyping;
            goBtn.textContent = requireTyping ? t('risk_type_first') : t('risk_proceed');
        }

        function onType() {
            if (!input || !goBtn) return;
            const ok = input.value.trim().toUpperCase() === PHRASE.toUpperCase();
            goBtn.disabled = !ok;
            goBtn.textContent = ok ? t('risk_proceed') : t('risk_type_first');
        }

        function cleanup(result) {
            if (overlay) overlay.classList.remove('show');
            if (input) input.removeEventListener('input', onType);
            if (goBtn) goBtn.removeEventListener('click', onGo);
            if (cancel) cancel.removeEventListener('click', onCancel);
            if (overlay) overlay.removeEventListener('click', onOverlay);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        }

        function onGo() { if (goBtn && !goBtn.disabled) cleanup(true); }
        function onCancel() { cleanup(false); }
        function onOverlay(e) { if (e.target === overlay) cleanup(false); }
        function onKey(e) { if (e.key === 'Escape') cleanup(false); }

        if (input) input.addEventListener('input', onType);
        if (goBtn) goBtn.addEventListener('click', onGo);
        if (cancel) cancel.addEventListener('click', onCancel);
        if (overlay) {
            overlay.addEventListener('click', onOverlay);
            overlay.classList.add('show');
        }
        document.addEventListener('keydown', onKey);
        if (requireTyping) setTimeout(() => input?.focus(), 100);
    });
}

async function executeSwap() {
    if (swapInFlight) return;
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }

    const btn = document.getElementById('swapBtn');
    if (!btn || btn.disabled) return;

    const payVal = parseNum(document.getElementById('payInput').value);
    if (payVal <= 0) return;

    const nonce = ++swapNonce;
    swapInFlight = true;

    try {
        const loss = swapLoss(payVal);
        if (loss) {
            const level = riskLevel(loss.impact);
            const lossText = loss.lostUsd !== null
                ? `≈ $${fmt(loss.lostUsd, 2)}`
                : `≈ ${fmt(loss.lostTokens, 4)} ${state.receive}`;

            if (level === 'severe') {
                const ok = await confirmRiskySwap({
                    impact: loss.impact, lossText,
                    idealOut: loss.idealOut, actualOut: loss.actualOut,
                    requireTyping: true
                });
                if (!ok || nonce !== swapNonce) return;
            } else if (level === 'high') {
                const ok = await confirmRiskySwap({
                    impact: loss.impact, lossText,
                    idealOut: loss.idealOut, actualOut: loss.actualOut,
                    requireTyping: false
                });
                if (!ok || nonce !== swapNonce) return;
            }
        }

        if (nonce !== swapNonce) return;
        if (!signer) { showError({ message: 'no wallet' }, 'swap'); return; }

        const poolAddress = poolFor(state.pay, state.receive);
        if (!poolAddress || !TOKENS[state.pay].address || !TOKENS[state.receive].address) {
            showToast(t('no_pool').replace('{a}', state.pay).replace('{b}', state.receive));
            return;
        }

        btn.disabled = true;
        try {
            const net = await provider.getNetwork();
            if (Number(net.chainId) !== CHAIN_ID_EXPECTED) {
                await switchToLitVM();
                const eth = getEthereumProvider();
                provider = new ethers.BrowserProvider(eth);
                signer = await provider.getSigner();
                userAddress = await signer.getAddress();
                const net2 = await provider.getNetwork();
                if (Number(net2.chainId) !== CHAIN_ID_EXPECTED) {
                    throw Object.assign(new Error('wrong network'), { code: 4902 });
                }
            }

            const payToken = TOKENS[state.pay];
            const receiveToken = TOKENS[state.receive];
            const amountIn = ethers.parseUnits(payVal.toFixed(payToken.decimals), payToken.decimals);

            const tokenIn = new ethers.Contract(payToken.address, ERC20_ABI, signer);
            const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);

            let expectedOutRaw;
            try {
                expectedOutRaw = await pool.getAmountOut(payToken.address, amountIn);
            } catch (e) {
                console.error('Gagal ambil kutipan segar:', e);
                showError(e, 'swap');
                return;
            }

            if (expectedOutRaw <= 0n) {
                showError({ message: 'insufficient output' }, 'swap');
                return;
            }

            const slipBps = BigInt(Math.round(state.slippage * 100));
            const amountOutMin = (expectedOutRaw * (10000n - slipBps)) / 10000n;
            const expectedOut = parseFloat(ethers.formatUnits(expectedOutRaw, receiveToken.decimals));

            const allowance = await tokenIn.allowance(userAddress, poolAddress);
            if (allowance < amountIn) {
                btn.textContent = t('tx_approving');
                const approveTx = await tokenIn.approve(poolAddress, amountIn);
                await approveTx.wait();
            }

            if (nonce !== swapNonce) return;
            btn.textContent = t('tx_confirm');
            const tx = await pool.swap(payToken.address, amountIn, amountOutMin);
            btn.textContent = t('tx_swapping');
            const receipt = await tx.wait();

            txHistory.unshift({ pay: state.pay, receive: state.receive, payVal,
                receiveVal: expectedOut, hash: receipt?.hash, block: receipt?.blockNumber });
            saveHistoryCache();
            renderHistory();
            await loadOnChainBalances();
            await sleep(120);
            await loadPoolReserves();

            const payInput = document.getElementById('payInput');
            const recvInput = document.getElementById('receiveInput');
            if (payInput) payInput.value = '';
            if (recvInput) recvInput.value = '';
            updateFromPay();
            refreshLabels();
            showToast(t('ok_swapped')
                .replace('{a}', fmt(payVal,4)).replace('{p}', state.pay)
                .replace('{b}', fmt(expectedOut,4)).replace('{r}', state.receive), receipt?.hash);
        } catch (err) {
            console.error(err);
            showError(err, 'swap');
        } finally {
            validateBalance(parseNum(document.getElementById('payInput')?.value || '0'));
        }
    } finally {
        swapInFlight = false;
    }
}
