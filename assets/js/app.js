// =====================================================================
// 1–2. SHARED UTILITIES DIPINDAHKAN KE assets/js/utils.js
// =====================================================================

// =====================================================================
// 3–4. KONFIGURASI DIPINDAHKAN KE assets/js/config.js
// =====================================================================

// =====================================================================
// 5. STATE VARIABLES
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

let state = {
    pay: 'USDC',
    receive: 'DAI',
    slippage: 0.5,
    connected: false,
    pickerTarget: null
};

let poolReserves = { a: 0, b: 0, tokenA: null, tokenB: null, loaded: false };
let txHistory = [];
let historyLoading = false;
let swapInFlight = false;
let swapNonce = 0;
let quoteSeq = 0;
let currentView = 'swap';
let LANG = 'id';
let lbData = [];
let lbSort = 'count';
let wcProvider = null;
let wcModal = null;
let eip6963Providers = [];
let preferredWalletRdns = null;
let selectedStaking = STAKING_LIST[0];
let selectedPool = POOL_LIST[0];
let poolTab = { pA: 0, pB: 0, totalSupply: 0, loaded: false };
let warningDismissed = false;

// =====================================================================
// 6. HELPER DOMAIN FUNCTIONS
// Helper murni dipindahkan ke assets/js/utils.js.
// =====================================================================

function poolFor(symA, symB) {
    return POOLS[`${symA}-${symB}`] || POOLS[`${symB}-${symA}`] || null;
}

function currentPoolAddress() { return poolFor(selectedPool.a, selectedPool.b); }
function currentStakingAddress() { return selectedStaking.addr; }
function currentStakingPool() { return poolFor(selectedStaking.a, selectedStaking.b); }

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
// 8. TOAST & ERROR HANDLING DIPINDAHKAN KE assets/js/ui.js
// =====================================================================

// =====================================================================
// 9. I18N
// =====================================================================

const I18N = {
    nav_swap: ["Swap", "Swap"],
    nav_pool: ["Pool", "Pool"],
    nav_earn: ["Earn", "Earn"],
    nav_portfolio: ["Portofolio", "Portfolio"],
    nav_leaderboard: ["Peringkat", "Leaderboard"],
    nav_stats: ["Statistik", "Stats"],
    nav_vault: ["AI Vault", "AI Vault"],
    net_label: ["Jaringan", "Network"],
    net_disconnected: ["terputus", "disconnected"],
    connect_wallet: ["Hubungkan Wallet", "Connect Wallet"],
    you_pay: ["ANDA BAYAR", "YOU PAY"],
    you_receive: ["ANDA TERIMA", "YOU RECEIVE"],
    balance: ["Saldo:", "Balance:"],
    price_label: ["Harga", "Price"],
    impact_label: ["Dampak harga", "Price impact"],
    swap_btn: ["Swap", "Swap"],
    connect_to_swap: ["Hubungkan Wallet untuk Swap", "Connect Wallet to Swap"],
    enter_amount: ["Masukkan jumlah", "Enter an amount"],
    insufficient_balance: ["Saldo {sym} tidak cukup", "Insufficient {sym} balance"],
    swap_high_btn: ["Swap meski merugikan", "Swap despite the loss"],
    swap_severe_btn: ["Swap tetap dilanjutkan", "Proceed with the swap anyway"],
    connect_first: ["Hubungkan wallet Anda dulu", "Connect your wallet first"],
    shielded_title: ["Shielded Swap", "Shielded Swap"],
    shielded_sub: ["Proteksi MEV terhadap sandwich attack", "MEV protection against sandwich attacks"],
    shielded_soon: ["SEGERA", "SOON"],
    shielded_note: ["Belum aktif — swap saat ini berjalan lewat mempool publik seperti biasa. Proteksi MEV membutuhkan private relay atau perubahan smart contract, dan masih dalam roadmap.",
                    "Not active yet — swaps currently go through the public mempool as usual. MEV protection requires a private relay or contract changes, and is still on the roadmap."],
    chart_caption: ["Semakin besar swap, semakin buruk harga yang Anda dapat.", "The larger the swap, the worse the price you get."],
    safety_title: ["Pemeriksaan Keamanan", "Safety Check"],
    safety_safe: ["Swap ini terlihat aman", "This swap looks safe"],
    safety_caution: ["Hati-hati sebelum lanjut", "Proceed with caution"],
    safety_risky: ["Swap ini berisiko", "This swap is risky"],
    safety_tip: ["💡 Pertimbangkan swap lebih kecil, atau tunggu likuiditas bertambah.", "💡 Consider a smaller swap, or wait for deeper liquidity."],
    pool_title: ["Pool:", "Pool:"],
    reserve: ["Cadangan", "Reserve"],
    total_lp_supply: ["Total suplai LP", "Total LP supply"],
    your_lp: ["Saldo LP Anda", "Your LP balance"],
    your_share: ["Porsi pool Anda", "Your pool share"],
    add: ["TAMBAH —", "ADD —"],
    add_liq_btn: ["Tambah Likuiditas", "Add Liquidity"],
    remove_liq_h: ["Tarik likuiditas", "Remove liquidity"],
    lp_to_remove: ["LP YANG DITARIK", "LP TOKENS TO REMOVE"],
    your_lp_short: ["LP Anda:", "Your LP:"],
    remove_liq_btn: ["Tarik Likuiditas", "Remove Liquidity"],
    pool_footer: ["Tambah atau tarik likuiditas langsung on-chain lewat SimpleLiquidityPoolV3", "Add or remove liquidity directly on-chain against SimpleLiquidityPoolV3"],
    youll_receive: ["Anda akan menerima ≈", "You'll receive ≈"],
    ph_title: ["Kesehatan Pool", "Pool Health"],
    ph_healthy: ["Pool sehat", "Pool is healthy"],
    ph_watch: ["Pool perlu perhatian", "Pool needs attention"],
    ph_alert: ["Pool perlu diwaspadai", "Pool needs caution"],
    il_title: ["KALKULATOR IMPERMANENT LOSS", "IMPERMANENT LOSS CALCULATOR"],
    il_down: ["harga -90%", "price -90%"],
    il_flat: ["tetap", "unchanged"],
    il_up: ["harga +200%", "price +200%"],
    il_move: ["Kalau harga salah satu token berubah", "If one token's price changes by"],
    il_result: ["Estimasi impermanent loss", "Estimated impermanent loss"],
    il_note_small: ["IL kecil — dampaknya minimal, umum untuk pergerakan harga kecil.", "Small IL — minimal impact, typical for small price moves."],
    il_note_mid: ["IL sedang — ada kerugian relatif vs hold, tapi fee bisa mengimbanginya seiring waktu.", "Moderate IL — a real loss vs holding, but fees may offset it over time."],
    il_note_big: ["IL besar — kalau harga bergerak sejauh ini, kamu akan cukup rugi dibanding sekadar hold. Pertimbangkan baik-baik.", "Large IL — if the price moves this far, you'd lose meaningfully vs holding. Consider carefully."],
    il_note_zero: ["Kalau harga tidak berubah, tidak ada impermanent loss. Pool USDC/DAI (dua stablecoin) biasanya di sekitar sini.", "If the price doesn't move, there's no impermanent loss. The USDC/DAI pool usually sits around here."],
    earn_title_pre: ["Earn — Stake LP", "Earn — Stake LP"],
    earn_title_post: [", dapatkan FREE", ", earn FREE"],
    total_staked: ["Total LP di-stake", "Total LP staked"],
    your_staked: ["LP Anda di-stake", "Your staked LP"],
    your_unstaked: ["LP Anda belum di-stake", "Your unstaked LP"],
    your_earned: ["FREE Anda", "Your earned FREE"],
    period_ends: ["Periode reward berakhir", "Reward period ends"],
    stake_lp: ["STAKE LP", "STAKE LP"],
    unstake_lp: ["UNSTAKE LP", "UNSTAKE LP"],
    available: ["Tersedia:", "Available:"],
    staked_label: ["Di-stake:", "Staked:"],
    stake_btn: ["Stake LP", "Stake LP"],
    unstake_btn: ["Unstake LP", "Unstake LP"],
    claim_btn: ["Klaim reward FREE", "Claim FREE rewards"],
    lb_title: ["🏆 Peringkat", "🏆 Leaderboard"],
    lb_count: ["Jumlah Swap", "Swap Count"],
    lb_volume: ["Volume", "Volume"],
    lb_loading: ["Memuat peringkat…", "Loading leaderboard…"],
    lb_reading: ["Membaca event dari blockchain…", "Reading events from the blockchain…"],
    lb_empty: ["Belum ada swap tercatat pada rentang blok ini.", "No swaps recorded in this block range yet."],
    lb_fail: ["Gagal membaca data dari blockchain. Coba muat ulang.", "Failed to read from the blockchain. Try reloading."],
    lb_how: ["<strong>Cara kerja:</strong> peringkat dihitung dari event <b>Swap</b> yang terekam langsung di smart contract — bukan dari data browser. Siapa pun bisa memverifikasinya sendiri di explorer.", 
             "<strong>How it works:</strong> ranking is computed from <b>Swap</b> events recorded directly in the smart contract — not from browser data. Anyone can verify it on the explorer."],
    lb_you: ["(kamu)", "(you)"],
    lb_swaps: ["swap", "swaps"],
    lb_volin: ["volume token masuk", "token-in volume"],
    st_title: ["📊 Statistik Freesia", "📊 Freesia Stats"],
    st_wallets: ["Wallet unik", "Unique wallets"],
    st_wallets_sub: ["pernah swap", "have swapped"],
    st_swaps: ["Total swap", "Total swaps"],
    st_swaps_sub: ["transaksi", "transactions"],
    st_tvl: ["Likuiditas total", "Total liquidity"],
    st_tvl_sub: ["semua pool", "all pools"],
    st_pools: ["Pool aktif", "Active pools"],
    st_pools_sub: ["punya likuiditas", "with liquidity"],
    st_activity: ["AKTIVITAS SWAP", "SWAP ACTIVITY"],
    st_none: ["belum ada", "none yet"],
    st_perpool: ["AKTIVITAS PER POOL", "ACTIVITY PER POOL"],
    st_loading: ["Memuat…", "Loading…"],
    st_chart_older: ["lebih lama", "older"],
    st_chart_newer: ["terbaru", "newest"],
    st_chart_empty: ["Belum ada swap pada rentang blok ini. Grafik akan terisi saat ada aktivitas.", "No swaps in this block range yet. The chart will fill as activity happens."],
    st_onchain: ["<strong>Semua angka dibaca on-chain.</strong> Dihitung dari event <b>Swap</b> dan cadangan pool yang terekam di smart contract — bukan data browser atau server kami. Siapa pun bisa memverifikasinya di explorer.", 
                 "<strong>Every number is read on-chain.</strong> Computed from <b>Swap</b> events and pool reserves recorded in the smart contract — not from browser or our servers. Anyone can verify it on the explorer."],
    st_phase: ["<strong>Fase awal testnet.</strong> Freesia baru dibuka dan aktivitasnya masih sangat kecil — angka di bawah menunjukkan itu apa adanya. Kami memilih menampilkan data sebenarnya daripada memolesnya.", 
               "<strong>Early testnet phase.</strong> Freesia just opened and activity is still very small — the numbers below show that as-is. We'd rather show real data than polish it."],
    scope_note: ["Data on-chain dari LitVM Testnet.", "On-chain data from LitVM Testnet."],
    st_fail: ["Gagal membaca data dari blockchain. Coba muat ulang.", "Failed to read from the blockchain. Try reloading."],
    pf_title: ["Portofolio", "Portfolio"],
    pf_total: ["Total Nilai Portofolio", "Total Portfolio Value"],
    pf_connect: ["Hubungkan wallet untuk melihat portofolio Anda", "Connect your wallet to see your portfolio"],
    pf_loading: ["Memuat data on-chain…", "Loading on-chain data…"],
    pf_tokens: ["Saldo Token", "Token Balances"],
    pf_positions: ["Posisi Anda", "Your Positions"],
    pf_quick: ["Aksi Cepat", "Quick Actions"],
    pf_not_conn: ["Wallet belum terhubung", "Wallet not connected"],
    pf_claim: ["Klaim Reward ", "Claim Rewards "],
    pf_manage: ["Kelola Staking ", "Manage Staking "],
    pf_connect_btn: ["Hubungkan Wallet ", "Connect Wallet "],
    no_wallet_title: ["Wallet tidak terdeteksi", "No wallet detected"],
    no_wallet_body: ["Kemungkinan beberapa extension wallet saling bentrok. Coba matikan wallet extension lain (Backpack, OKX, Bitget, dll), sisakan MetaMask saja, lalu muat ulang halaman ini.", 
                     "Multiple wallet extensions may be conflicting. Try disabling other wallet extensions (Backpack, OKX, Bitget, etc), keep only MetaMask, then reload this page."],
    close_label: ["Tutup", "Close"],
    slippage_title: ["Toleransi slippage", "Slippage tolerance"],
    slippage_btn: ["Pengaturan slippage", "Slippage settings"],
    custom_pct: ["Kustom %", "Custom %"],
    choose_wallet: ["Pilih wallet", "Choose a wallet"],
    chain_rejected_title: ["Wallet menolak menambah jaringan LitVM", "Wallet refused to add the LitVM network"],
    chain_rejected_body: ["Sebagian wallet (misalnya Zerion) tidak mengizinkan dapp menambahkan jaringan kustom secara otomatis.", "Some wallets (e.g. Zerion) don't allow dapps to add custom networks automatically."],
    chain_rejected_advice: ["Tambahkan LitVM Testnet secara manual di wallet Anda (chainId 4441, RPC LiteForge), lalu hubungkan lagi. Atau gunakan MetaMask, atau opsi 📱 Wallet Mobile / QR saat menghubungkan.", 
                            "Add LitVM Testnet manually in your wallet (chainId 4441, LiteForge RPC), then connect again. Or use MetaMask, or the 📱 Mobile Wallet / QR option when connecting."],
    connecting: ["Menghubungkan…", "Connecting…"],
    disconnect: ["Putuskan", "Disconnect"],
    nav_verify: ["Verifikasi", "Verify"],
    intro_eyebrow: ["30 detik", "30 seconds"],
    intro_title: ["Sebelum Anda mulai", "Before you start"],
    intro_lede: ["Empat hal yang sebaiknya Anda tahu. Kami lebih suka Anda mengetahuinya sekarang daripada setelah kehilangan sesuatu.", 
                 "Four things worth knowing. We'd rather you knew them now than after losing something."],
    intro_1_t: ["Ini testnet — uangnya tidak nyata", "This is a testnet — the money isn't real"],
    intro_1_b: ["Semua token di sini tanpa nilai dan gratis. Ambil dari tombol faucet di atas, lalu bereksperimen sepuasnya.", 
                "Every token here is worthless and free. Grab some from the faucet button above, then experiment all you like."],
    intro_2_t: ["Belum diaudit, dibangun satu orang", "Unaudited, built by one person"],
    intro_2_b: ["Kontraknya ditinjau sendiri oleh pembuatnya. Itu bukan audit, dan kami tidak akan menyebutnya begitu.", 
                "The contracts were reviewed by the person who wrote them. That isn't an audit, and we won't call it one."],
    intro_3_t: ["Kami memperingatkan sebelum Anda rugi", "We warn you before you lose money"],
    intro_3_b: ["Sebelum swap, Freesia menghitung kerugian Anda dalam dolar — bukan cuma persen — dan menahan Anda kalau angkanya buruk.", 
                "Before a swap, Freesia works out your loss in dollars — not just a percentage — and slows you down when the number is bad."],
    intro_4_t: ["Fee 0,3%, seluruhnya ke penyedia likuiditas", "0.3% fee, all of it to liquidity providers"],
    intro_4_b: ["Freesia tidak mengambil potongan. Belum ada token, belum ada janji airdrop.", "Freesia takes no cut. There's no token, and no airdrop promise."],
    intro_proof: ["Jangan percaya begitu saja: <a href=\"/verify\">periksa tiap kontrak</a> langsung dari blockchain, dan baca <a href=\"/insiden\">daftar kesalahan kami</a> — termasuk yang masih terbuka.", 
                  "Don't just take our word: <a href=\"/verify\">check every contract</a> straight from the blockchain, and read <a href=\"/insiden\">the list of our mistakes</a> — including the ones still open."],
    intro_verify: ["Lihat buktinya", "Show me the proof"],
    intro_start: ["Saya mengerti", "Got it"],
    nav_log: ["Insiden", "Incidents"],
    nav_report: ["Laporkan masalah", "Report an issue"],
    faucet_title: ["Testnet Faucet", "Testnet Faucet"],
    faucet_note: ["Token gratis untuk mencoba. Tanpa nilai uang.", "Free tokens to try things out. Worth no real money."],
    recent_tx: ["Transaksi terakhir", "Recent transactions"],
    hist_connect: ["Hubungkan wallet untuk melihat histori swap Anda", "Connect your wallet to see your swap history"],
    hist_loading: ["Membaca histori dari blockchain…", "Reading history from the blockchain…"],
    hist_none: ["Belum ada swap untuk alamat ini.", "No swaps for this address yet."],
    hist_view: ["Lihat ↗", "View ↗"],
    hist_local: ["demo (lokal)", "demo (local)"],
    hist_clear: ["Muat ulang dari blockchain", "Refresh from chain"],
    hist_scope: ["Dibaca dari ~{n} blok terakhir. Swap lebih lama tidak tercakup — semuanya tetap ada di explorer.", 
                 "Read from the last ~{n} blocks. Older swaps aren't covered — they all remain on the explorer."],
    select_token: ["Pilih token", "Select a token"],
    search_token: ["Cari nama atau simbol", "Search name or symbol"],
    spot_from_pool: ["harga spot dari pool", "spot price from the pool"],
    waiting_pool: ["menunggu data pool", "waiting for pool data"],
    refresh_btn: ["Muat ulang", "Reload"],
    min_received_slip: ["Minimal diterima (slippage {s}%)", "Min. received ({s}% slippage)"],
    slip_warn: ["⚠️ Slippage tinggi — swap Anda lebih rentan MEV", "⚠️ High slippage — your swap is more exposed to MEV"],
    no_pool: ["⚠️ Belum ada pool ter-deploy untuk {a}/{b}", "⚠️ No deployed pool configured for {a}/{b} yet"],
    loss_t_moderate: ["Swap ini sedikit merugikan", "This swap costs you a little"],
    loss_t_high: ["Swap ini merugikan Anda", "This swap hurts you"],
    loss_t_severe: ["Kerugian besar — pertimbangkan lagi", "Large loss — reconsider"],
    loss_explain: ["Di harga wajar Anda akan menerima {ideal} {sym}, tapi karena ukuran swap ini menggeser harga pool, Anda hanya menerima {actual} {sym}. Dampak harga {imp}%.", 
                   "At the fair price you'd receive {ideal} {sym}, but because this swap size moves the pool price, you only receive {actual} {sym}. Price impact {imp}%."],
    loss_advice_max: ["Untuk menjaga kerugian di bawah 2%, swap maksimal sekitar {amt} {sym}. Likuiditas pool ini masih kecil.", 
                      "To keep the loss under 2%, swap at most about {amt} {sym}. This pool's liquidity is still small."],
    loss_advice_limited: ["Likuiditas pool ini terbatas untuk ukuran swap tersebut.", "This pool's liquidity is limited for that swap size."],
    risk_title: ["Swap ini merugikan Anda", "This swap hurts you"],
    risk_est_loss: ["Perkiraan kerugian", "Estimated loss"],
    risk_note_body: ["Kerugian ini terjadi karena ukuran swap Anda menggeser harga di pool. Semakin besar swap dibanding likuiditas pool, semakin buruk harga yang Anda dapat. <b>Dana Anda tidak dicuri</b> — selisih ini masuk ke pool dan penyedia likuiditas.", 
                     "This loss happens because your swap size moves the pool price. The larger the swap relative to pool liquidity, the worse your price. <b>Your funds are not stolen</b> — the difference goes to the pool and its liquidity providers."],
    risk_phrase: ["SAYA MENGERTI", "I UNDERSTAND"],
    risk_type_label: ["Ketik {p} untuk melanjutkan:", "Type {p} to continue:"],
    risk_type_first: ["Ketik konfirmasi dulu", "Type the confirmation first"],
    risk_proceed: ["Ya, saya tetap lanjut", "Yes, proceed anyway"],
    risk_cancel: ["Batal", "Cancel"],
    risk_detail: ["Di harga wajar: {i} {sym}. Anda terima: {a} {sym}.", "At the fair price: {i} {sym}. You receive: {a} {sym}."],
    funds_safe: ["🛡️ Dana Anda aman — tidak ada token yang berpindah.", "🛡️ Your funds are safe — no tokens moved."],
    funds_unknown: ["❓ Status dana tidak dapat dipastikan. Periksa di block explorer.", "❓ Funds status can't be confirmed. Check the block explorer."],
    err_rej_t: ["Dibatalkan", "Cancelled"],
    err_rej_b: ["Anda membatalkan {what} di wallet.", "You cancelled the {what} in your wallet."],
    err_rej_a: ["Tidak ada yang terjadi. Coba lagi kapan saja.", "Nothing happened. Try again anytime."],
    err_rate_t: ["Jaringan sedang sibuk", "The network is busy"],
    err_rate_b: ["{what} tidak bisa diproses karena server jaringan membatasi permintaan.", "{what} couldn't be processed because the network server is rate-limiting requests."],
    err_rate_a: ["Tunggu 10–30 detik, lalu coba lagi. Ini masalah sementara, bukan pada wallet Anda.", "Wait 10–30 seconds and try again. This is temporary — not a problem with your wallet."],
    err_net_t: ["Koneksi jaringan bermasalah", "Network connection problem"],
    err_net_b: ["Tidak bisa menghubungi jaringan LitVM untuk {what}.", "Couldn't reach the LitVM network for the {what}."],
    err_net_a: ["Periksa koneksi internet Anda, lalu muat ulang halaman. Kalau berulang, jaringan LitVM mungkin sedang gangguan.", "Check your internet connection, then reload the page. If it keeps happening, the LitVM network may be having issues."],
    err_chain_t: ["Jaringan wallet salah", "Wrong wallet network"],
    err_chain_b: ["Wallet Anda tidak berada di jaringan LitVM Testnet.", "Your wallet is not on the LitVM Testnet network."],
    err_chain_a: ["Setujui permintaan pindah jaringan di wallet Anda, atau tambahkan LitVM Testnet secara manual.", "Approve the network-switch request in your wallet, or add LitVM Testnet manually."],
    err_gas_t: ["Gas tidak cukup", "Not enough gas"],
    err_gas_b: ["Saldo zkLTC Anda tidak cukup untuk membayar biaya jaringan {what}.", "Your zkLTC balance isn't enough to pay the network fee for the {what}."],
    err_gas_a: ["Token Anda tidak berkurang. Anda perlu sedikit zkLTC untuk biaya transaksi.", "Your tokens didn't move. You need a little zkLTC for transaction fees."],
    err_slip_t: ["Harga bergerak terlalu jauh", "Price moved too far"],
    err_slip_b: ["Harga berubah antara saat Anda menekan tombol dan saat transaksi diproses, melebihi batas toleransi Anda.", "The price changed between when you clicked and when the transaction was processed, beyond your tolerance."],
    err_slip_a: ["Token Anda tetap utuh — hanya biaya gas yang terpakai. Coba lagi, atau naikkan toleransi slippage di pengaturan.", "Your tokens are intact — only gas was spent. Try again, or raise the slippage tolerance in settings."],
    err_cool_t: ["Faucet masih dalam masa tunggu", "Faucet is still cooling down"],
    err_cool_b: ["Anda sudah mengambil token dari faucet baru-baru ini.", "You claimed from the faucet recently."],
    err_cool_a: ["Tunggu sampai masa tunggu selesai. Waktu tersisa tertera di tombol faucet.", "Wait until the cooldown ends. The remaining time is shown on the faucet button."],
    err_none_t: ["Belum ada reward", "No rewards yet"],
    err_none_b: ["Belum ada reward FREE yang bisa diklaim saat ini.", "There are no FREE rewards to claim right now."],
    err_none_a: ["Reward terkumpul seiring waktu selama LP Anda di-stake.", "Rewards accumulate over time while your LP is staked."],
    err_nowallet_b: ["Browser Anda tidak menyediakan wallet yang bisa dihubungkan.", "Your browser doesn't provide a wallet to connect."],
    err_nowallet_a: ["Pasang MetaMask. Kalau sudah terpasang, coba matikan extension wallet lain yang mungkin bentrok, lalu muat ulang halaman.", "Install MetaMask. If it's installed, try disabling other wallet extensions that may conflict, then reload the page."],
    err_revert_t: ["{what} ditolak", "{what} rejected"],
    err_revert_b: ["Smart contract menolak transaksi ini. Penyebab pastinya tidak diketahui.", "The smart contract rejected this transaction. The exact cause is unknown."],
    err_revert_a: ["Token Anda tetap utuh; hanya biaya gas yang terpakai. Coba periksa jumlah dan saldo Anda, lalu ulangi.", "Your tokens are intact; only gas was spent. Check your amounts and balances, then try again."],
    err_unknown_t: ["{what} gagal", "{what} failed"],
    err_unknown_b: ["Terjadi kesalahan yang tidak dikenali.", "An unrecognized error occurred."],
    err_unknown_a: ["Periksa riwayat transaksi di wallet atau block explorer untuk memastikan status dana Anda.", "Check your transaction history in your wallet or the block explorer to confirm your funds."],
    tx_approving: ["Menyetujui…", "Approving…"],
    tx_approving_t: ["Menyetujui {s}…", "Approving {s}…"],
    tx_confirm: ["Konfirmasi di wallet…", "Confirm in wallet…"],
    tx_swapping: ["Menukar…", "Swapping…"],
    tx_adding: ["Menambah likuiditas…", "Adding liquidity…"],
    tx_removing: ["Menarik likuiditas…", "Removing liquidity…"],
    tx_staking: ["Staking…", "Staking…"],
    tx_unstaking: ["Unstaking…", "Unstaking…"],
    tx_claiming: ["Mengklaim…", "Claiming…"],
    ok_swapped: ["✅ Berhasil menukar {a} {p} → {b} {r}", "✅ Swapped {a} {p} → {b} {r}"],
    ok_liq_added: ["✅ Likuiditas ditambahkan", "✅ Liquidity added"],
    ok_liq_removed: ["✅ Likuiditas ditarik", "✅ Liquidity removed"],
    ok_staked: ["✅ Berhasil stake {n} LP", "✅ Staked {n} LP"],
    ok_unstaked: ["✅ Berhasil unstake {n} LP", "✅ Unstaked {n} LP"],
    ok_claimed: ["✅ Reward berhasil diklaim", "✅ Rewards claimed"],
    ok_claimed100: ["✅ Berhasil ambil 100 {s}", "✅ Claimed 100 {s}"],
    ok_disconnected: ["Wallet terputus", "Wallet disconnected"],
    enter_both: ["Isi kedua jumlah", "Enter both amounts"],
    enter_lp: ["Masukkan jumlah LP", "Enter an LP amount"],
    claim100: ["Ambil 100", "Claim 100"],
    wait_h: ["Tunggu ~{h}j", "Wait ~{h}h"],
    earn_footer: ["Belum punya LP? Tambahkan likuiditas di tab Pool dulu, lalu kembali ke sini untuk stake.", "Don't have LP yet? Add liquidity on the Pool tab first, then come back here to stake it."],
    pf_footer: ["Data dibaca langsung dari smart contract di LitVM Testnet.", "Data is read directly from the smart contracts on LitVM Testnet."],
    pf_note_body: ["<strong>Catatan:</strong> token reward saat ini bernama <b>FREE</b> sesuai kontrak yang ter-deploy. Sistem <b>veMBG</b> (vote-escrowed) masih dalam roadmap dan akan hadir setelah kontraknya siap.", 
                   "<strong>Note:</strong> the reward token is currently named <b>FREE</b>, matching the deployed contract. The <b>veMBG</b> (vote-escrowed) system is still on the roadmap and will arrive once its contract is ready."],
    pf_excl_free: ["Belum termasuk {n} FREE yang belum diklaim (belum ada harga pasar)", "Excludes {n} unclaimed FREE (no market price yet)"],
    pf_total_sub2: ["Nilai dompet + posisi likuiditas Anda", "Your wallet value + liquidity positions"],
    pf_no_price: ["harga belum tersedia", "no price yet"],
    pf_pos_unstaked: ["LP Belum Di-stake", "Unstaked LP"],
    pf_pos_staked: ["LP Di-stake", "Staked LP"],
    pf_pos_staked_sub: ["Menghasilkan reward FREE", "Earning FREE rewards"],
    pf_pos_rewards: ["Reward Belum Diklaim", "Unclaimed Rewards"],
    pf_pos_rewards_sub: ["Siap diklaim kapan saja", "Claimable anytime"],
    pf_pos_share: ["Pangsa Pool", "Pool Share"],
    pf_pos_share_sub: ["Porsi Anda di pool USDC/DAI", "Your share of the USDC/DAI pool"],
    pf_no_pos: ["Belum ada posisi. Tambahkan likuiditas di tab Pool untuk memulai.", "No positions yet. Add liquidity on the Pool tab to get started."],
    pf_free_avail: ["{n} FREE tersedia", "{n} FREE available"],
    pf_no_reward: ["Belum ada reward", "No rewards yet"],
    pf_lp_staked: ["{n} LP di-stake", "{n} LP staked"],
    pf_no_stake: ["Belum ada LP di-stake", "No LP staked yet"],
    pf_load_fail: ["Gagal memuat data — ", "Failed to load data — "],
    pf_fail_tokens: ["Gagal memuat saldo token", "Failed to load token balances"],
    pf_fail_pos: ["Gagal memuat posisi", "Failed to load positions"],
    sc_imp_high: ["Dampak harga tinggi ({i}%) — kamu menggerakkan harga pool cukup jauh.", "High price impact ({i}%) — you're moving the pool price a lot."],
    sc_imp_mid: ["Dampak harga sedang ({i}%).", "Moderate price impact ({i}%)."],
    sc_imp_low: ["Dampak harga kecil ({i}%).", "Small price impact ({i}%)."],
    sc_dev_big: ["Harga pool menyimpang {d}% dari referensi DIA — pool mungkin belum seimbang.", "Pool price deviates {d}% from the DIA reference — the pool may be unbalanced."],
    sc_dev_mid: ["Harga pool sedikit berbeda ({d}%) dari referensi DIA.", "Pool price differs slightly ({d}%) from the DIA reference."],
    sc_dev_ok: ["Harga pool sesuai referensi pasar DIA ✓", "Pool price matches the DIA market reference ✓"],
    sc_dia_avail: ["Referensi DIA tersedia untuk {s} sebagai pembanding.", "A DIA reference is available for {s} as a benchmark."],
    ph_thin: ["Likuiditas masih tipis (~{d} total) — swap besar akan kena dampak harga signifikan.", "Liquidity is still thin (~{d} total) — large swaps will take significant price impact."],
    ph_depth: ["Likuiditas pool: ~{d} total ({a} + {b}).", "Pool liquidity: ~{d} total ({a} + {b})."],
    ph_imb_big: ["Pool tidak seimbang: rasio {r} (idealnya ~1.0 untuk dua stablecoin).", "Pool is unbalanced: ratio {r} (ideally ~1.0 for two stablecoins)."],
    ph_imb_mid: ["Pool sedikit tidak seimbang (rasio {r}).", "Pool is slightly unbalanced (ratio {r})."],
    ph_balanced: ["Pool seimbang (rasio {r}, mendekati 1:1) ✓", "Pool is balanced (ratio {r}, close to 1:1) ✓"],
    ph_dia_dev: ["Menurut oracle DIA (USDC ≈${p}), harga DAI di pool menyimpang ~{d}% dari $1.00.", "Per the DIA oracle (USDC ≈${p}), the pool's DAI price deviates ~{d}% from $1.00."],
    ph_dia_ok: ["Harga pool konsisten dengan referensi DIA ✓", "Pool price is consistent with the DIA reference ✓"]
};

const I18N_HTML_KEYS = new Set([
    'intro_proof', 'risk_note_body', 'lb_how', 'st_onchain', 'st_phase', 'pf_note_body'
]);

function t(key) {
    const e = I18N[key];
    if (!e) return key;
    return LANG === 'en' ? e[1] : e[0];
}

function setLang(l) {
    LANG = (l === 'en') ? 'en' : 'id';
    try { localStorage.setItem('freesia_lang', LANG); } catch (e) {}
    document.documentElement.lang = LANG;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        const v = t(k);
        if (I18N_HTML_KEYS.has(k)) el.innerHTML = v;
        else el.textContent = v;
    });
    
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    
    document.querySelectorAll('[data-langbtn]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-langbtn') === LANG);
    });
    
    try {
        const wBtn = document.getElementById('walletBtn');
        if (wBtn && !state.connected) wBtn.textContent = t('connect_wallet');
        refreshLabels();
        refreshAllConnectButtons();
        updateFromPay();
        if (currentView === 'pool') refreshPoolView();
        if (currentView === 'earn') refreshEarnView();
        if (currentView === 'portfolio') refreshPortfolioView();
        if (currentView === 'leaderboard') renderLeaderboardList();
    } catch (e) {}
}

// =====================================================================
// 10. CORE SWAP FUNCTIONS
// =====================================================================

async function loadPoolReserves() {
    const poolAddress = poolFor(state.pay, state.receive);
    const p = dataProvider();
    if (!poolAddress || !p) { poolReserves.loaded = false; return false; }
    try {
        return await rpcQueue.add(async () => {
            const pool = new ethers.Contract(poolAddress, POOL_ABI, p);
            const [rA, rB, tA, tB, ts] = await Promise.all([
                pool.reserveA(), pool.reserveB(), pool.tokenA(), pool.tokenB(), pool.totalSupply()
            ]);
            poolReserves = {
                a: parseFloat(ethers.formatUnits(rA, 18)),
                b: parseFloat(ethers.formatUnits(rB, 18)),
                totalSupply: parseFloat(ethers.formatUnits(ts, 18)),
                tokenA: tA.toLowerCase(),
                tokenB: tB.toLowerCase(),
                loaded: true
            };
            return true;
        });
    } catch (err) {
        console.error('Gagal memuat reserve pool:', err);
        poolReserves.loaded = false;
        return false;
    }
}

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

// =====================================================================
// 13. HISTORY FUNCTIONS
// =====================================================================

function historyKey() {
    return userAddress ? 'freesia_tx_' + userAddress.toLowerCase() : null;
}

function loadHistoryCache() {
    const k = historyKey();
    if (!k) { txHistory = []; return; }
    try {
        const raw = localStorage.getItem(k);
        const parsed = raw ? JSON.parse(raw) : [];
        txHistory = (Array.isArray(parsed) ? parsed : []).filter(isValidTxEntry).slice(0, 30);
    } catch (e) { txHistory = []; }
}

function saveHistoryCache() {
    const k = historyKey();
    if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(txHistory.slice(0, 30))); } catch (e) {}
}

function isValidTxEntry(tx) {
    if (!tx || typeof tx !== 'object') return false;
    const okStr = (s) => typeof s === 'string' && s.length > 0 && s.length <= 24 && !/[<>"']/.test(s);
    if (!okStr(tx.pay) || !okStr(tx.receive)) return false;
    if (!(isFinite(tx.payVal) && tx.payVal >= 0 && tx.payVal < 1e15)) return false;
    if (!(isFinite(tx.receiveVal) && tx.receiveVal >= 0 && tx.receiveVal < 1e15)) return false;
    if (tx.hash !== null && tx.hash !== undefined && !TX_HASH_RE.test(tx.hash)) return false;
    if (tx.block !== null && tx.block !== undefined && !(isFinite(tx.block) && tx.block >= 0)) return false;
    return true;
}

function renderHistory() {
    const el = document.getElementById('txList');
    if (!el) return;
    const note = document.getElementById('txNote');
    const clearBtn = document.getElementById('txClearBtn');

    if (!state.connected) {
        setSafeContent(el, t('hist_connect'));
        if (note) note.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    if (!txHistory.length) {
        setSafeContent(el, historyLoading ? t('hist_loading') : t('hist_none'));
        if (note) note.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    el.innerHTML = '';
    txHistory.slice(0, 10).forEach(tx => {
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.style.cssText = 'align-items:flex-start; gap:8px;';
        
        const left = document.createElement('div');
        left.style.cssText = 'display:flex; flex-direction:column; gap:2px; min-width:0;';
        const pair = document.createElement('span');
        pair.style.cssText = 'font-weight:600; color:var(--text-primary);';
        pair.textContent = `${safeText(tx.pay)} → ${safeText(tx.receive)}`;
        const amt = document.createElement('span');
        amt.className = 'amt';
        amt.style.cssText = 'font-weight:500; color:var(--text-secondary); font-size:11.5px;';
        amt.textContent = `${fmt(tx.payVal, 4)} → ${fmt(tx.receiveVal, 4)}`;
        left.appendChild(pair);
        left.appendChild(amt);
        
        const right = document.createElement('div');
        if (tx.hash && TX_HASH_RE.test(tx.hash)) {
            const link = document.createElement('a');
            link.className = 'status';
            link.style.cssText = 'text-decoration:underline;';
            link.href = `${LITVM_NETWORK.blockExplorerUrls[0]}/tx/${tx.hash}`;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = t('hist_view');
            right.appendChild(link);
        } else {
            const span = document.createElement('span');
            span.className = 'status';
            span.style.cssText = 'opacity:.6;';
            span.textContent = t('hist_local');
            right.appendChild(span);
        }
        
        item.appendChild(left);
        item.appendChild(right);
        el.appendChild(item);
    });

    if (note) {
        note.style.display = '';
        setSafeContent(note, historyLoading
            ? t('hist_loading')
            : t('hist_scope').replace('{n}', LB_BLOCK_RANGE.toLocaleString('en-US')));
    }
    if (clearBtn) clearBtn.style.display = '';
}

function clearHistoryCache() {
    const k = historyKey();
    if (k) { try { localStorage.removeItem(k); } catch (e) {} }
    txHistory = [];
    renderHistory();
    refreshHistoryPanel();
}

async function refreshHistoryPanel() {
    if (!state.connected || !userAddress) { renderHistory(); return; }
    if (!txHistory.length) loadHistoryCache();
    renderHistory();
    await loadOnChainHistory();
}

async function loadOnChainHistory() {
    const p = dataProvider();
    if (!p || !userAddress) return;
    historyLoading = true;
    renderHistory();
    try {
        const latest = await p.getBlockNumber();
        const fromBlock = Math.max(0, latest - LB_BLOCK_RANGE);
        const found = [];

        for (const [, addr] of Object.entries(POOLS)) {
            const pool = new ethers.Contract(addr, POOL_ABI, p);
            for (let start = fromBlock; start <= latest; start += LB_CHUNK) {
                const end = Math.min(start + LB_CHUNK - 1, latest);
                let events = [];
                try {
                    events = await pool.queryFilter(pool.filters.Swap(userAddress), start, end);
                } catch (e) { continue; }
                for (const ev of events) {
                    try {
                        found.push({
                            pay: symbolOf(ev.args.tokenIn),
                            receive: symbolOf(ev.args.tokenOut),
                            payVal: parseFloat(ethers.formatUnits(ev.args.amountIn, 18)),
                            receiveVal: parseFloat(ethers.formatUnits(ev.args.amountOut, 18)),
                            hash: ev.transactionHash,
                            block: ev.blockNumber
                        });
                    } catch (e) {}
                }
                await sleep(60);
            }
        }
        mergeHistory(found);
    } catch (err) {
        console.error('Histori on-chain gagal dimuat:', err);
    } finally {
        historyLoading = false;
        renderHistory();
    }
}

function symbolOf(addr) {
    const a = (addr || '').toLowerCase();
    for (const [sym, tk] of Object.entries(TOKENS)) {
        if ((tk.address || '').toLowerCase() === a) return sym;
    }
    return a ? a.slice(0, 6) + '…' : '?';
}

function mergeHistory(incoming) {
    const seen = new Set(txHistory.map(x => x.hash).filter(Boolean));
    for (const tx of incoming) {
        if (tx.hash && seen.has(tx.hash)) continue;
        if (tx.hash) seen.add(tx.hash);
        txHistory.push(tx);
    }
    txHistory.sort((a, b) => (b.block || Infinity) - (a.block || Infinity));
    txHistory = txHistory.slice(0, 30);
    saveHistoryCache();
}

// =====================================================================
// 14. VIEW FUNCTIONS
// =====================================================================

const VIEWS = {
    swap:      { el: 'swapView',      nav: 'navSwap' },
    pool:      { el: 'poolView',      nav: 'navPool',      onShow: () => refreshPoolView() },
    earn:      { el: 'earnView',      nav: 'navEarn',      onShow: () => refreshEarnView() },
    portfolio: { el: 'portfolioView', nav: 'navPortfolio', onShow: () => refreshPortfolioView() },
    leaderboard: { el: 'leaderboardView', nav: 'navLeaderboard', onShow: () => refreshLeaderboardView() },
    stats: { el: 'statsView', nav: 'navStats', onShow: () => refreshStatsView() }
};

function switchView(view) {
    if (!VIEWS[view]) return;
    currentView = view;
    Object.entries(VIEWS).forEach(([key, cfg]) => {
        const el = document.getElementById(cfg.el);
        const nav = document.getElementById(cfg.nav);
        if (key === view) {
            if (el) { el.style.display = ''; el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter'); }
        } else {
            if (el) el.style.display = 'none';
        }
        if (nav) nav.classList.toggle('active', key === view);
    });
    const onShow = VIEWS[view].onShow;
    if (typeof onShow === 'function') onShow();
}

// =====================================================================
// 15. PANEL FUNCTIONS
// =====================================================================

function togglePanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const wasOpen = panel.classList.contains('show');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
    closeWalletDropdown();
    document.getElementById('settingsBtn')?.classList.remove('on');
    document.getElementById('historyBtn')?.classList.remove('on');
    if (!wasOpen) {
        panel.classList.add('show');
        if (id === 'settingsPanel') document.getElementById('settingsBtn')?.classList.add('on');
        if (id === 'historyPanel') document.getElementById('historyBtn')?.classList.add('on');
        if (id === 'faucetPanel') renderFaucetPanel();
        if (id === 'historyPanel') refreshHistoryPanel();
    }
}

function setSlippage(val, btn) {
    val = parseFloat(val);
    if (!isFinite(val) || val <= 0) return;
    val = Math.min(Math.max(val, 0.01), 50);
    if (val > 5) showToast(t('slip_warn'));
    state.slippage = val;
    document.querySelectorAll('.slip-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else document.getElementById('customSlip').value = val;
    updateFromPay();
}

// =====================================================================
// 16. TOKEN MODAL FUNCTIONS
// =====================================================================

function openModal(target) {
    state.pickerTarget = target;
    document.getElementById('tokenSearch').value = '';
    renderTokenList();
    document.getElementById('tokenModal').classList.add('show');
}

function closeModal() { document.getElementById('tokenModal').classList.remove('show'); }

function closeModalOnOverlay(e) { if (e.target.id === 'tokenModal') closeModal(); }

function renderTokenList() {
    const q = document.getElementById('tokenSearch').value.trim().toLowerCase();
    const list = document.getElementById('tokenList');
    list.innerHTML = '';
    const otherSide = state.pickerTarget === 'pay' ? state.receive : state.pay;
    Object.entries(TOKENS).forEach(([sym, t]) => {
        if (q && !sym.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) return;
        const disabled = sym === otherSide;
        const row = document.createElement('div');
        row.className = 'token-row' + (disabled ? ' disabled' : '');
        const icon = document.createElement('div');
        icon.className = 'token-icon';
        icon.style.background = t.color;
        icon.textContent = t.letter;
        const info = document.createElement('div');
        info.className = 'token-row-info';
        const name = document.createElement('span');
        name.textContent = sym;
        const full = document.createElement('span');
        full.textContent = t.name;
        info.appendChild(name);
        info.appendChild(full);
        const bal = document.createElement('div');
        bal.className = 'token-row-bal';
        bal.textContent = fmt(t.balance, 4);
        row.appendChild(icon);
        row.appendChild(info);
        row.appendChild(bal);
        row.onclick = () => selectToken(sym);
        list.appendChild(row);
    });
}

async function selectToken(sym) {
    if (state.pickerTarget === 'pay') {
        if (sym === state.receive) return;
        state.pay = sym;
    } else {
        if (sym === state.pay) return;
        state.receive = sym;
    }
    closeModal();
    await loadPoolReserves();
    refreshLabels();
    updateFromPay();
}

// =====================================================================
// 17. CHART FUNCTIONS
// =====================================================================

function drawImpactChart() {
    const line = document.getElementById('chartLine');
    const area = document.getElementById('chartArea');
    const dot  = document.getElementById('chartDot');
    const axis = document.getElementById('chartAxisLabels');
    const main = document.getElementById('chartPriceMain');
    const note = document.getElementById('chartPriceNote');
    if (!line || !area) return;

    const r = reservesFor(state.pay, state.receive);
    if (!r || !(r.rIn > 0) || !(r.rOut > 0)) {
        line.setAttribute('d', '');
        area.setAttribute('d', '');
        if (dot) dot.style.display = 'none';
        if (main) setSafeContent(main, '—');
        if (note) setSafeContent(note, t('waiting_pool'));
        return;
    }

    const spot = r.rOut / r.rIn;
    if (main) setSafeContent(main, fmt(spot, 4));
    if (note) setSafeContent(note, `1 ${state.pay} = ${fmt(spot, 4)} ${state.receive}`);

    const maxIn = r.rIn * 0.25;
    const W = 400, H = 150, STEPS = 60;
    const maxImpact = 40;

    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
        const amtIn = (maxIn * i) / STEPS;
        let impact = 0;
        if (amtIn > 0) {
            const out = quoteOut(amtIn, r.rIn, r.rOut);
            impact = (1 - (out / amtIn) / spot) * 100;
        }
        const x = (i / STEPS) * W;
        const y = H - Math.min(impact / maxImpact, 1) * H;
        pts.push([x, y]);
    }

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    line.setAttribute('d', d);
    area.setAttribute('d', `${d} L${W},${H} L0,${H} Z`);

    const payVal = parseNum(document.getElementById('payInput')?.value);
    if (dot && payVal > 0 && payVal <= maxIn) {
        const impact = priceImpact(payVal);
        const x = (payVal / maxIn) * W;
        const y = H - Math.min(impact / maxImpact, 1) * H;
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', y.toFixed(1));
        dot.style.display = '';
    } else if (dot) {
        dot.style.display = 'none';
    }

    if (axis) {
        const spans = axis.querySelectorAll('span');
        for (let i = 0; i < spans.length; i++) {
            const v = (maxIn * i) / (spans.length - 1);
            setSafeContent(spans[i], i === 0 ? '0' : fmt(v, 0));
        }
    }
}

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

// =====================================================================
// 26. IL CALCULATOR
// =====================================================================

function renderIL(sliderVal) {
    const pct = Number(sliderVal);
    const r = 1 + pct / 100;
    const lbl = document.getElementById('ilPctLabel');
    const moveEl = document.getElementById('ilPriceMove');
    const resEl = document.getElementById('ilResult');
    const noteEl = document.getElementById('ilNote');
    if (!resEl) return;

    if (lbl) lbl.textContent = (pct >= 0 ? '+' : '') + pct + '%';
    if (moveEl) moveEl.textContent = (pct >= 0 ? '+' : '') + pct + '%';

    let ilPct = 0;
    if (r > 0) {
        const il = (2 * Math.sqrt(r)) / (1 + r) - 1;
        ilPct = il * 100;
    }
    const shown = Math.abs(ilPct);
    resEl.textContent = '-' + shown.toFixed(2) + '%';

    let color = 'var(--accent)';
    let note = t('il_note_small');
    if (shown >= 5) {
        color = 'var(--danger)';
        note = t('il_note_big');
    } else if (shown >= 1) {
        color = 'var(--warning)';
        note = t('il_note_mid');
    } else if (pct === 0) {
        note = t('il_note_zero');
    }
    resEl.style.color = color;
    if (noteEl) noteEl.textContent = note;
}

// =====================================================================
// 27. THEME FUNCTIONS
// =====================================================================

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyThemeIcon() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const isLight = currentTheme() === 'light';
    btn.innerHTML = isLight ? 
        '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a1 1 0 0 0-1.3-1.2A10.3 10.3 0 1 0 21.7 15.5a1 1 0 0 0-1.2-1.3z"/></svg>' :
        '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 2.4v2.4M12 19.2v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/></g></svg>';
    btn.title = isLight ? 'Ganti ke tema gelap' : 'Ganti ke tema terang';
}

function toggleTheme() {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('freesia_theme', next); } catch (e) {}
    applyThemeIcon();
}

applyThemeIcon();

// =====================================================================
// 28. STATUS BAR FUNCTIONS
// =====================================================================

async function pingLatency() {
    const p = dataProvider();
    const dot = document.getElementById('netDot');
    const lat = document.getElementById('netLatency');
    if (!p || !dot || !lat) return;
    const t0 = performance.now();
    try {
        await p.getBlockNumber();
        const ms = Math.round(performance.now() - t0);
        lat.textContent = ms + ' ms';
        let color = 'var(--accent)';
        if (ms >= 800) color = 'var(--danger)';
        else if (ms >= 300) color = 'var(--warning)';
        dot.style.background = color;
        dot.style.boxShadow = '0 0 6px ' + color;
    } catch (e) {
        lat.textContent = t('net_disconnected');
        dot.style.background = 'var(--danger)';
        dot.style.boxShadow = 'none';
    }
}

async function refreshStatusPrices() {
    // Simplified - just show placeholder
    const els = ['pxLTC', 'pxETH', 'pxBTC'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

function startStatusBar() {
    pingLatency();
    refreshStatusPrices();
    setInterval(() => { if (!document.hidden) pingLatency(); }, 15000);
    setInterval(() => { if (!document.hidden) refreshStatusPrices(); }, 60000);
}

// =====================================================================
// 29. INTRO FUNCTIONS
// =====================================================================

const INTRO_KEY = 'freesia_intro_seen';

function dismissIntro() {
    const el = document.getElementById('introOverlay');
    if (el) el.classList.remove('show');
    try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
    document.removeEventListener('keydown', introKey);
}

function introKey(e) { if (e.key === 'Escape') dismissIntro(); }

function maybeShowIntro() {
    let seen = null;
    try { seen = localStorage.getItem(INTRO_KEY); } catch (e) { seen = '1'; }
    if (seen) return;
    const el = document.getElementById('introOverlay');
    if (!el) return;
    el.classList.add('show');
    el.addEventListener('click', (e) => { if (e.target === el) dismissIntro(); });
    document.addEventListener('keydown', introKey);
    const btn = document.getElementById('introStart');
    if (btn) setTimeout(() => btn.focus(), 120);
}

// =====================================================================
// 30. FOOTER LINKS
// =====================================================================

const LINKS = {
    report: 'https://github.com/Muhammadzack/Freesia/issues/new/choose',
    landing: 'https://freesiadex.xyz',
    x: 'https://x.com/freesiadex',
    github: 'https://github.com/Muhammadzack',
    docs: 'https://docs.freesiadex.xyz'
};
const BUILDER_HANDLE = '@0xZackBh';
const BUILDER_X = 'https://x.com/0xZackBh';

const ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 2.8 11h2.4v9.2h5.2v-5.6h3.2v5.6h5.2V11h2.4z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.79 1.07.79 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>',
    docs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5zM8 12h8v1.6H8zm0 3.4h8V17H8zm0-6.8h4v1.6H8z"/></svg>',
    verify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2 4.6 5.3v5.4c0 4.6 3.1 8.9 7.4 10.1 4.3-1.2 7.4-5.5 7.4-10.1V5.3z"/><path d="m8.8 12.1 2.2 2.2 4.2-4.4" fill="none" stroke="var(--bg-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    log: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zm3.4 4.4v1.7h7.2V7.4zm0 4.1v1.7h7.2v-1.7zm0 4.1v1.7h4.6v-1.7z"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6 22.2 20.4H1.8zM11.1 9v5.4h1.8V9zm0 6.9v1.9h1.8v-1.9z"/></svg>'
};

function renderFooterLinks() {
    const nav = document.getElementById('siteLinks');
    if (!nav) return;

    const external = [
        { key:'x', label:'X', url: LINKS.x },
        { key:'github', label:'GitHub', url: LINKS.github },
        { key:'docs', label:'Docs', url: LINKS.docs }
    ].filter(it => it.url && it.url.trim() !== '');

    const homeHtml = LINKS.landing
        ? `<a class="site-link" href="${LINKS.landing}" title="Kembali ke beranda">
               ${ICONS.home}<span>Beranda</span>
           </a>`
        : '';

    const proofHtml = `
        <a class="site-link" href="/verify">
            ${ICONS.verify}<span data-i18n="nav_verify">Verifikasi</span>
        </a>
        <a class="site-link" href="/insiden">
            ${ICONS.log}<span data-i18n="nav_log">Insiden</span>
        </a>
        <a class="site-link" href="${LINKS.report}" target="_blank" rel="noopener noreferrer">
            ${ICONS.report}<span data-i18n="nav_report">Laporkan masalah</span>
        </a>`;

    nav.innerHTML = homeHtml + proofHtml + external.map(it =>
        `<a class="site-link" href="${it.url}" target="_blank" rel="noopener noreferrer" title="${it.label}">
            ${ICONS[it.key] || ''}<span>${it.label}</span>
         </a>`).join('');

    const builder = document.getElementById('builderLink');
    if (builder) {
        builder.textContent = BUILDER_HANDLE;
        builder.href = BUILDER_X || '#';
    }

    const logo = document.getElementById('logoLink');
    if (logo && LINKS.landing) logo.href = LINKS.landing;
}

renderFooterLinks();

// =====================================================================
// 31. INITIALIZATION
// =====================================================================

// Watch for wallet
(function watchForWallet() {
    const DEADLINE_MS = 3000;
    const INTERVAL_MS = 250;
    let waited = 0;
    let listenersAttached = false;

    function attachListeners(eth) {
        if (listenersAttached) return;
        if (eth && typeof eth.on === 'function') {
            eth.on('accountsChanged', () => window.location.reload());
            eth.on('chainChanged', () => window.location.reload());
            listenersAttached = true;
        }
    }

    const timer = setInterval(() => {
        try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}
        const eth = getEthereumProvider();
        if (eth) {
            attachListeners(eth);
            hideWalletWarning();
            clearInterval(timer);
            return;
        }
        waited += INTERVAL_MS;
        if (waited >= DEADLINE_MS) {
            clearInterval(timer);
            showWalletWarning();
        }
    }, INTERVAL_MS);
})();

// Bootstrap public data
(async function bootstrapPublicData() {
    const ok = await loadPoolReserves();
    if (ok) {
        refreshLabels();
        drawImpactChart();
        await updateFromPay();
    } else {
        console.warn('Reserve pool belum bisa dimuat dari RPC publik.');
        drawImpactChart();
    }
})();

// Refresh pool data periodically
setInterval(async () => {
    if (document.hidden) return;
    const ok = await loadPoolReserves();
    if (ok) { refreshLabels(); drawImpactChart(); }
}, 30000);

// Init language
(function initLang() {
    let saved = 'id';
    try { saved = localStorage.getItem('freesia_lang') || 'id'; } catch (e) {}
    setLang(saved);
})();

// Start status bar
startStatusBar();

// Show intro
maybeShowIntro();

// Initial refresh
refreshLabels();
validateBalance(parseNum(document.getElementById('payInput')?.value || '0'));

LOG('Freesia DEX initialized with security improvements');
LOG('RPC Queue: 3 requests per 500ms');
LOG('Debug mode:', DEBUG);
