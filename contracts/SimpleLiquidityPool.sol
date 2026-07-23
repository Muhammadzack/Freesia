// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleERC20.sol";

contract SimpleLiquidityPool {
    address public tokenA;
    address public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensBurned);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != _tokenB, "Pool: identical tokens");
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 lpTokens) {
        require(amountA > 0 && amountB > 0, "Pool: amounts must be > 0");
        SimpleERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        SimpleERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        if (totalSupply == 0) {
            lpTokens = _sqrt(amountA * amountB);
        } else {
            uint256 lpFromA = (amountA * totalSupply) / reserveA;
            uint256 lpFromB = (amountB * totalSupply) / reserveB;
            lpTokens = lpFromA < lpFromB ? lpFromA : lpFromB;
        }
        require(lpTokens > 0, "Pool: insufficient liquidity minted");
        reserveA += amountA;
        reserveB += amountB;
        totalSupply += lpTokens;
        balanceOf[msg.sender] += lpTokens;
        emit LiquidityAdded(msg.sender, amountA, amountB, lpTokens);
    }

    function removeLiquidity(uint256 lpTokens) external returns (uint256 amountA, uint256 amountB) {
        require(lpTokens > 0, "Pool: lpTokens must be > 0");
        require(balanceOf[msg.sender] >= lpTokens, "Pool: insufficient LP tokens");
        amountA = (lpTokens * reserveA) / totalSupply;
        amountB = (lpTokens * reserveB) / totalSupply;
        require(amountA > 0 && amountB > 0, "Pool: insufficient liquidity burned");
        balanceOf[msg.sender] -= lpTokens;
        totalSupply -= lpTokens;
        reserveA -= amountA;
        reserveB -= amountB;
        SimpleERC20(tokenA).transfer(msg.sender, amountA);
        SimpleERC20(tokenB).transfer(msg.sender, amountB);
        emit LiquidityRemoved(msg.sender, amountA, amountB, lpTokens);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        require(tokenIn == tokenA || tokenIn == tokenB, "Pool: invalid token");
        require(amountIn > 0, "Pool: amountIn must be > 0");
        require(reserveA > 0 && reserveB > 0, "Pool: no liquidity");
        bool isTokenA = (tokenIn == tokenA);
        address tokenOut = isTokenA ? tokenB : tokenA;
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        SimpleERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        require(amountOut >= minAmountOut, "Pool: slippage exceeded");
        require(amountOut < reserveOut, "Pool: insufficient liquidity");
        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }
        SimpleERC20(tokenOut).transfer(msg.sender, amountOut);
        emit Swap(msg.sender, tokenIn, amountIn, tokenOut, amountOut);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == tokenA || tokenIn == tokenB, "Pool: invalid token");
        require(reserveA > 0 && reserveB > 0, "Pool: no liquidity");
        bool isTokenA = (tokenIn == tokenA);
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function getPrice() external view returns (uint256 price) {
        require(reserveA > 0, "Pool: no liquidity");
        price = (reserveB * 1e18) / reserveA;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

