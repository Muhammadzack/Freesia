// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./SimpleLiquidityPoolV3.sol";

/**
 * PoolFactory - membuat pool SimpleLiquidityPoolV3 secara PERMISSIONLESS.
 *
 * Filosofi (sama seperti Uniswap V2 Factory):
 *   - Siapa pun bisa memanggil createPool() untuk pasangan token apa pun.
 *   - Factory TIDAK menilai apakah sebuah token "aman". Itu bukan tugasnya -
 *     dan sengaja begitu, supaya sistem tetap terbuka & tidak tersentralisasi.
 *   - "Daftar resmi/terkurasi" (mana token yang direkomendasikan ke pengguna
 *     awam) hidup di LUAR contract ini - di frontend (lihat TOKENS di
 *     index.html) dan proses kurasi manual. Lihat CURATION_CHECKLIST.md.
 *   - Semua pool dari factory ini punya BYTECODE YANG IDENTIK, jadi siapa pun
 *     bisa memverifikasi "pool ini asli buatan factory Freesia" dengan
 *     mengecek getPool[] - bukan sekadar percaya alamat yang diklaim seseorang.
 *
 * CREATE2 dipakai supaya:
 *   1. Alamat pool bisa dihitung SEBELUM di-deploy (predictPoolAddress).
 *   2. Tidak mungkin ada dua pool untuk pasangan token yang sama (salt unik
 *      per pasangan token, deployment kedua akan revert otomatis).
 *
 * CATATAN: ini untuk TESTNET. Untuk mainnet, WAJIB audit profesional -
 * sama seperti SimpleLiquidityPoolV3 yang di-deploy-nya.
 */
contract PoolFactory {
    // getPool[tokenA][tokenB] dan getPool[tokenB][tokenA] SELALU mengarah ke
    // pool yang sama (lihat _sortTokens) - konsisten dengan pola Uniswap.
    mapping(address => mapping(address => address)) public getPool;

    // Daftar semua pool yang pernah dibuat factory ini - berguna untuk
    // frontend/indexer menampilkan "semua pool yang ada" tanpa event log.
    address[] public allPools;

    event PoolCreated(
        address indexed tokenA,
        address indexed tokenB,
        address pool,
        uint256 poolIndex
    );

    /// Jumlah pool yang sudah dibuat lewat factory ini.
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    /**
     * Membuat pool baru untuk pasangan (tokenA, tokenB). PERMISSIONLESS -
     * siapa saja boleh memanggil ini untuk pasangan token apa pun.
     *
     * Revert kalau:
     *   - token sama (tokenA == tokenB)
     *   - salah satu alamat nol
     *   - pool untuk pasangan ini SUDAH ada (cegah duplikat)
     */
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Factory: identical tokens");
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        require(token0 != address(0), "Factory: zero address");
        require(getPool[token0][token1] == address(0), "Factory: pool exists");

        // Salt unik per pasangan token (sudah terurut) -> alamat CREATE2
        // deterministik dan bisa diprediksi lewat predictPoolAddress().
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        // SimpleLiquidityPoolV3 constructor menerima (tokenA, tokenB) apa
        // adanya - kita teruskan dalam urutan yang SUDAH diurutkan (token0,
        // token1) supaya bytecode+constructor args konsisten untuk pasangan
        // yang sama, apa pun urutan argumen yang dipakai pemanggil.
        pool = address(new SimpleLiquidityPoolV3{salt: salt}(token0, token1));

        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool; // arah sebaliknya juga, biar gampang dicari
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, allPools.length - 1);
    }

    /**
     * Hitung alamat pool untuk pasangan token SEBELUM dibuat - berguna untuk
     * frontend mengecek "apakah pool ini sudah ada" atau menampilkan alamat
     * yang akan dipakai sebelum transaksi createPool dikirim.
     * Mengembalikan address(0) kalau input tidak valid.
     */
    function predictPoolAddress(address tokenA, address tokenB) external view returns (address) {
        if (tokenA == tokenB) return address(0);
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        if (token0 == address(0)) return address(0);

        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(SimpleLiquidityPoolV3).creationCode,
                abi.encode(token0, token1)
            )
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)
        );
        return address(uint160(uint256(hash)));
    }

    /// Urutkan dua alamat token secara numerik. Memastikan getPool[A][B] dan
    /// getPool[B][A] selalu merujuk pasangan yang sama, tanpa peduli urutan
    /// argumen yang dipakai pemanggil createPool().
    function _sortTokens(address a, address b) internal pure returns (address token0, address token1) {
        if (a == address(0) || b == address(0)) return (address(0), address(0));
        (token0, token1) = a < b ? (a, b) : (b, a);
    }
}
