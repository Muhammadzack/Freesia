// =====================================================================
// FREESIA — WALLET & PROVIDER LAYER
//
// Menangani:
// - read-only provider
// - EIP-6963 wallet discovery
// - browser wallet
// - WalletConnect
// - network switching
// - wallet dropdown
// - token balance loading
//
// Dimuat sebelum app.js.
// =====================================================================

let provider = null, signer = null, userAddress = null;
let readProvider = null;
try {
    readProvider = new ethers.JsonRpcProvider(LITVM_NETWORK.rpcUrls[0], {
        chainId: CHAIN_ID_EXPECTED,
        name: LITVM_NETWORK.chainName
    });
} catch (e) {
    console.error('Gagal membuat read-only provider:', e);
}

function dataProvider() { return provider || readProvider; }

let wcProvider = null;
let wcModal = null;
let eip6963Providers = [];
let preferredWalletRdns = null;
let warningDismissed = false;

// =====================================================================
// 7. WALLET FUNCTIONS
// =====================================================================

window.addEventListener('eip6963:announceProvider', (event) => {
    if (event.detail && event.detail.provider) {
        const already = eip6963Providers.some(p => p.info?.uuid === event.detail.info?.uuid);
        if (!already) eip6963Providers.push(event.detail);
    }
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

try { preferredWalletRdns = localStorage.getItem('freesia_wallet') || null; } catch (e) {}

function listWallets() {
    return eip6963Providers.map(p => ({
        rdns: p.info?.rdns || '',
        name: p.info?.name || 'Wallet',
        icon: p.info?.icon || '',
        provider: p.provider
    }));
}

function getEthereumProvider() {
    if (eip6963Providers.length > 0) {
        if (preferredWalletRdns) {
            const chosen = eip6963Providers.find(p =>
                (p.info?.rdns || '') === preferredWalletRdns);
            if (chosen) return chosen.provider;
        }
        return eip6963Providers[0].provider;
    }
    if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        return window.ethereum.providers[0];
    }
    if (typeof window.ethereum !== 'undefined') return window.ethereum;
    return null;
}

function walletAvailable() { return getEthereumProvider() !== null; }

function showWalletWarning() {
    if (warningDismissed) return;
    if (document.getElementById('walletWarning')) return;
    const bar = document.createElement('div');
    bar.id = 'walletWarning';
    bar.className = 'wallet-warning';
    bar.innerHTML = `
        <div class="ww-body">
            <strong>⚠️ ${t('no_wallet_title')}.</strong>
            <span>${t('no_wallet_body')}</span>
        </div>
        <button class="ww-close" aria-label="${t('close_label')}" title="${t('close_label')}">×</button>`;
    bar.querySelector('.ww-close').addEventListener('click', () => {
        warningDismissed = true;
        hideWalletWarning();
    });
    document.body.insertBefore(bar, document.body.firstChild);
}

function hideWalletWarning() {
    const bar = document.getElementById('walletWarning');
    if (bar) bar.remove();
}

// =====================================================================
// 12. WALLET CONNECTION
// =====================================================================

async function switchToLitVM() {
    const eth = getEthereumProvider();
    if (!eth) throw new Error('Wallet provider tidak tersedia');
    try {
        await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: LITVM_NETWORK.chainId }]
        });
    } catch (switchError) {
        if (switchError.code === 4902 || switchError.code === -32603) {
            try {
                await eth.request({
                    method: 'wallet_addEthereumChain',
                    params: [LITVM_NETWORK]
                });
            } catch (addError) {
                const e = new Error('CHAIN_ADD_REJECTED');
                e.code = 'CHAIN_ADD_REJECTED';
                e.original = addError;
                throw e;
            }
        } else {
            throw switchError;
        }
    }
}

function showWalletPicker() {
    return new Promise((resolve) => {
        const list = listWallets();
        const back = document.createElement('div');
        back.className = 'modal-backdrop';
        back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:18px;max-width:340px;width:100%;box-shadow:var(--panel-shadow);';
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700;color:var(--text-primary);margin-bottom:12px;';
        title.textContent = t('choose_wallet');
        box.appendChild(title);

        list.forEach(w => {
            const b = document.createElement('button');
            b.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;margin-bottom:8px;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:14px;font-weight:600;cursor:pointer;text-align:left;';
            if (w.icon && (/^data:image\//.test(w.icon) || /^https:\/\//.test(w.icon))) {
                const img = document.createElement('img');
                img.src = w.icon;
                img.alt = '';
                img.style.cssText = 'width:22px;height:22px;border-radius:5px;';
                b.appendChild(img);
            }
            const nameSpan = document.createElement('span');
            nameSpan.textContent = String(w.name).slice(0, 40);
            b.appendChild(nameSpan);
            b.onclick = () => {
                preferredWalletRdns = w.rdns;
                try { localStorage.setItem('freesia_wallet', w.rdns); } catch (e) {}
                back.remove();
                resolve(w.provider);
            };
            box.appendChild(b);
        });

        // WalletConnect option
        const wcBtn = document.createElement('button');
        wcBtn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;margin-bottom:8px;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:14px;font-weight:600;cursor:pointer;text-align:left;';
        const wcIco = document.createElement('span');
        wcIco.textContent = '📱';
        wcIco.style.fontSize = '18px';
        wcBtn.appendChild(wcIco);
        const wcTxt = document.createElement('span');
        wcTxt.textContent = (LANG === 'en') ? 'Mobile Wallet / QR' : 'Wallet Mobile / QR';
        wcBtn.appendChild(wcTxt);
        wcBtn.onclick = () => {
            back.remove();
            resolve(null);
            connectWalletConnect();
        };
        box.appendChild(wcBtn);

        const cancel = document.createElement('button');
        cancel.textContent = t('close_label');
        cancel.style.cssText = 'width:100%;padding:9px;margin-top:4px;border-radius:10px;border:0;background:transparent;color:var(--text-secondary);font-size:13px;cursor:pointer;';
        cancel.onclick = () => { back.remove(); resolve(null); };
        box.appendChild(cancel);

        back.appendChild(box);
        back.onclick = (e) => { if (e.target === back) { back.remove(); resolve(null); } };
        document.body.appendChild(back);
    });
}

async function connectWalletConnect() {
    const btn = document.getElementById('walletBtn');
    closeWalletDropdown();
    try {
        btn.textContent = t('connecting');

        const [wcMod, modalMod] = await Promise.all([
            import('https://esm.sh/@walletconnect/ethereum-provider@2.17.0'),
            import('https://esm.sh/@walletconnect/modal@2.7.0')
        ]);
        const EthereumProvider = wcMod.EthereumProvider || wcMod.default;
        const WalletConnectModal = modalMod.WalletConnectModal || modalMod.default;
        wcModal = new WalletConnectModal({ projectId: '78f61ffbae79f906864cc993f157e794', themeMode: 'dark' });

        wcProvider = await EthereumProvider.init({
            projectId: '78f61ffbae79f906864cc993f157e794',
            optionalChains: [CHAIN_ID_EXPECTED],
            showQrModal: false,
            rpcMap: { [CHAIN_ID_EXPECTED]: LITVM_NETWORK.rpcUrls[0] },
            metadata: {
                name: 'Freesia DEX',
                description: 'The DEX that warns you before you lose money',
                url: 'https://app.freesiadex.xyz',
                icons: ['https://app.freesiadex.xyz/favicon.ico']
            }
        });

        wcProvider.on('display_uri', (uri) => { wcModal.openModal({ uri }); });
        await wcProvider.enable();
        try { wcModal.closeModal(); } catch (e) {}

        provider = new ethers.BrowserProvider(wcProvider);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        let network = await provider.getNetwork();
        if (Number(network.chainId) !== CHAIN_ID_EXPECTED) {
            const hexId = '0x' + CHAIN_ID_EXPECTED.toString(16);
            try {
                await wcProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: hexId }]
                });
            } catch (switchErr) {
                if (switchErr && (switchErr.code === 4902 || switchErr.code === -32603)) {
                    await wcProvider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: hexId,
                            chainName: LITVM_NETWORK.chainName,
                            nativeCurrency: LITVM_NETWORK.nativeCurrency,
                            rpcUrls: LITVM_NETWORK.rpcUrls,
                            blockExplorerUrls: LITVM_NETWORK.blockExplorerUrls
                        }]
                    });
                    await wcProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: hexId }]
                    });
                } else {
                    throw switchErr;
                }
            }
            provider = new ethers.BrowserProvider(wcProvider);
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
            network = await provider.getNetwork();
            if (Number(network.chainId) !== CHAIN_ID_EXPECTED) {
                throw Object.assign(new Error('wrong network'), { code: 4902 });
            }
        }

        state.connected = true;
        loadHistoryCache();
        btn.classList.add('connected');
        btn.textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        refreshAllConnectButtons();

        wcProvider.on('disconnect', () => { disconnectWallet(); });
        wcProvider.on('accountsChanged', (a) => { if (!a || a.length === 0) disconnectWallet(); });

        try {
            await loadOnChainBalances();
            await sleep(150);
            await loadPoolReserves();
            refreshLabels();
            updateFromPay();
            drawImpactChart();
            await sleep(120);
            if (currentView === 'pool') await refreshPoolView();
            if (currentView === 'earn') await refreshEarnView();
            if (currentView === 'portfolio') await refreshPortfolioView();
        } catch (dataErr) {
            console.error('Gagal memuat data setelah connect (WC):', dataErr);
            showError(dataErr, 'connect');
        }
    } catch (err) {
        console.error(err);
        try { if (wcProvider) { await wcProvider.disconnect(); } } catch (e) {}
        wcProvider = null;
        state.connected = false;
        provider = signer = userAddress = null;
        btn.classList.remove('connected');
        btn.textContent = t('connect_wallet');
        refreshAllConnectButtons();
        showError(err, 'connect');
    }
}

async function toggleWallet() {
    const btn = document.getElementById('walletBtn');
    if (!btn) return;

    if (state.connected) {
        toggleWalletDropdown();
        return;
    }

    let eth = getEthereumProvider();
    if (!eth) {
        connectWalletConnect();
        return;
    }
    if (!preferredWalletRdns && eip6963Providers.length > 0) {
        const chosen = await showWalletPicker();
        if (!chosen) return;
        eth = chosen;
    }

    try {
        btn.textContent = t('connecting');
        provider = new ethers.BrowserProvider(eth);
        await provider.send('eth_requestAccounts', []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== CHAIN_ID_EXPECTED) {
            await switchToLitVM();
            provider = new ethers.BrowserProvider(eth);
            signer = await provider.getSigner();
        }

        state.connected = true;
        loadHistoryCache();
        btn.classList.add('connected');
        btn.textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        refreshAllConnectButtons();

        try {
            await loadOnChainBalances();
            await sleep(150);
            await loadPoolReserves();
            refreshLabels();
            updateFromPay();
            drawImpactChart();
            await sleep(120);
            if (currentView === 'pool') await refreshPoolView();
            if (currentView === 'earn') await refreshEarnView();
            if (currentView === 'portfolio') await refreshPortfolioView();
        } catch (dataErr) {
            console.error('Gagal memuat data setelah connect:', dataErr);
            showError(dataErr, 'connect');
        }
    } catch (err) {
        console.error(err);
        state.connected = false;
        provider = signer = userAddress = null;
        btn.classList.remove('connected');
        btn.textContent = t('connect_wallet');
        refreshAllConnectButtons();
        showError(err, 'connect');
    }
}

function disconnectWallet() {
    state.connected = false;
    try { if (wcProvider) { wcProvider.disconnect(); wcProvider = null; } } catch (e) {}
    txHistory = [];
    provider = signer = userAddress = null;
    Object.keys(TOKENS).forEach(sym => { TOKENS[sym].balance = 0; });
    preferredWalletRdns = null;
    try { localStorage.removeItem('freesia_wallet'); } catch (e) {}

    const btn = document.getElementById('walletBtn');
    if (btn) {
        btn.classList.remove('connected');
        btn.textContent = t('connect_wallet');
    }
    closeWalletDropdown();
    refreshAllConnectButtons();

    refreshLabels();
    renderHistory();
    validateBalance(parseNum(document.getElementById('payInput')?.value || '0'));
    drawImpactChart();
    if (currentView === 'pool') refreshPoolView();
    if (currentView === 'earn') refreshEarnView();
    if (currentView === 'portfolio') refreshPortfolioView();

    showToast(t('ok_disconnected'));
}

function refreshAllConnectButtons() {
    validateBalance(parseNum(document.getElementById('payInput')?.value || '0'));
    const addBtn = document.getElementById('addLiqBtn');
    const removeBtn = document.getElementById('removeLiqBtn');
    if (addBtn) { addBtn.textContent = state.connected ? t('add_liq_btn') : t('connect_wallet'); }
    if (removeBtn) { removeBtn.textContent = state.connected ? t('remove_liq_btn') : t('connect_wallet'); }
    const stakeBtn = document.getElementById('stakeBtn');
    const unstakeBtn = document.getElementById('unstakeBtn');
    if (stakeBtn) { stakeBtn.textContent = state.connected ? t('stake_btn') : t('connect_wallet'); }
    if (unstakeBtn) { unstakeBtn.textContent = state.connected ? t('unstake_btn') : t('connect_wallet'); }
}

function toggleWalletDropdown() {
    const dd = document.getElementById('walletDropdown');
    if (!dd) return;
    const wasOpen = dd.classList.contains('show');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
    if (wasOpen) { dd.classList.remove('show'); return; }
    renderWalletDropdown();
    dd.classList.add('show');
}

function closeWalletDropdown() {
    const dd = document.getElementById('walletDropdown');
    if (dd) dd.classList.remove('show');
}

function renderWalletDropdown() {
    const addrEl = document.getElementById('walletDropdownAddr');
    const balEl = document.getElementById('walletDropdownBalances');
    if (!addrEl || !balEl) return;
    setSafeContent(addrEl, userAddress || '—');
    balEl.innerHTML = '';
    Object.entries(TOKENS).forEach(([sym, t]) => {
        const row = document.createElement('div');
        row.className = 'wallet-dropdown-bal-row';
        const left = document.createElement('span');
        left.className = 'tsym';
        const icon = document.createElement('span');
        icon.className = 'token-icon';
        icon.style.cssText = `width:18px;height:18px;font-size:9px;background:${t.color}`;
        icon.textContent = t.letter;
        left.appendChild(icon);
        left.appendChild(document.createTextNode(sym));
        const right = document.createElement('b');
        right.textContent = fmt(t.balance, 4);
        row.appendChild(left);
        row.appendChild(right);
        balEl.appendChild(row);
    });
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('walletWrap');
    if (wrap && !wrap.contains(e.target)) closeWalletDropdown();
});

async function loadOnChainBalances() {
    if (!provider || !userAddress) return;
    for (const sym of Object.keys(TOKENS)) {
        const t = TOKENS[sym];
        if (!t.address) continue;
        try {
            const contract = new ethers.Contract(t.address, ERC20_ABI, provider);
            const raw = await rpcQueue.add(() => contract.balanceOf(userAddress));
            t.balance = parseFloat(ethers.formatUnits(raw, t.decimals));
        } catch (err) {
            console.error(`Could not load balance for ${sym}:`, err);
        }
        await sleep(300);
    }
    refreshLabels();
    updateFromPay();
    renderWalletDropdown();
}
