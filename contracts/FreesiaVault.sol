// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract FreesiaVault is ERC4626, AccessControl, Pausable, ReentrancyGuard {
    using Math for uint256;

    bytes32 public constant AI_KEEPER_ROLE = keccak256("AI_KEEPER_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    uint16 public targetAllocationBps;
    uint256 public rebalanceRound;
    uint256 public lastRebalanceTime;
    uint16 public maxDeltaBpsPerTx;
    uint16 public rebalanceCooldown;
    uint256 public managementFeeBps;
    uint256 public performanceFeeBps;
    uint256 public lastManagementFeeClaim;
    uint256 public highWaterMark;
    uint256 public pendingFees;
    address public treasury;

    event Rebalanced(
        uint256 indexed round,
        uint16 targetAllocationBps,
        int256 volatilitySignal,
        string reason,
        uint256 timestamp
    );

    event FeesClaimed(uint256 amount);
    event ParamsUpdated(uint16 maxDeltaBpsPerTx, uint16 rebalanceCooldown, uint256 managementFeeBps, uint256 performanceFeeBps);

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address admin_,
        address keeper_,
        address treasury_
    ) ERC4626(asset_) ERC20(name_, symbol_) {
        require(admin_ != address(0), "FV: admin zero");
        require(keeper_ != address(0), "FV: keeper zero");
        require(treasury_ != address(0), "FV: treasury zero");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(AI_KEEPER_ROLE, keeper_);
        _grantRole(EMERGENCY_ADMIN_ROLE, admin_);
        _setRoleAdmin(AI_KEEPER_ROLE, DEFAULT_ADMIN_ROLE);

        treasury = treasury_;
        targetAllocationBps = 5000;
        maxDeltaBpsPerTx = 1500;
        rebalanceCooldown = 300;
        managementFeeBps = 50;
        performanceFeeBps = 1000;
        lastManagementFeeClaim = block.timestamp;
        highWaterMark = 10 ** decimals();
    }

    function totalAssets() public view override returns (uint256) {
        return super.totalAssets() - pendingFees;
    }

    function deposit(uint256 assets, address receiver)
        public override whenNotPaused nonReentrant returns (uint256)
    {
        _accrueManagementFee();
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver)
        public override whenNotPaused nonReentrant returns (uint256)
    {
        _accrueManagementFee();
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public override whenNotPaused nonReentrant returns (uint256)
    {
        _accrueManagementFee();
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public override whenNotPaused nonReentrant returns (uint256)
    {
        _accrueManagementFee();
        return super.redeem(shares, receiver, owner);
    }

    function rebalance(
        uint16 targetAllocationBps_,
        int256 volatilitySignal_,
        string calldata reason_
    ) external onlyRole(AI_KEEPER_ROLE) whenNotPaused {
        require(targetAllocationBps_ <= 10000, "FV: alloc > 100%");
        require(block.timestamp >= lastRebalanceTime + rebalanceCooldown, "FV: cooldown active");

        uint256 delta = targetAllocationBps_ > targetAllocationBps
            ? targetAllocationBps_ - targetAllocationBps
            : targetAllocationBps - targetAllocationBps_;
        require(delta <= maxDeltaBpsPerTx, "FV: delta exceeds max");

        targetAllocationBps = targetAllocationBps_;
        rebalanceRound++;
        lastRebalanceTime = block.timestamp;

        emit Rebalanced(rebalanceRound, targetAllocationBps_, volatilitySignal_, reason_, block.timestamp);
    }

    function _accrueManagementFee() internal {
        uint256 elapsed = block.timestamp - lastManagementFeeClaim;
        if (elapsed == 0 || managementFeeBps == 0) return;

        uint256 fee = (super.totalAssets() * managementFeeBps * elapsed) / (365 days * 10000);
        if (fee > 0) {
            pendingFees += fee;
            lastManagementFeeClaim = block.timestamp;
        }
    }

    function claimFees() external nonReentrant {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(AI_KEEPER_ROLE, msg.sender),
            "FV: unauthorized"
        );
        _accrueManagementFee();
        uint256 amount = pendingFees;
        require(amount > 0, "FV: no fees");
        pendingFees = 0;
        IERC20(asset()).safeTransfer(treasury, amount);
        emit FeesClaimed(amount);
    }

    function setParams(
        uint16 maxDeltaBpsPerTx_,
        uint16 rebalanceCooldown_,
        uint256 managementFeeBps_,
        uint256 performanceFeeBps_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(maxDeltaBpsPerTx_ <= 5000, "FV: maxDelta too high");
        require(rebalanceCooldown_ >= 60, "FV: cooldown too low");
        require(managementFeeBps_ <= 500, "FV: mgmt fee > 5%");
        require(performanceFeeBps_ <= 3000, "FV: perf fee > 30%");

        maxDeltaBpsPerTx = maxDeltaBpsPerTx_;
        rebalanceCooldown = rebalanceCooldown_;
        managementFeeBps = managementFeeBps_;
        performanceFeeBps = performanceFeeBps_;
        emit ParamsUpdated(maxDeltaBpsPerTx_, rebalanceCooldown_, managementFeeBps_, performanceFeeBps_);
    }

    function setTreasury(address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(treasury_ != address(0), "FV: zero treasury");
        treasury = treasury_;
    }

    function setKeeper(address keeper_, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(keeper_ != address(0), "FV: zero keeper");
        if (enabled) {
            _grantRole(AI_KEEPER_ROLE, keeper_);
        } else {
            _revokeRole(AI_KEEPER_ROLE, keeper_);
        }
    }

    function pause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(uint256 assets, address receiver, address owner)
        external whenPaused nonReentrant returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    function previewFees() external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastManagementFeeClaim;
        if (elapsed == 0 || managementFeeBps == 0) return pendingFees;
        uint256 fee = (super.totalAssets() * managementFeeBps * elapsed) / (365 days * 10000);
        return pendingFees + fee;
    }

    function vaultInfo() external view returns (
        uint256 totalAssets_,
        uint256 totalShares_,
        uint16 targetAlloc_,
        uint256 round_,
        uint256 lastRebalance_,
        uint256 pendingFees_,
        uint256 pricePerShare_
    ) {
        totalAssets_ = totalAssets();
        totalShares_ = totalSupply();
        targetAlloc_ = targetAllocationBps;
        round_ = rebalanceRound;
        lastRebalance_ = lastRebalanceTime;
        pendingFees_ = this.previewFees();
        pricePerShare_ = convertToAssets(10 ** decimals());
    }
}
