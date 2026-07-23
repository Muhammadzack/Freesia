// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * USDTToken — token ERC-20 mock untuk LitVM Testnet, meniru pola USDC/DAI
 * yang sudah dipakai di Freesia DEX (lihat TOKENS di index.html).
 *
 * Ini token TESTNET, bukan USDT asli — tidak ada peg, tidak ada backing,
 * murni untuk simulasi pool USDT di lingkungan testnet.
 *
 * Sama seperti MBGToken: fixed supply, di-mint sekali ke deployer.
 * Deployer bertanggung jawab mendistribusikan token ini (lewat faucet
 * contract yang sudah ada, atau transfer manual) untuk kebutuhan testing.
 *
 * CATATAN DESIMAL: USDT asli di mainnet pakai 6 desimal, tapi token ini
 * SENGAJA memakai 18 desimal — supaya konsisten dengan USDC/DAI yang sudah
 * dipakai di Freesia DEX (keduanya juga 18 desimal di sini, bukan mengikuti
 * konvensi asli). SimpleLiquidityPoolV3 dan kode frontend (addLiquidity,
 * removeLiquidity, dst) mengasumsikan 18 desimal di banyak tempat — memakai
 * desimal yang berbeda akan butuh penyesuaian ekstra dan berisiko salah
 * hitung. Konsistensi lebih penting daripada akurasi terhadap USDT asli
 * di lingkungan testnet ini.
 */
contract USDTToken {
    string public constant name = "Tether USD (Testnet)";
    string public constant symbol = "USDT";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupplyWhole) {
        uint256 initialSupply = initialSupplyWhole * (10 ** uint256(decimals));
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "USDT: allowance tidak cukup");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "USDT: transfer ke alamat nol");
        require(balanceOf[from] >= amount, "USDT: saldo tidak cukup");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
