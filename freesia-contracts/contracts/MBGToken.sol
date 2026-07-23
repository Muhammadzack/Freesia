// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * MBGToken — token ERC-20 sederhana untuk LitVM Testnet.
 *
 * Desain yang disengaja:
 *   - FIXED SUPPLY: seluruh 100.000.000 MBG di-mint SEKALI ke deployer saat
 *     kontrak di-deploy. Tidak ada fungsi mint() setelah itu — supply tidak
 *     akan pernah bertambah lagi, apa pun yang terjadi.
 *   - BURNABLE: siapa pun boleh membakar (burn) token miliknya sendiri.
 *     Ini MENGURANGI totalSupply secara permanen — kebalikan dari mint.
 *     Tidak ada burnFrom tanpa allowance; pemegang token hanya bisa
 *     membakar miliknya sendiri, atau lewat allowance yang mereka setujui.
 *
 * Ini BUKAN token upgradeable, tidak ada owner istimewa, tidak ada pause,
 * tidak ada blacklist. Sesuai checklist kurasi token kita sendiri
 * (CURATION_CHECKLIST.md) — token yang aman dikurasi adalah yang perilakunya
 * bisa diprediksi penuh dari kode ini saja.
 */
contract MBGToken {
    string public constant name = "MBG Token";
    string public constant symbol = "MBG";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Burn(address indexed from, uint256 value);

    constructor() {
        uint256 initialSupply = 100_000_000 * (10 ** uint256(decimals));
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
        require(allowed >= amount, "MBG: allowance tidak cukup");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "MBG: saldo tidak cukup untuk burn");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 allowed = allowance[account][msg.sender];
        require(allowed >= amount, "MBG: allowance tidak cukup untuk burn");
        require(balanceOf[account] >= amount, "MBG: saldo tidak cukup untuk burn");
        if (allowed != type(uint256).max) {
            allowance[account][msg.sender] = allowed - amount;
        }
        balanceOf[account] -= amount;
        totalSupply -= amount;
        emit Burn(account, amount);
        emit Transfer(account, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "MBG: transfer ke alamat nol");
        require(balanceOf[from] >= amount, "MBG: saldo tidak cukup");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

