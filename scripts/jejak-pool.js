const hre = require("hardhat");
const POOL = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8";
const ABI = ["function balanceOf(address) view returns (uint256)","function totalSupply() view returns (uint256)"];
const f = (x) => Number(hre.ethers.formatUnits(x,18)).toLocaleString("en-US",{maximumFractionDigits:6});
const sleep = (m) => new Promise(r => setTimeout(r, m));
async function main() {
  const pr = hre.ethers.provider;
  const [s] = await hre.ethers.getSigners();
  const me = (await s.getAddress()).toLowerCase();
  const latest = await pr.getBlockNumber();

  // Cari blok kelahiran pool: getCode kosong = belum ada
  let lo = 0, hi = latest;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    let code = "0x";
    try { code = await pr.getCode(POOL, mid); } catch (e) { lo = mid + 1; continue; }
    if (code === "0x") lo = mid + 1; else hi = mid;
    await sleep(40);
  }
  console.log("Blok kelahiran   :", lo, "| blok terkini:", latest, "| rentang:", latest - lo);

  const logs = [];
  for (let b = lo; b <= latest; b += 9000) {
    try { logs.push(...await pr.getLogs({ address: POOL, fromBlock: b, toBlock: Math.min(b + 8999, latest) })); }
    catch (e) {}
    await sleep(50);
  }
  console.log("Total log pool   :", logs.length);

  const sigs = {};
  const cand = new Set([me]);
  for (const l of logs) {
    sigs[l.topics[0]] = (sigs[l.topics[0]] || 0) + 1;
    for (const t of l.topics.slice(1)) {
      if (/^0x0{24}[0-9a-f]{40}$/i.test(t)) cand.add("0x" + t.slice(26).toLowerCase());
    }
    const d = (l.data || "0x").slice(2);
    for (let i = 0; i + 64 <= d.length; i += 64) {
      const w = d.slice(i, i + 64);
      if (/^0{24}[0-9a-f]{40}$/i.test(w) && !/^0{64}$/.test(w)) cand.add("0x" + w.slice(24).toLowerCase());
    }
  }
  console.log("Jenis event      :", Object.keys(sigs).length);
  for (const [k, v] of Object.entries(sigs)) console.log("  ", k.slice(0, 12) + "…", "×", v);

  const c = new hre.ethers.Contract(POOL, ABI, pr);
  const ts = await c.totalSupply();
  console.log("Kandidat dicek   :", cand.size);
  console.log("─".repeat(52));
  let sum = 0n;
  for (const a of cand) {
    let b = 0n;
    try { b = await c.balanceOf(a); } catch (e) { continue; }
    if (b > 0n) { sum += b; console.log(a === me ? "ANDA " : "LAIN ", a, f(b), "(" + ((Number(b)/Number(ts))*100).toFixed(4) + "%)"); }
    await sleep(50);
  }
  console.log("─".repeat(52));
  console.log("Ditemukan        :", f(sum), "dari", f(ts), "LP");
  const sisa = ts - sum;
  if (sisa > 0n) console.log("BELUM KETEMU     :", f(sisa), "LP — pemegangnya masih misterius");
  else console.log("Semua LP terlacak.");
}
main().catch(e => { console.error(e); process.exit(1); });
