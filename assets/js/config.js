// =====================================================================
// FREESIA — NETWORK, CONTRACT, TOKEN, POOL & STAKING CONFIGURATION
// File ini harus dimuat sebelum app.js.
// =====================================================================

// =====================================================================
// 3. KONFIGURASI NETWORK & TOKENS
// =====================================================================

const CHAIN_ID_EXPECTED = 4441;

const RPC_ENDPOINTS = Object.freeze([
    {
        id: 'primary',
        label: 'Caldera Partner',
        url: 'https://liteforge.rpc.caldera.xyz/infra-partner-http',
        priority: 1,
        stallTimeout: 450
    },
    {
        id: 'official',
        label: 'Caldera Official',
        url: 'https://liteforge.rpc.caldera.xyz/http',
        priority: 2,
        stallTimeout: 650
    }
]);

const LITVM_NETWORK = {
    chainId: '0x1159',
    chainName: 'LitVM Testnet',
    rpcUrls: RPC_ENDPOINTS.map(rpc => rpc.url),
    nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
    blockExplorerUrls: ['https://liteforge.explorer.caldera.xyz']
};

const TOKENS = {
    USDC: { name:'USD Coin', color:'#2775ca', letter:'U', price:1.00,  balance:0, decimals:18, address:'0x6c567a7Fb7A2b4968D230A644D3C76E731e34837' },
    DAI:  { name:'Dai',      color:'#f5ac37', letter:'D', price:0.831, balance:0, decimals:18, address:'0xd06C4C54837e1BBd458948C45E306DA38b19a0Bc' },
    MBG:  { name:'MBG Token',color:'#9b59b6', letter:'M', price:0.01,  balance:0, decimals:18, address:'0xD8aA8416d1C0d5290d99390c3ce38B2160c49167' },
    USDT: { name:'Tether USD (Testnet)', color:'#26a17b', letter:'T', price:1.00, balance:0, decimals:18, address:'0x903C7412e771eBb595Ae7B0108BA32a9A7a755d5' },
    KOPDES: { name:'Koperasi Desa', color:'#e67e22', letter:'🏠', price:0.10, balance:0, decimals:18, address:'0x21D274F95d9Cd7b859E66bFA970Ad52fb41F6533' }
};

const POOLS = {
    'USDC-DAI': '0x79989f44c13B8ed41a2bA68Cd0a584e158cD11E8',
    'MBG-USDT': '0xd54598e60712684EcEFA810E4cCA0c30C2F41B54',
    'KOPDES-USDC': '0xBAE8787b417AE7b56458A4FEB904c65cd8018F8a',
    'MBG-USDC': '0x17F9b1ea3f6ceC4e5605f7cEDfa90674e3D3Faaf'
};

// =====================================================================
// 4. ABI DEFINITIONS
// =====================================================================

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
];

const POOL_ABI = [
    'function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) returns (uint256 amountOut)',
    'function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256 amountOut)',
    'function reserveA() view returns (uint256)',
    'function reserveB() view returns (uint256)',
    'function tokenA() view returns (address)',
    'function tokenB() view returns (address)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function addLiquidity(uint256 amountA, uint256 amountB) returns (uint256 lpTokens)',
    'function removeLiquidity(uint256 lpTokens, uint256 minAmountA, uint256 minAmountB) returns (uint256 amountA, uint256 amountB)',
    'event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut)'
];

const FAUCET_ADDRESS = '0xe72f37B2AE5295A723C2c885cdf47D4a752A804E';
const FAUCET_ABI = [
    'function claim(address token)',
    'function timeUntilNextClaim(address token, address user) view returns (uint256)',
    'function CLAIM_AMOUNT() view returns (uint256)'
];

const REWARD_TOKEN_ADDRESS = '0x5072FE98CD78604d8750a935fa39039F06b6e800';

const STAKING_ABI = [
    'function stake(uint256 amount)',
    'function withdraw(uint256 amount)',
    'function getReward()',
    'function exit()',
    'function earned(address account) view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function rewardRate() view returns (uint256)',
    'function periodFinish() view returns (uint256)'
];

const STAKING_LIST = [
    { key:'USDC-DAI',    a:'USDC',   b:'DAI',  label:'USDC/DAI',    addr:'0x5810F270dd7643Caa60858b1f5CC4a250BA38C13' },
    { key:'KOPDES-USDC', a:'KOPDES', b:'USDC', label:'KOPDES/USDC', addr:'0xb7f9c24854c0B0d281913269026E719cc55157cb' },
    { key:'MBG-USDC',    a:'MBG',    b:'USDC', label:'MBG/USDC',    addr:'0x881aBE426863F1172d435ad3f6dbcE0c876eD2Ef' }
];

const POOL_LIST = [
    { key:'USDC-DAI',    a:'USDC',   b:'DAI',  label:'USDC / DAI' },
    { key:'KOPDES-USDC', a:'KOPDES', b:'USDC', label:'KOPDES / USDC' },
    { key:'MBG-USDC',    a:'MBG',    b:'USDC', label:'MBG / USDC' }
];
