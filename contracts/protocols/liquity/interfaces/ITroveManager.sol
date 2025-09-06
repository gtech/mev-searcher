// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "./ILiquityBase.sol";
import "./IStabilityPool.sol";
import "./ILUSDToken.sol";
import "./ILQTYToken.sol";
import "./ILQTYStaking.sol";


// Common interface for the Trove Manager.
abstract contract ITroveManager is ILiquityBase {

    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

     struct Trove {
        uint debt;
        uint coll;
        uint stake;
        Status status;
        uint128 arrayIndex;
    }

    mapping (address => Trove) public Troves;
    
    // --- Events ---

    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event LUSDTokenAddressChanged(address _newLUSDTokenAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event LQTYTokenAddressChanged(address _lqtyTokenAddress);
    event LQTYStakingAddressChanged(address _lqtyStakingAddress);

    event Liquidation(uint _liquidatedDebt, uint _liquidatedColl, uint _collGasCompensation, uint _LUSDGasCompensation);
    event Redemption(uint _attemptedLUSDAmount, uint _actualLUSDAmount, uint _ETHSent, uint _ETHFee);
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, uint8 operation);
    event TroveLiquidated(address indexed _borrower, uint _debt, uint _coll, uint8 operation);
    event BaseRateUpdated(uint _baseRate);
    event LastFeeOpTimeUpdated(uint _lastFeeOpTime);
    event TotalStakesUpdated(uint _newTotalStakes);
    event SystemSnapshotsUpdated(uint _totalStakesSnapshot, uint _totalCollateralSnapshot);
    event LTermsUpdated(uint _L_ETH, uint _L_LUSDDebt);
    event TroveSnapshotsUpdated(uint _L_ETH, uint _L_LUSDDebt);
    event TroveIndexUpdated(address _borrower, uint _newIndex);

    // --- Functions ---

    function setAddresses(
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _lusdTokenAddress,
        address _sortedTrovesAddress,
        address _lqtyTokenAddress,
        address _lqtyStakingAddress
    ) external virtual;

    function stabilityPool() external virtual view returns (IStabilityPool);
    function lusdToken() external virtual view returns (ILUSDToken);
    function lqtyToken() external virtual view returns (ILQTYToken);
    function lqtyStaking() external virtual view returns (ILQTYStaking);

    function getTroveOwnersCount() external virtual view returns (uint);

    function getTroveFromTroveOwnersArray(uint _index) external virtual view returns (address);

    function getNominalICR(address _borrower) external virtual view returns (uint);
    function getCurrentICR(address _borrower, uint _price) external virtual view returns (uint);

    function liquidate(address _borrower) external virtual;

    function liquidateTroves(uint _n) external virtual;

    function batchLiquidateTroves(address[] calldata _troveArray) external virtual;

    function redeemCollateral(
        uint _LUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations,
        uint _maxFee
    ) external virtual; 

    function updateStakeAndTotalStakes(address _borrower) external virtual returns (uint);

    function updateTroveRewardSnapshots(address _borrower) external virtual;

    function addTroveOwnerToArray(address _borrower) external virtual returns (uint index);

    function applyPendingRewards(address _borrower) external virtual;

    function getPendingETHReward(address _borrower) external virtual view returns (uint);

    function getPendingLUSDDebtReward(address _borrower) external virtual view returns (uint);

     function hasPendingRewards(address _borrower) external virtual view returns (bool);

    function getEntireDebtAndColl(address _borrower) external virtual view returns (
        uint debt, 
        uint coll, 
        uint pendingLUSDDebtReward, 
        uint pendingETHReward
    );

    function closeTrove(address _borrower) external virtual;

    function removeStake(address _borrower) external virtual;

    function getRedemptionRate() external virtual view returns (uint);
    function getRedemptionRateWithDecay() external virtual view returns (uint);

    function getRedemptionFeeWithDecay(uint _ETHDrawn) external virtual view returns (uint);

    function getBorrowingRate() external virtual view returns (uint);
    function getBorrowingRateWithDecay() external virtual view returns (uint);

    function getBorrowingFee(uint LUSDDebt) external virtual view returns (uint);
    function getBorrowingFeeWithDecay(uint _LUSDDebt) external virtual view returns (uint);

    function decayBaseRateFromBorrowing() external virtual;

    function getTroveStatus(address _borrower) external virtual view returns (uint);
    
    function getTroveStake(address _borrower) external virtual view returns (uint);

    function getTroveDebt(address _borrower) external virtual view returns (uint);

    function getTroveColl(address _borrower) external virtual view returns (uint);

    function setTroveStatus(address _borrower, uint num) external virtual;

    function increaseTroveColl(address _borrower, uint _collIncrease) external virtual returns (uint);

    function decreaseTroveColl(address _borrower, uint _collDecrease) external virtual returns (uint); 

    function increaseTroveDebt(address _borrower, uint _debtIncrease) external virtual returns (uint); 

    function decreaseTroveDebt(address _borrower, uint _collDecrease) external virtual returns (uint); 

    function getTCR(uint _price) external virtual view returns (uint);

    function checkRecoveryMode(uint _price) external virtual view returns (bool);
}
