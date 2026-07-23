// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMintable {
    function mint(address to, uint256 amount) external;
}

contract Faucet {
    uint256 public constant CLAIM_AMOUNT = 100 * 1e18;
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => mapping(address => uint256)) public lastClaimed;

    event Claimed(address indexed user, address indexed token, uint256 amount);

    function claim(address token) external {
        uint256 nextAllowed = lastClaimed[token][msg.sender] + COOLDOWN;
        require(block.timestamp >= nextAllowed, "Faucet: cooldown active, try again later");
        lastClaimed[token][msg.sender] = block.timestamp;
        IMintable(token).mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, token, CLAIM_AMOUNT);
    }

    function claimBoth(address tokenA, address tokenB) external {
        _claimOne(tokenA);
        _claimOne(tokenB);
    }

    function _claimOne(address token) internal {
        uint256 nextAllowed = lastClaimed[token][msg.sender] + COOLDOWN;
        require(block.timestamp >= nextAllowed, "Faucet: cooldown active, try again later");
        lastClaimed[token][msg.sender] = block.timestamp;
        IMintable(token).mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, token, CLAIM_AMOUNT);
    }

    function timeUntilNextClaim(address token, address user) external view returns (uint256) {
        uint256 nextAllowed = lastClaimed[token][user] + COOLDOWN;
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }
}
