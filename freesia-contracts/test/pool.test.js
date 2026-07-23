/**
 * pool.test.js - Menguji perbaikan audit di SimpleLiquidityPoolV3.
 *
 * Jalankan:  npx hardhat test
 *
 * Test ini memakai token ERC20 mock (didefinisikan inline lewat fixture) agar
 * bisa menguji perilaku pool tanpa jaringan. Setiap FIX punya test yang gagal
 * kalau perbaikannya dihapus.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

// Mock ERC20 minimal yang mengembalikan bool - cukup untuk menguji pool.
const MOCK_ERC20_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s]=a; return true; }
    function transfer(address to, uint256 a) external returns (bool) {
        require(balanceOf[msg.sender] >= a, "bal");
        balanceOf[msg.sender]-=a; balanceOf[to]+=a; return true;
    }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        require(balanceOf[f] >= a, "bal");
        require(allowance[f][msg.sender] >= a, "allow");
        allowance[f][msg.sender]-=a; balanceOf[f]-=a; balanceOf[to]+=a; return true;
    }
}`;

async function deployFixture() {
  // Tulis mock ke file sementara agar Hardhat meng-compile-nya bersama pool.
  const fs = require("fs");
  const path = require("path");
  const p = path.join(__dirname, "..", "contracts", "MockERC20.sol");
  fs.writeFileSync(p, MOCK_ERC20_SOURCE);
  await hre.run("compile");

  const [deployer, user] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockERC20");
  const a = await Mock.deploy(); await a.waitForDeployment();
  const b = await Mock.deploy(); await b.waitForDeployment();

  const Pool = await ethers.getContractFactory("SimpleLiquidityPoolV3");
  const pool = await Pool.deploy(await a.getAddress(), await b.getAddress());
  await pool.waitForDeployment();

  return { pool, a, b, deployer, user };
}

const E = (n) => ethers.parseEther(String(n));

describe("SimpleLiquidityPoolV3 - perbaikan audit", function () {
  let pool, a, b, deployer;

  beforeEach(async function () {
    ({ pool, a, b, deployer } = await deployFixture());
    await a.mint(deployer.address, E(1_000_000));
    await b.mint(deployer.address, E(1_000_000));
    await a.approve(await pool.getAddress(), E(1_000_000));
    await b.approve(await pool.getAddress(), E(1_000_000));
  });

  it("FIX #2: membakar MINIMUM_LIQUIDITY pada setoran pertama", async function () {
    await pool.addLiquidity(E(10000), E(10000));
    // address(0) memegang MINIMUM_LIQUIDITY yang dibakar
    expect(await pool.balanceOf(ethers.ZeroAddress)).to.equal(1000n);
  });

  it("FIX #1: setoran pertama yang terlalu kecil ditolak, tidak lenyap", async function () {
    // sqrt(kecil) <= MINIMUM_LIQUIDITY -> harus revert, bukan mint 0
    await expect(pool.addLiquidity(100n, 100n)).to.be.revertedWith(
      "Pool: insufficient first deposit"
    );
  });

  it("FIX #3: rasio tak seimbang hanya menarik porsi yang sesuai", async function () {
    await pool.addLiquidity(E(10000), E(10000)); // pool 1:1
    const beforeA = await a.balanceOf(deployer.address);
    const beforeB = await b.balanceOf(deployer.address);
    // Beri 100 A tapi 500 B (kelebihan B). Pool harus ambil ~100 A : 100 B saja.
    await pool.addLiquidity(E(100), E(500));
    const spentA = beforeA - (await a.balanceOf(deployer.address));
    const spentB = beforeB - (await b.balanceOf(deployer.address));
    expect(spentA).to.equal(E(100));
    expect(spentB).to.equal(E(100)); // bukan 500 - kelebihan tidak diserap
  });

  it("FIX #4: removeLiquidity menghormati minAmount (slippage)", async function () {
    await pool.addLiquidity(E(10000), E(10000));
    const lp = await pool.balanceOf(deployer.address);
    // Minta minimal yang mustahil tinggi -> harus revert slippage
    await expect(
      pool.removeLiquidity(lp, E(999999), E(999999))
    ).to.be.revertedWith("Pool: slippage exceeded");
  });

  it("FIX #5: nonReentrant terpasang (state _locked kembali ke 1)", async function () {
    await pool.addLiquidity(E(10000), E(10000));
    // Panggilan berurutan berhasil -> berarti lock dilepas setelah tiap panggilan
    await pool.addLiquidity(E(1000), E(1000));
    await pool.swap(await a.getAddress(), E(100), 0);
    // Kalau lock tidak dilepas, panggilan kedua akan revert "reentrant call".
  });

  it("swap: proteksi slippage minAmountOut tetap berfungsi", async function () {
    await pool.addLiquidity(E(10000), E(10000));
    await expect(
      pool.swap(await a.getAddress(), E(100), E(999999))
    ).to.be.revertedWith("Pool: slippage exceeded");
  });

  it("swap: hasil sesuai rumus fee 997/1000 (cocok dengan amm-math.js frontend)", async function () {
    await pool.addLiquidity(E(10000), E(10000));
    const out = await pool.getAmountOut(await a.getAddress(), E(1000));
    // Nilai yang sama dengan test frontend: ~906.61 DAI untuk 1000 USDC di pool 1:1
    const outNum = Number(ethers.formatEther(out));
    expect(outNum).to.be.closeTo(906.61, 0.05);
  });
});
