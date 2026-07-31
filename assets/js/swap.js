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
