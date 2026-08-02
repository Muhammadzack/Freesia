/**
 * Freesia Internationalization Layer
 *
 * Responsibilities:
 * - Indonesian / English translations
 * - Translation lookup
 * - Language switching
 * - Refresh translated application UI
 *
 * Runtime dependencies:
 * - UI and feature functions may be declared by scripts loaded later.
 * - setLang() is executed only after all application scripts are loaded.
 */

// =====================================================================
// LANGUAGE STATE
// =====================================================================

let LANG = 'id';

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
