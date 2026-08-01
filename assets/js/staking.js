/**
 * Freesia Staking / Earn Layer
 *
 * Responsibilities:
 * - Selected staking pool
 * - Earn dashboard
 * - Stake LP
 * - Unstake LP
 * - Claim FREE rewards
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - ui.js
 * - wallet.js
 * - poolFor() from app.js
 * - i18n and portfolio refresh from app.js
 *
 * Dimuat sebelum app.js. Fungsi dipanggil setelah bootstrap selesai.
 */

// =====================================================================
// STAKING STATE & HELPERS
// =====================================================================

let selectedStaking = STAKING_LIST[0];

function currentStakingAddress() { return selectedStaking.addr; }
function currentStakingPool() { return poolFor(selectedStaking.a, selectedStaking.b); }

// =====================================================================
// 21. EARN FUNCTIONS
// =====================================================================

async function refreshEarnView() {
    const p = dataProvider();
    if (!p) return;
    const poolAddress = currentStakingPool();
    const stakingAddr = currentStakingAddress();
    const titleEl = document.getElementById('earnViewTitle');
    if (titleEl) titleEl.textContent = `${t('earn_title_pre')} ${selectedStaking.label}${t('earn_title_post')}`;
    try {
        const pool = new ethers.Contract(poolAddress, POOL_ABI, p);
        const staking = new ethers.Contract(stakingAddr, STAKING_ABI, p);

        const totalStaked = await staking.totalSupply();
        document.getElementById('earnTotalStaked').textContent = `${fmt(parseFloat(ethers.formatUnits(totalStaked, 18)), 6)} LP`;

        const periodFinish = await staking.periodFinish();
        const finishDate = Number(periodFinish) > 0 ? new Date(Number(periodFinish) * 1000) : null;
        document.getElementById('earnPeriodEnds').textContent = finishDate ? finishDate.toLocaleDateString() : '—';

        if (state.connected && userAddress) {
            const [myLpBalance, myStaked, earnedAmt] = await Promise.all([
                pool.balanceOf(userAddress),
                staking.balanceOf(userAddress),
                staking.earned(userAddress)
            ]);
            document.getElementById('earnMyStaked').textContent = fmt(parseFloat(ethers.formatUnits(myStaked, 18)), 6);
            document.getElementById('earnMyLpBalance').textContent = fmt(parseFloat(ethers.formatUnits(myLpBalance, 18)), 6);
            document.getElementById('earnEarned').textContent = `${fmt(parseFloat(ethers.formatUnits(earnedAmt, 18)), 6)} FREE`;
            document.getElementById('stakeAvailable').textContent = fmt(parseFloat(ethers.formatUnits(myLpBalance, 18)), 6);
            document.getElementById('unstakeAvailable').textContent = fmt(parseFloat(ethers.formatUnits(myStaked, 18)), 6);
        }

        const stakeBtn = document.getElementById('stakeBtn');
        const unstakeBtn = document.getElementById('unstakeBtn');
        if (stakeBtn) stakeBtn.textContent = state.connected ? t('stake_btn') : t('connect_wallet');
        if (unstakeBtn) unstakeBtn.textContent = state.connected ? t('unstake_btn') : t('connect_wallet');
    } catch (err) {
        console.error('Failed to load staking stats:', err);
    }
}

async function selectStaking(key) {
    const s = STAKING_LIST.find(x => x.key === key);
    if (!s) return;
    selectedStaking = s;
    ['stakeAmount','unstakeAmount'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.querySelectorAll('[data-stakekey]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-stakekey') === key);
    });
    await refreshEarnView();
}

function setStakePercent(pct) {
    const avail = parseNum(document.getElementById('stakeAvailable').textContent);
    document.getElementById('stakeAmount').value = fmt(avail * pct, 6);
}

function setUnstakePercent(pct) {
    const avail = parseNum(document.getElementById('unstakeAvailable').textContent);
    document.getElementById('unstakeAmount').value = fmt(avail * pct, 6);
}

async function executeStake() {
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }
    const amount = parseNum(document.getElementById('stakeAmount').value);
    if (amount <= 0) { showToast(t('enter_amount')); return; }

    const btn = document.getElementById('stakeBtn');
    if (!btn) return;
    btn.disabled = true;
    try {
        const poolAddress = currentStakingPool();
        const stakingAddr = currentStakingAddress();
        const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);
        const staking = new ethers.Contract(stakingAddr, STAKING_ABI, signer);
        const amt = ethers.parseUnits(amount.toFixed(18), 18);

        btn.textContent = t('tx_approving');
        if ((await pool.allowance(userAddress, stakingAddr)) < amt) {
            await (await pool.approve(stakingAddr, amt)).wait();
        }

        btn.textContent = t('tx_staking');
        const stakeReceipt = await (await staking.stake(amt)).wait();

        showToast(t('ok_staked').replace('{n}', fmt(amount,6)), stakeReceipt?.hash);
        document.getElementById('stakeAmount').value = '';
        await refreshEarnView();
    } catch (err) {
        console.error(err);
        showError(err, 'stake');
    } finally {
        btn.disabled = false;
        btn.textContent = state.connected ? t('stake_btn') : t('connect_wallet');
    }
}

async function executeUnstake() {
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }
    const amount = parseNum(document.getElementById('unstakeAmount').value);
    if (amount <= 0) { showToast(t('enter_amount')); return; }

    const btn = document.getElementById('unstakeBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = t('tx_unstaking');
    try {
        const staking = new ethers.Contract(currentStakingAddress(), STAKING_ABI, signer);
        const amt = ethers.parseUnits(amount.toFixed(18), 18);
        const unstakeReceipt = await (await staking.withdraw(amt)).wait();
        showToast(t('ok_unstaked').replace('{n}', fmt(amount,6)), unstakeReceipt?.hash);
        document.getElementById('unstakeAmount').value = '';
        await refreshEarnView();
    } catch (err) {
        console.error(err);
        showError(err, 'unstake');
    } finally {
        btn.disabled = false;
        btn.textContent = state.connected ? t('unstake_btn') : t('connect_wallet');
    }
}

async function executeClaim() {
    if (!state.connected) { await toggleWallet(); if (!state.connected) return; }
    const btn = document.getElementById('claimBtn');
    const pfBtn = document.getElementById('pfClaimBtn');
    const pfLabel = pfBtn ? pfBtn.childNodes[0] : null;
    const pfOriginal = pfLabel ? pfLabel.textContent : '';

    if (btn) { btn.disabled = true; btn.textContent = t('tx_claiming'); }
    if (pfBtn) { pfBtn.disabled = true; if (pfLabel) pfLabel.textContent = t('tx_claiming') + ' '; }
    try {
        const staking = new ethers.Contract(currentStakingAddress(), STAKING_ABI, signer);
        const claimReceipt = await (await staking.getReward()).wait();
        showToast(t('ok_claimed'), claimReceipt?.hash);
        await refreshEarnView();
        if (currentView === 'portfolio') await refreshPortfolioView();
    } catch (err) {
        console.error(err);
        showError(err, 'claim');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = t('claim_btn'); }
        if (pfBtn) {
            pfBtn.disabled = false;
            if (pfLabel) pfLabel.textContent = pfOriginal || t('pf_claim');
        }
    }
}
