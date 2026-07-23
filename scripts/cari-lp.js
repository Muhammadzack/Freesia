const hre = require("hardhat");
const POOL = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8";
const ABI = ["function balanceOf(address) view returns (uint256)","function totalSupply() view returns (uint256)"];
const f = (x) => Number(hre.ethers.formatUnits(x,18)).toLocaleString("en-US",{maximumFractionDigits:6});
const T = hre.ethers.id("Transfer(address,address,uint256)");
async function main() {
  const pr = hre.ethers.provider;
  const [s] = await hre.ethers.getSigners();
  const me = (await s.getAddress()).toLowerCase();
  const latest = await pr.getBlockNumber();
  let logs = [];
  try {
    logs = await pr.getLogs({ address: POOL, topics: [T], fromBlock: 0, toBlock: latest });
    console.log("Log dibaca sekaligus:", logs.length);
  } catch (e) {
    console.log("Rentang penuh ditolak — membaca bertahap…");
    for (let b = Math.max(0, latest - 300000); b <= latest; b += 9000) {
      try { logs.push(...await pr.getLogs({ address: POOL, topics:[T], fromBlock: b, toBlock: Math.min(b+8999, latest) })); } catch (_) {}
      await new Promise(r => setTimeout(r, 60));
    }
    console.log("Log terkumpul:", logs.length);
  }
  const cand = new Set();
  for (const l of logs) {
    if (l.topics[1]) cand.add("0x" + l.topics[1].slice(26).toLowerCase());
    if (l.topics[2]) cand.add("0x" + l.topics[2].slice(26).toLowerCase());
  }
  cand.delete("0x0000000000000000000000000000000000000000");
  cand.add(me);
  console.log("Alamat kandidat  :", cand.size);
  const c = new hre.ethers.Contract(POOL, ABI, pr);
  const ts = await c.totalSupply();
  console.log("Total suplai LP  :", f(ts));
  console.log("─".repeat(50));
  for (const a of cand) {
    const b = await c.balanceOf(a);
    if (b > 0n) console.log(a === me ? "ANDA " : "LAIN ", a, f(b), "LP", "(" + ((Number(b)/Number(ts))*100).toFixed(4) + "%)");
    await new Promise(r => setTimeout(r, 60));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
