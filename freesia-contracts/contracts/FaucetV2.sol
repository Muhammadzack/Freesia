// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMintable {
    function mint(address to, uint256 amount) external;
}

interface IERC20Basic {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FaucetV2 {
    uint256 public constant CLAIM_AMOUNT = 100 * 1e18;
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => mapping(address => uint256)) public lastClaimed;

    event Claimed(address indexed user, address indexed token, uint256 amount, bool minted);
    event Funded(address indexed token, address indexed from, uint256 amount);

    function claim(address token) external {
        _claimOne(token);
    }

    function claimBoth(address tokenA, address tokenB) external {
        _claimOne(tokenA);
        _claimOne(tokenB);
    }

    function claimMany(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            _claimOne(tokens[i]);
        }
    }

    function _claimOne(address token) internal {
        uint256 nextAllowed = lastClaimed[token][msg.sender] + COOLDOWN;
        require(block.timestamp >= nextAllowed, "Faucet: cooldown active, try again later");
        lastClaimed[token][msg.sender] = block.timestamp;

        bool minted = _tryMint(token, msg.sender, CLAIM_AMOUNT);
        if (!minted) {
            uint256 bal = IERC20Basic(token).balanceOf(address(this));
            require(bal >= CLAIM_AMOUNT, "Faucet: saldo faucet tidak cukup untuk token ini, hubungi admin");
            bool ok = IERC20Basic(token).transfer(msg.sender, CLAIM_AMOUNT);
            require(ok, "Faucet: transfer token gagal");
        }

        emit Claimed(msg.sender, token, CLAIM_AMOUNT, minted);
    }

    function _tryMint(address token, address to, uint256 amount) internal returns (bool) {
        bytes memory payload = abi.encodeWithSelector(IMintable.mint.selector, to, amount);
        (bool success, ) = token.call(payload);
        return success;
    }

    function timeUntilNextClaim(address token, address user) external view returns (uint256) {
        uint256 nextAllowed = lastClaimed[token][user] + COOLDOWN;
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }

    function faucetBalance(address token) external view returns (uint256) {
        return IERC20Basic(token).balanceOf(address(this));
    }
}
