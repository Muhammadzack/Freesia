const hre = require("hardhat");
const POOL = "0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8";
const STK  = "0x5810F270dd7643Caa60858b1f5CC4a250BA38C13";
const USDC = "0x6c567a7Fb7A2b4968D230A644D3C76E731e34837";
const P_ABI = ["function reserveA() view returns (uint256)","function reserveB() view returns (uint256)","function tokenA() view returns (address)","function totalSupply() view returns (uint256)","function balanceOf(address) view returns (uint256)"];
const S_ABI = ["function totalSupply() view returns (uint256)","function balanceOf(address) view returns (uint256)","function earned(address) view returns (uint256)"];
const f = (x) => Number(hre.ethers.formatUnits(x, 18)).toLocaleString("en-US",{maximumFractionDigits:6});
async function main() {
  const [s] = await hre.ethers.getSigners();
  const me = await s.getAddress();
  const pr = hre.ethers.provider;
  const p = new hre.ethers.Contract(POOL, P_ABI, pr);
  const [rA, rB, tA, ts, myLp] = await Promise.all([p.reserveA(),p.reserveB(),p.tokenA(),p.totalSupply(),p.balanceOf(me)]);
  const aIsUsdc = tA.toLowerCase() === USDC.toLowerCase();
  console.log("Alamat Anda      :", me);
  console.log("Cadangan USDC    :", f(aIsUsdc ? rA : rB));
  console.log("Cadangan DAI     :", f(aIsUsdc ? rB : rA));
  console.log("Total suplai LP  :", f(ts));
  console.log("Saldo LP Anda    :", f(myLp));
  let st = 0n;
  try {
    const c = new hre.ethers.Contract(STK, S_ABI, pr);
    const [b, e, t] = await Promise.all([c.balanceOf(me), c.earned(me), c.totalSupply()]);
    st = b;
    console.log("LP Anda di-stake :", f(b), "| reward:", f(e), "FREE");
    console.log("Total LP distake :", f(t));
  } catch (e) { console.log("Staking          : gagal dibaca"); }
  const mine = myLp + st;
  const share = ts > 0n ? (Number(mine)/Number(ts))*100 : 0;
  console.log("LP milik Anda    :", f(mine), "(" + share.toFixed(4) + "%)");
  const code = await pr.getCode(POOL);
  const SEL = {"8da5cb5b":"owner()","f2fde38b":"transferOwnership","715018a6":"renounceOwnership","8456cb59":"pause()","db2e21bc":"emergencyWithdraw()"};
  const hit = Object.entries(SEL).filter(([x]) => code.includes(x)).map(([,n]) => n);
  console.log("Bytecode         :", (code.length-2)/2, "byte");
  console.log("Jejak admin      :", hit.length ? hit.join(", ") : "tidak ada");
  const ada = rA > 0n || rB > 0n;
  console.log("─".repeat(50));
  if (!ada && ts === 0n) console.log("VONIS: Pool kosong total. Migrasi bersih.");
  else if (ada && ts === 0n) console.log("VONIS: BAHAYA — ada cadangan tanpa LP. Dana terkunci permanen.");
  else if (share > 99.9) console.log("VONIS: Anda praktis satu-satunya LP. Migrasi bisa mandiri.");
  else if (mine === 0n) console.log("VONIS: LP milik orang lain. Jangan ditarik — mereka yang harus tarik.");
  else console.log("VONIS: Ada LP orang lain. Anda hanya bisa tarik porsi Anda.");
}
main().catch((e) => { console.error(e); process.exit(1); });
