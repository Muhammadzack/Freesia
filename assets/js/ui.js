// =====================================================================
// FREESIA — TOAST & ERROR UI
// Bergantung pada utils.js, config.js, dan fungsi i18n dari app.js.
// =====================================================================

// =====================================================================
// 8. TOAST & ERROR HANDLING
// =====================================================================

function showToast(msg, txHash) {
    const toastEl = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    const linkEl = document.getElementById('toastLink');
    if (!toastEl || !msgEl) return;
    
    msgEl.textContent = msg;
    if (txHash && TX_HASH_RE.test(txHash)) {
        linkEl.href = `${LITVM_NETWORK.blockExplorerUrls[0]}/tx/${txHash}`;
        linkEl.style.display = 'inline';
    } else {
        linkEl.removeAttribute('href');
        linkEl.style.display = 'none';
    }
    toastEl.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toastEl.classList.remove('show'), txHash ? 5000 : 3200);
}

const ErrorKind = {
    USER_REJECTED:'user_rejected', RATE_LIMITED:'rate_limited', NETWORK:'network',
    WRONG_CHAIN:'wrong_chain', INSUFFICIENT_GAS:'insufficient_gas', SLIPPAGE:'slippage',
    FAUCET_COOLDOWN:'faucet_cooldown', NOTHING_TO_CLAIM:'nothing_to_claim',
    CONTRACT_REVERT:'contract_revert', NO_WALLET:'no_wallet',
    CHAIN_ADD_REJECTED:'chain_add_rejected', UNKNOWN:'unknown'
};

function safeStringify(obj) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(obj, (k, v) => {
            if (typeof v === 'object' && v !== null) { if (seen.has(v)) return '[circular]'; seen.add(v); }
            if (typeof v === 'bigint') return v.toString();
            return v;
        }) + ' ' + (obj.message || '') + ' ' + (obj.reason || '') + ' ' + (obj.shortMessage || '');
    } catch (_) { return String(obj && obj.message ? obj.message : obj); }
}

function diagnose(err) {
    if (!err) return ErrorKind.UNKNOWN;
    const code = err.code;
    const text = safeStringify(err).toLowerCase();

    if (code === 4001 || code === 'ACTION_REJECTED' ||
        text.includes('user rejected') || text.includes('user denied')) return ErrorKind.USER_REJECTED;
    if (code === -32005 || text.includes('rate limit') || text.includes('rate-limit') ||
        text.includes('"httpstatus":429') || text.includes('too many requests')) return ErrorKind.RATE_LIMITED;
    if (code === 4902 || text.includes('unrecognized chain') || text.includes('wrong network')) return ErrorKind.WRONG_CHAIN;
    if (text.includes('insufficient funds for gas') || text.includes('insufficient funds for intrinsic')) return ErrorKind.INSUFFICIENT_GAS;
    if (text.includes('insufficient_output_amount') || text.includes('insufficient output') ||
        text.includes('slippage') || text.includes('min_amount') || text.includes('too little received')) return ErrorKind.SLIPPAGE;
    if (text.includes('cooldown') || text.includes('too early') || text.includes('claim too soon')) return ErrorKind.FAUCET_COOLDOWN;
    if (text.includes('nothing to claim') || text.includes('no reward')) return ErrorKind.NOTHING_TO_CLAIM;
    if (code === 'CHAIN_ADD_REJECTED' || text.includes('chain_add_rejected')) return ErrorKind.CHAIN_ADD_REJECTED;
    if (text.includes('no wallet') || text.includes('ethereum is undefined') ||
        text.includes('provider tidak tersedia')) return ErrorKind.NO_WALLET;
    if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'SERVER_ERROR' ||
        text.includes('failed to fetch') || text.includes('network error') ||
        text.includes('could not coalesce') || text.includes('missing revert data')) return ErrorKind.NETWORK;
    if (code === 'CALL_EXCEPTION' || code === -32000 ||
        text.includes('revert') || text.includes('execution reverted')) return ErrorKind.CONTRACT_REVERT;
    return ErrorKind.UNKNOWN;
}

function actionLabel(a) {
    const idMap = { swap:'swap', faucet:'pengambilan token faucet', connect:'koneksi wallet',
        addLiquidity:'penambahan likuiditas', removeLiquidity:'penarikan likuiditas',
        stake:'staking', unstake:'unstaking', claim:'klaim reward' };
    const enMap = { swap:'swap', faucet:'faucet claim', connect:'wallet connection',
        addLiquidity:'liquidity add', removeLiquidity:'liquidity removal',
        stake:'stake', unstake:'unstake', claim:'reward claim' };
    const map = (LANG === 'en') ? enMap : idMap;
    return map[a] || (LANG === 'en' ? 'transaction' : 'transaksi');
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function explainError(err, action) {
    const kind = diagnose(err);
    const what = actionLabel(action);
    const W  = (k) => t(k).replace('{what}', what);
    const WC = (k) => t(k).replace('{what}', capitalize(what));
    switch (kind) {
        case ErrorKind.USER_REJECTED: return { kind, severity:'info', title:t('err_rej_t'),
            body:W('err_rej_b'), fundsSafe:true, advice:t('err_rej_a') };
        case ErrorKind.RATE_LIMITED: return { kind, severity:'warning', title:t('err_rate_t'),
            body:WC('err_rate_b'), fundsSafe:true, advice:t('err_rate_a') };
        case ErrorKind.NETWORK: return { kind, severity:'warning', title:t('err_net_t'),
            body:W('err_net_b'), fundsSafe:true, advice:t('err_net_a') };
        case ErrorKind.WRONG_CHAIN: return { kind, severity:'warning', title:t('err_chain_t'),
            body:t('err_chain_b'), fundsSafe:true, advice:t('err_chain_a') };
        case ErrorKind.INSUFFICIENT_GAS: return { kind, severity:'warning', title:t('err_gas_t'),
            body:W('err_gas_b'), fundsSafe:true, advice:t('err_gas_a') };
        case ErrorKind.SLIPPAGE: return { kind, severity:'warning', title:t('err_slip_t'),
            body:t('err_slip_b'), fundsSafe:true, advice:t('err_slip_a') };
        case ErrorKind.FAUCET_COOLDOWN: return { kind, severity:'info', title:t('err_cool_t'),
            body:t('err_cool_b'), fundsSafe:true, advice:t('err_cool_a') };
        case ErrorKind.NOTHING_TO_CLAIM: return { kind, severity:'info', title:t('err_none_t'),
            body:t('err_none_b'), fundsSafe:true, advice:t('err_none_a') };
        case ErrorKind.NO_WALLET: return { kind, severity:'error', title:t('no_wallet_title'),
            body:t('err_nowallet_b'), fundsSafe:true, advice:t('err_nowallet_a') };
        case ErrorKind.CHAIN_ADD_REJECTED: return { kind, severity:'error', title:t('chain_rejected_title'),
            body:t('chain_rejected_body'), fundsSafe:true,
            advice:t('chain_rejected_advice') };
        case ErrorKind.CONTRACT_REVERT: return { kind, severity:'error', title:WC('err_revert_t'),
            body:t('err_revert_b'), fundsSafe:true, advice:t('err_revert_a') };
        default: return { kind:ErrorKind.UNKNOWN, severity:'error', title:WC('err_unknown_t'),
            body:t('err_unknown_b'), fundsSafe:null,
            advice:t('err_unknown_a') };
    }
}

function showError(err, action) {
    console.error(`[${action}]`, err);
    const e = explainError(err, action);

    if (e.kind === ErrorKind.USER_REJECTED) {
        showToast(`${e.title} — ${e.advice}`);
        return e;
    }

    const panel = document.getElementById('errorPanel');
    if (!panel) { showToast(`${e.title} — ${e.advice}`); return e; }

    panel.className = 'error-panel ' + e.severity;
    setSafeContent(document.getElementById('errTitle'), e.title);
    setSafeContent(document.getElementById('errBody'), e.body);
    setSafeContent(document.getElementById('errAdvice'), e.advice);

    const safeEl = document.getElementById('errFunds');
    if (e.fundsSafe === true) {
        setSafeContent(safeEl, t('funds_safe'));
        safeEl.className = 'err-funds safe';
        safeEl.style.display = '';
    } else if (e.fundsSafe === null) {
        setSafeContent(safeEl, t('funds_unknown'));
        safeEl.className = 'err-funds unknown';
        safeEl.style.display = '';
    } else {
        safeEl.style.display = 'none';
    }

    const icon = { info:'ℹ️', warning:'⚠️', error:'✕' }[e.severity] || '⚠️';
    setSafeContent(document.getElementById('errIcon'), icon);
    panel.style.display = '';
    return e;
}

function hideError() {
    const panel = document.getElementById('errorPanel');
    if (panel) panel.style.display = 'none';
}
