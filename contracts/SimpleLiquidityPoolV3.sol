// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleERC20.sol";

contract SimpleLiquidityPoolV3 {
    address public tokenA;
    address public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "Pool: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensBurned);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != _tokenB, "Pool: identical tokens");
        require(_tokenA != address(0) && _tokenB != address(0), "Pool: zero address");
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transferLp(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Pool: insufficient allowance");
        allowance[from][msg.sender] -= amount;
        _transferLp(from, to, amount);
        return true;
    }

    function _transferLp(address from, address to, uint256 amount) internal {
        require(to != address(0), "Pool: transfer to zero");
        require(balanceOf[from] >= amount, "Pool: insufficient LP balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        require(SimpleERC20(token).transfer(to, amount), "Pool: transfer failed");
    }
    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        require(SimpleERC20(token).transferFrom(from, to, amount), "Pool: transferFrom failed");
    }

    function addLiquidity(uint256 amountA, uint256 amountB)
        external nonReentrant returns (uint256 lpTokens)
    {
        require(amountA > 0 && amountB > 0, "Pool: amounts must be > 0");
        uint256 usedA = amountA;
        uint256 usedB = amountB;
        if (totalSupply == 0) {
            uint256 liquidity = _sqrt(amountA * amountB);
            require(liquidity > MINIMUM_LIQUIDITY, "Pool: insufficient first liquidity");
            lpTokens = liquidity - MINIMUM_LIQUIDITY;
            balanceOf[address(0)] += MINIMUM_LIQUIDITY;
            totalSupply += MINIMUM_LIQUIDITY;
        } else {
            uint256 amountBOptimal = (amountA * reserveB) / reserveA;
            if (amountBOptimal <= amountB) {
                usedA = amountA;
                usedB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (amountB * reserveA) / reserveB;
                usedA = amountAOptimal;
                usedB = amountB;
            }
            uint256 lpFromA = (usedA * totalSupply) / reserveA;
            uint256 lpFromB = (usedB * totalSupply) / reserveB;
            lpTokens = lpFromA < lpFromB ? lpFromA : lpFromB;
        }
        require(lpTokens > 0, "Pool: insufficient liquidity minted");
        _safeTransferFrom(tokenA, msg.sender, address(this), usedA);
        _safeTransferFrom(tokenB, msg.sender, address(this), usedB);
        balanceOf[msg.sender] += lpTokens;
        totalSupply += lpTokens;
        reserveA += usedA;
        reserveB += usedB;
        emit LiquidityAdded(msg.sender, usedA, usedB, lpTokens);
    }

    function removeLiquidity(uint256 lpTokens, uint256 minAmountA, uint256 minAmountB)
        external nonReentrant returns (uint256 amountA, uint256 amountB)
    {
        require(lpTokens > 0, "Pool: lpTokens must be > 0");
        require(balanceOf[msg.sender] >= lpTokens, "Pool: insufficient LP");
        amountA = (lpTokens * reserveA) / totalSupply;
        amountB = (lpTokens * reserveB) / totalSupply;
        require(amountA > 0 && amountB > 0, "Pool: insufficient liquidity burned");
        require(amountA >= minAmountA && amountB >= minAmountB, "Pool: slippage exceeded");
        balanceOf[msg.sender] -= lpTokens;
        totalSupply -= lpTokens;
        reserveA -= amountA;
        reserveB -= amountB;
        emit LiquidityRemoved(msg.sender, amountA, amountB, lpTokens);
        _safeTransfer(tokenA, msg.sender, amountA);
        _safeTransfer(tokenB, msg.sender, amountB);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut)
        external nonReentrant returns (uint256 amountOut)
    {
        require(tokenIn == tokenA || tokenIn == tokenB, "Pool: invalid token");
        require(amountIn > 0, "Pool: amountIn must be > 0");
        require(reserveA > 0 && reserveB > 0, "Pool: no liquidity");
        bool isTokenA = (tokenIn == tokenA);
        address tokenOut = isTokenA ? tokenB : tokenA;
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        require(amountOut >= minAmountOut, "Pool: slippage exceeded");
        require(amountOut < reserveOut, "Pool: insufficient liquidity");
        if (isTokenA) { reserveA += amountIn; reserveB -= amountOut; }
        else          { reserveB += amountIn; reserveA -= amountOut; }
        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        _safeTransfer(tokenOut, msg.sender, amountOut);
        emit Swap(msg.sender, tokenIn, amountIn, tokenOut, amountOut);
    }

    function getAmountOut(address tokenIn, uint256 amountIn)
        external view returns (uint256 amountOut)
    {
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
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) {
            z = 1;
        }
    }
}
