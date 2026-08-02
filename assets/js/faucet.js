/**
 * Freesia Testnet Faucet Layer
 *
 * Responsibilities:
 * - Render faucet token claims
 * - Read faucet cooldown
 * - Submit faucet claim transactions
 * - Refresh wallet balances after claim
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - ui.js
 * - wallet.js
 * - app.js state and i18n
 */

// =====================================================================
// TESTNET FAUCET
// =====================================================================

// =====================================================================
// 25. FAUCET FUNCTIONS
// =====================================================================

async function renderFaucetPanel() {
    const list = document.getElementById('faucetList');
    if (!state.connected) {
        setSafeContent(list, t('connect_first'));
        return;
    }
    list.innerHTML = '';
    Object.keys(TOKENS).forEach(sym => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
        const label = document.createElement('span');
        label.style.fontSize = '13px';
        label.textContent = sym;
        const btn = document.createElement('button');
        btn.className = 'pct-btn';
        btn.id = `faucetBtn_${sym}`;
        btn.textContent = t('claim100');
        btn.onclick = () => claimFaucet(sym);
        wrapper.appendChild(label);
        wrapper.appendChild(btn);
        list.appendChild(wrapper);
    });

    for (const sym of Object.keys(TOKENS)) {
        try {
            const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, provider);
            const secondsLeft = await faucet.timeUntilNextClaim(TOKENS[sym].address, userAddress);
            const btn = document.getElementById(`faucetBtn_${sym}`);
            if (Number(secondsLeft) > 0) {
                const hours = Math.ceil(Number(secondsLeft) / 3600);
                btn.textContent = t('wait_h').replace('{h}', hours);
                btn.disabled = true;
                btn.style.opacity = 0.5;
            }
        } catch (err) {
            console.error(`Faucet cooldown check failed for ${sym}:`, err);
        }
        await sleep(150);
    }
}

async function claimFaucet(sym) {
    if (!signer) { showToast(t('connect_first')); return; }
    const btn = document.getElementById(`faucetBtn_${sym}`);
    btn.disabled = true;
    btn.textContent = t('tx_claiming');
    try {
        const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);
        const tx = await faucet.claim(TOKENS[sym].address);
        const receipt = await tx.wait();
        showToast(t('ok_claimed100').replace('{s}', sym), receipt?.hash);
        await loadOnChainBalances();
        await renderFaucetPanel();
    } catch (err) {
        console.error(err);
        showError(err, 'faucet');
        await renderFaucetPanel();
    }
}
