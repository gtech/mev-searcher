// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITellorCaller {
    function getTellorCurrentValue(uint256 _requestId) external view returns (bool, uint256, uint256);
}