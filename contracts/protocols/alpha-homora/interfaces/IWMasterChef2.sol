/**
 *Submitted for verification at Etherscan.io on 2021-05-13
*/

// SPDX-License-Identifier: MIT

// Special Thanks to @BoringCrypto for his ideas and patience

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

// interface IMasterChef {
//     using BoringERC20 for IERC20;
//     struct UserInfo {
//         uint256 amount;     // How many LP tokens the user has provided.
//         uint256 rewardDebt; // Reward debt. See explanation below.
//     }

//     struct PoolInfo {
//         IERC20 lpToken;           // Address of LP token contract.
//         uint256 allocPoint;       // How many allocation points assigned to this pool. SUSHI to distribute per block.
//         uint256 lastRewardBlock;  // Last block number that SUSHI distribution occurs.
//         uint256 accSushiPerShare; // Accumulated SUSHI per share, times 1e12. See below.
//     }

//     function poolInfo(uint256 pid) external view returns (IMasterChef.PoolInfo memory);
//     function totalAllocPoint() external view returns (uint256);
//     function deposit(uint256 _pid, uint256 _amount) external;
// }

/// @notice The (older) MasterChef contract gives out a constant number of SUSHI tokens per block.
/// It is the only address with minting rights for SUSHI.
/// The idea for this MasterChef V2 (MCV2) contract is therefore to be the owner of a dummy token
/// that is deposited into the MasterChef V1 (MCV1) contract.
/// The allocation point for this pool on MCV1 is the total allocation point for all pools that receive double incentives.
abstract contract IWMasterChef2 {

    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    /// @notice Info of each MCV2 user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of SUSHI entitled to the user.
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    /// @notice Withdraw LP tokens from MCV2.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(uint256 pid, uint256 amount, address to) virtual public ;
    // {
    //     PoolInfo memory pool = updatePool(pid);
    //     UserInfo storage user = userInfo[pid][msg.sender];

    //     // Effects
    //     user.rewardDebt = user.rewardDebt.sub(int256(amount.mul(pool.accSushiPerShare) / ACC_SUSHI_PRECISION));
    //     user.amount = user.amount.sub(amount);

    //     // Interactions
    //     IRewarder _rewarder = rewarder[pid];
    //     if (address(_rewarder) != address(0)) {
    //         _rewarder.onSushiReward(pid, msg.sender, to, 0, user.amount);
    //     }
        
    //     lpToken[pid].safeTransfer(to, amount);

    //     emit Withdraw(msg.sender, pid, amount, to);
    // }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of SUSHI rewards.
    function harvest(uint256 pid, address to) virtual public ;
    // {
    //     PoolInfo memory pool = updatePool(pid);
    //     UserInfo storage user = userInfo[pid][msg.sender];
    //     int256 accumulatedSushi = int256(user.amount.mul(pool.accSushiPerShare) / ACC_SUSHI_PRECISION);
    //     uint256 _pendingSushi = accumulatedSushi.sub(user.rewardDebt).toUInt256();

    //     // Effects
    //     user.rewardDebt = accumulatedSushi;

    //     // Interactions
    //     if (_pendingSushi != 0) {
    //         SUSHI.safeTransfer(to, _pendingSushi);
    //     }
        
    //     IRewarder _rewarder = rewarder[pid];
    //     if (address(_rewarder) != address(0)) {
    //         _rewarder.onSushiReward( pid, msg.sender, to, _pendingSushi, user.amount);
    //     }

    //     emit Harvest(msg.sender, pid, _pendingSushi);
    // }
    
    /// @notice Withdraw LP tokens from MCV2 and harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens and SUSHI rewards.
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) virtual public; 
    // {
    //     PoolInfo memory pool = updatePool(pid);
    //     UserInfo storage user = userInfo[pid][msg.sender];
    //     int256 accumulatedSushi = int256(user.amount.mul(pool.accSushiPerShare) / ACC_SUSHI_PRECISION);
    //     uint256 _pendingSushi = accumulatedSushi.sub(user.rewardDebt).toUInt256();

    //     // Effects
    //     user.rewardDebt = accumulatedSushi.sub(int256(amount.mul(pool.accSushiPerShare) / ACC_SUSHI_PRECISION));
    //     user.amount = user.amount.sub(amount);
        
    //     // Interactions
    //     SUSHI.safeTransfer(to, _pendingSushi);

    //     IRewarder _rewarder = rewarder[pid];
    //     if (address(_rewarder) != address(0)) {
    //         _rewarder.onSushiReward(pid, msg.sender, to, _pendingSushi, user.amount);
    //     }

    //     lpToken[pid].safeTransfer(to, amount);

    //     emit Withdraw(msg.sender, pid, amount, to);
    //     emit Harvest(msg.sender, pid, _pendingSushi);
    // }

    function getUnderlyingToken(uint id) external view virtual returns (address);

    function getUnderlyingRate(uint id) external view virtual returns (uint);

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of the LP tokens.
    function emergencyWithdraw(uint256 pid, address to) virtual public ;
    // {
    //     UserInfo storage user = userInfo[pid][msg.sender];
    //     uint256 amount = user.amount;
    //     user.amount = 0;
    //     user.rewardDebt = 0;

    //     IRewarder _rewarder = rewarder[pid];
    //     if (address(_rewarder) != address(0)) {
    //         _rewarder.onSushiReward(pid, msg.sender, to, 0, 0);
    //     }

    //     // Note: transfer can fail or succeed if `amount` is zero.
    //     lpToken[pid].safeTransfer(to, amount);
    //     emit EmergencyWithdraw(msg.sender, pid, amount, to);
    // }
}