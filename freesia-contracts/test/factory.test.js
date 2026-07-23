/**
 * factory.test.js - Menguji PoolFactory: permissionless, no-duplicate,
 * alamat CREATE2 terprediksi, dan urutan token yang konsisten.
 *
 * Jalankan:  npx hardhat test test/factory.test.js
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

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
  const fs = require("fs");
  const path = require("path");
  fs.writeFileSync(path.join(__dirname, "..", "contracts", "MockERC20.sol"), MOCK_ERC20_SOURCE);
  await hre.run("compile");

  const [deployer, stranger] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockERC20");
  const tokenX = await Mock.deploy(); await tokenX.waitForDeployment();
  const tokenY = await Mock.deploy(); await tokenY.waitForDeployment();

  const Factory = await ethers.getContractFactory("PoolFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  return { factory, tokenX, tokenY, deployer, stranger };
}

describe("PoolFactory", function () {
  it("permissionless: alamat mana pun (bukan cuma deployer) bisa createPool", async function () {
    const { factory, tokenX, tokenY, stranger } = await deployFixture();
    // 'stranger' BUKAN deployer factory - buktikan tidak ada onlyOwner.
    const tx = await factory
      .connect(stranger)
      .createPool(await tokenX.getAddress(), await tokenY.getAddress());
    await expect(tx).to.emit(factory, "PoolCreated");
  });

  it("mencegah pool duplikat untuk pasangan token yang sama", async function () {
    const { factory, tokenX, tokenY } = await deployFixture();
    await factory.createPool(await tokenX.getAddress(), await tokenY.getAddress());
    await expect(
      factory.createPool(await tokenX.getAddress(), await tokenY.getAddress())
    ).to.be.revertedWith("Factory: pool exists");
  });

  it("duplikat tetap tercegah walau urutan argumen dibalik (B, A)", async function () {
    const { factory, tokenX, tokenY } = await deployFixture();
    await factory.createPool(await tokenX.getAddress(), await tokenY.getAddress());
    // Urutan dibalik - harus tetap dianggap pasangan yang sama.
    await expect(
      factory.createPool(await tokenY.getAddress(), await tokenX.getAddress())
    ).to.be.revertedWith("Factory: pool exists");
  });

  it("getPool[A][B] dan getPool[B][A] menunjuk ke pool yang sama", async function () {
    const { factory, tokenX, tokenY } = await deployFixture();
    const xAddr = await tokenX.getAddress();
    const yAddr = await tokenY.getAddress();
    await factory.createPool(xAddr, yAddr);
    const poolAB = await factory.getPool(xAddr, yAddr);
    const poolBA = await factory.getPool(yAddr, xAddr);
    expect(poolAB).to.equal(poolBA);
    expect(poolAB).to.not.equal(ethers.ZeroAddress);
  });

  it("predictPoolAddress SEBELUM deploy == alamat SESUDAH deploy", async function () {
    const { factory, tokenX, tokenY } = await deployFixture();
    const xAddr = await tokenX.getAddress();
    const yAddr = await tokenY.getAddress();

    const predicted = await factory.predictPoolAddress(xAddr, yAddr);
    await factory.createPool(xAddr, yAddr);
    const actual = await factory.getPool(xAddr, yAddr);

    expect(predicted.toLowerCase()).to.equal(actual.toLowerCase());
  });

  it("predictPoolAddress juga konsisten walau argumen dibalik", async function () {
    const { factory, tokenX, tokenY } = await deployFixture();
    const xAddr = await tokenX.getAddress();
    const yAddr = await tokenY.getAddress();
    const p1 = await factory.predictPoolAddress(xAddr, yAddr);
    const p2 = await factory.predictPoolAddress(yAddr, xAddr);
    expect(p1).to.equal(p2);
  });

  it("menolak token identik", async function () {
    const { factory, tokenX } = await deployFixture();
    const xAddr = await tokenX.getAddress();
    await expect(factory.createPool(xAddr, xAddr)).to.be.revertedWith(
      "Factory: identical tokens"
    );
  });

  it("allPoolsLength & allPools bertambah tiap pool baru", async function () {
    const { factory, tokenX, tokenY, deployer } = await deployFixture();
    expect(await factory.allPoolsLength()).to.equal(0);

    await factory.createPool(await tokenX.getAddress(), await tokenY.getAddress());
    expect(await factory.allPoolsLength()).to.equal(1);

    // Pasangan berbeda (token baru) -> pool kedua.
    const Mock = await ethers.getContractFactory("MockERC20");
    const tokenZ = await Mock.deploy(); await tokenZ.waitForDeployment();
    await factory.createPool(await tokenX.getAddress(), await tokenZ.getAddress());
    expect(await factory.allPoolsLength()).to.equal(2);
  });

  it("pool yang dibuat factory benar-benar berfungsi (bisa addLiquidity)", async function () {
    const { factory, tokenX, tokenY, deployer } = await deployFixture();
    const xAddr = await tokenX.getAddress();
    const yAddr = await tokenY.getAddress();
    await factory.createPool(xAddr, yAddr);
    const poolAddr = await factory.getPool(xAddr, yAddr);

    const pool = await ethers.getContractAt("SimpleLiquidityPoolV3", poolAddr);
    const amt = ethers.parseEther("1000");
    await tokenX.mint(deployer.address, amt);
    await tokenY.mint(deployer.address, amt);
    await tokenX.approve(poolAddr, amt);
    await tokenY.approve(poolAddr, amt);

    await expect(pool.addLiquidity(amt, amt)).to.not.be.reverted;
  });
});
