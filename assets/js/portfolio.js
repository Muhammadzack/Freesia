/**
 * Freesia Portfolio Layer
 *
 * Responsibilities:
 * - Wallet token balances
 * - LP positions
 * - Staked LP positions
 * - FREE reward balance
 * - Portfolio valuation
 * - Portfolio action buttons
 *
 * Runtime dependencies:
 * - config.js
 * - utils.js
 * - ui.js
 * - wallet.js
 * - staking.js
 * - app.js i18n/navigation state
 *
 * Dimuat sebelum app.js.
 */

// =====================================================================
// PORTFOLIO
// =====================================================================

// =====================================================================
// 22. PORTFOLIO FUNCTIONS
// =====================================================================

async function refreshPortfolioView() {
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const tokenList = document.getElementById('pfTokenList');
    const posList = document.getElementById('pfPositionList');

    const pfClaim = document.getElementById('pfClaimBtn');
    const pfUnstake = document.getElementById('pfUnstakeBtn');
    const setBtnLabel = (btn, text) => { if (btn && btn.childNodes[0]) btn.childNodes[0].textContent = text; };

    if (!state.connected || !provider || !userAddress) {
        setText('pfTotalValue', '—');
        setText('pfTotalSub', t('pf_connect'));
        if (tokenList) tokenList.innerHTML = '<div class="pf-empty">' + t('pf_not_conn') + '</div>';
        if (posList) posList.innerHTML = '<div class="pf-empty">' + t('pf_not_conn') + '</div>';

        if (pfClaim) {
            pfClaim.disabled = false;
            setBtnLabel(pfClaim, t('pf_connect_btn'));
            pfClaim.onclick = () => toggleWallet();
        }
        if (pfUnstake) {
            pfUnstake.disabled = false;
            setBtnLabel(pfUnstake, t('pf_manage'));
            pfUnstake.onclick = () => switchView('earn');
        }
        setText('pfClaimSub', t('pf_not_conn'));
        setText('pfUnstakeSub', '—');
        return;
    }

    if (pfClaim) {
        setBtnLabel(pfClaim, t('pf_claim'));
        pfClaim.onclick = () => executeClaim();
    }
    if (pfUnstake) {
        setBtnLabel(pfUnstake, t('pf_manage'));
        pfUnstake.onclick = () => switchView('earn');
    }

    setText('pfTotalSub', t('pf_loading'));
    const poolAddress = poolFor('USDC', 'DAI');

    try {
        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
        const staking = new ethers.Contract(STAKING_LIST[0].addr, STAKING_ABI, provider);
        const freeTok = new ethers.Contract(REWARD_TOKEN_ADDRESS, ERC20_ABI, provider);

        const usdcBal = TOKENS.USDC.balance;
        const daiBal = TOKENS.DAI.balance;
        await sleep(120);

        let freeBal = 0;
        try {
            const raw = await freeTok.balanceOf(userAddress);
            freeBal = parseFloat(ethers.formatUnits(raw, 18));
        } catch (e) { console.error('Gagal baca saldo FREE:', e); }
        await sleep(120);

        const [myLpRaw, stakedRaw, earnedRaw, totalSupRaw, rA, rB] = await Promise.all([
            pool.balanceOf(userAddress),
            staking.balanceOf(userAddress),
            staking.earned(userAddress),
            pool.totalSupply(),
            pool.reserveA(),
            pool.reserveB()
        ]);

        const myLp = parseFloat(ethers.formatUnits(myLpRaw, 18));
        const staked = parseFloat(ethers.formatUnits(stakedRaw, 18));
        const earned = parseFloat(ethers.formatUnits(earnedRaw, 18));
        const totalSup = parseFloat(ethers.formatUnits(totalSupRaw, 18));
        const resA = parseFloat(ethers.formatUnits(rA, 18));
        const resB = parseFloat(ethers.formatUnits(rB, 18));

        const daiUsd = resB > 0 ? (resA / resB) : 0;
        const poolUsd = resA * 1 + resB * daiUsd;
        const lpUnitUsd = totalSup > 0 ? poolUsd / totalSup : 0;

        const walletUsd = usdcBal * 1 + daiBal * daiUsd;
        const lpUsd = (myLp + staked) * lpUnitUsd;
        const totalUsd = walletUsd + lpUsd;

        setText('pfTotalValue', `$${fmt(totalUsd, 2)}`);
        setText('pfTotalSub', earned > 0
            ? t('pf_excl_free').replace('{n}', fmt(earned, 6))
            : t('pf_total_sub2'));

        // Token list
        const tokenRows = [
            { sym:'USDC', name:'USD Coin', color:'#2775ca', letter:'U', amount:usdcBal, usd:usdcBal*1 },
            { sym:'DAI',  name:'Dai',      color:'#f5ac37', letter:'D', amount:daiBal,  usd:daiBal*daiUsd },
            { sym:'FREE', name:'Reward Token', color:'#d29922', letter:'F', amount:freeBal, usd:null }
        ];
        tokenList.innerHTML = '';
        tokenRows.forEach(t2 => {
            const row = document.createElement('div');
            row.className = 'pf-row';
            const left = document.createElement('div');
            left.className = 'pf-row-left';
            const icon = document.createElement('div');
            icon.className = 'token-icon';
            icon.style.background = t2.color;
            icon.textContent = t2.letter;
            const info = document.createElement('div');
            info.className = 'pf-row-info';
            const title = document.createElement('span');
            title.className = 'pf-row-title';
            title.textContent = t2.sym;
            const sub = document.createElement('span');
            sub.className = 'pf-row-sub';
            sub.textContent = t2.name;
            info.appendChild(title);
            info.appendChild(sub);
            left.appendChild(icon);
            left.appendChild(info);
            const right = document.createElement('div');
            right.className = 'pf-row-right';
            const amount = document.createElement('span');
            amount.className = 'pf-row-amount';
            amount.textContent = fmt(t2.amount, 6);
            const usd = document.createElement('span');
            usd.className = 'pf-row-usd';
            usd.textContent = t2.usd === null ? t('pf_no_price') : '$' + fmt(t2.usd, 2);
            right.appendChild(amount);
            right.appendChild(usd);
            row.appendChild(left);
            row.appendChild(right);
            tokenList.appendChild(row);
        });

        // Positions list
        const sharePct = totalSup > 0 ? ((myLp + staked) / totalSup) * 100 : 0;
        const positions = [];
        if (myLp > 0) positions.push({
            title:t('pf_pos_unstaked'), sub:'USDC / DAI',
            amount:`${fmt(myLp, 6)} LP`, usd:`$${fmt(myLp * lpUnitUsd, 2)}`
        });
        if (staked > 0) positions.push({
            title:t('pf_pos_staked'), sub:t('pf_pos_staked_sub'),
            amount:`${fmt(staked, 6)} LP`, usd:`$${fmt(staked * lpUnitUsd, 2)}`
        });
        if (earned > 0) positions.push({
            title:t('pf_pos_rewards'), sub:t('pf_pos_rewards_sub'),
            amount:`${fmt(earned, 6)} FREE`, usd:'—'
        });
        if (sharePct > 0) positions.push({
            title:t('pf_pos_share'), sub:t('pf_pos_share_sub'),
            amount:`${sharePct.toFixed(4)}%`, usd:''
        });

        posList.innerHTML = '';
        if (positions.length) {
            positions.forEach(p => {
                const row = document.createElement('div');
                row.className = 'pf-row';
                const left = document.createElement('div');
                left.className = 'pf-row-left';
                const info = document.createElement('div');
                info.className = 'pf-row-info';
                const title = document.createElement('span');
                title.className = 'pf-row-title';
                title.textContent = p.title;
                const sub = document.createElement('span');
                sub.className = 'pf-row-sub';
                sub.textContent = p.sub;
                info.appendChild(title);
                info.appendChild(sub);
                left.appendChild(info);
                const right = document.createElement('div');
                right.className = 'pf-row-right';
                const amount = document.createElement('span');
                amount.className = 'pf-row-amount';
                amount.textContent = p.amount;
                const usd = document.createElement('span');
                usd.className = 'pf-row-usd';
                usd.textContent = p.usd;
                right.appendChild(amount);
                right.appendChild(usd);
                row.appendChild(left);
                row.appendChild(right);
                posList.appendChild(row);
            });
        } else {
            posList.innerHTML = '<div class="pf-empty">' + t('pf_no_pos') + '</div>';
        }

        const claimBtn = document.getElementById('pfClaimBtn');
        setText('pfClaimSub', earned > 0 ? t('pf_free_avail').replace('{n}', fmt(earned, 6)) : t('pf_no_reward'));
        if (claimBtn) claimBtn.disabled = !(earned > 0);
        setText('pfUnstakeSub', staked > 0 ? t('pf_lp_staked').replace('{n}', fmt(staked, 6)) : t('pf_no_stake'));

    } catch (err) {
        console.error('Gagal memuat portfolio:', err);
        setText('pfTotalValue', '—');
        const diag = explainError(err, 'transaksi');
        setText('pfTotalSub', t('pf_load_fail') + diag.advice);
        if (tokenList) tokenList.innerHTML = '<div class="pf-empty">' + t('pf_fail_tokens') + '</div>';
        if (posList) posList.innerHTML = '<div class="pf-empty">' + t('pf_fail_pos') + '</div>';
    }
}
