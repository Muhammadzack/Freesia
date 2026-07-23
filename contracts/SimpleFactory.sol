// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleLiquidityPool.sol";

contract SimpleFactory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    event PoolCreated(address indexed tokenA, address indexed tokenB, address pool, uint256 totalPools);

    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Factory: identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Factory: zero address");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPool[token0][token1] == address(0), "Factory: pool already exists");
        pool = address(new SimpleLiquidityPool(token0, token1));
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);
        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    function poolExists(address tokenA, address tokenB) external view returns (bool) {
        return getPool[tokenA][tokenB] != address(0);
    }
}
