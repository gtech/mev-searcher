//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "../libraries/SafeMath.sol";
import "../interfaces/liquity/ITroveManager.sol";
import "../interfaces/IERC20.sol";

pragma experimental ABIEncoderV2;


// This contract simply calls multiple targets sequentially, ensuring WETH balance before and after
contract LiquityLiquidator {
    using SafeMath for uint256;

    address private immutable owner;
    address payable private immutable executor;
    ITroveManager private constant TROVE_MANAGER = ITroveManager(0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2);

    constructor(address payable _executor) public payable {
        owner = msg.sender;
        executor = _executor;
    }

    modifier onlyExecutor() {
        require(msg.sender == executor, "not executor");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    receive() external payable {
    }

    function destroy() external onlyExecutor {
        selfdestruct(executor);
    }

    function withdrawErc20(IERC20 token) external onlyExecutor {
        require(token.transfer(msg.sender, token.balanceOf(address(this))), "Transfer failed");
    }

    function withdraw() external {
        executor.transfer(address(this).balance);
    }

    function liquidateTroves(uint minerPercentage, uint numberOfTroves) external onlyExecutor returns (uint balanceGained) {
        TROVE_MANAGER.liquidateTroves(numberOfTroves);

        uint _balanceGained = address(this).balance;
        uint minerReward;

        if (minerPercentage != 0) {
            minerReward = SafeMath.div(SafeMath.mul(_balanceGained,
                minerPercentage)
            , 100);
            block.coinbase.transfer(minerReward);
        }
        executor.transfer(SafeMath.sub(_balanceGained, minerReward));
        return _balanceGained;
    }

    function call(address payable _to, uint256 _value, bytes calldata _data) external onlyExecutor payable returns (bytes memory) {
        require(_to != address(0));
        (bool _success, bytes memory _result) = _to.call{value : _value}(_data);
        require(_success);
        return _result;
    }
}
