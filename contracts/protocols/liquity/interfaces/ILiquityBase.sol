// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./IPriceFeed.sol";


interface ILiquityBase {
    function priceFeed() external view returns (IPriceFeed);
}
