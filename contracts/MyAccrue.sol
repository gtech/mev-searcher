// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

// contract MyAccrue{

//     function accrueAll(address[] memory tokens) external {
//     for (uint idx = 0; idx < tokens.length; idx++) {
//       accrue(tokens[idx]);
//     }
//   }

//     function accrue(address token) public override {
//         Bank storage bank = banks[token];
//         require(bank.isListed, 'bank not exist');
//         uint totalDebt = bank.totalDebt;
//         uint debt = ICErc20(bank.cToken).borrowBalanceCurrent(address(this));
//         uint fee = debt.sub(totalDebt).mul(feeBps).div(10000);
//         bank.totalDebt = debt;
//         bank.reserve = bank.reserve.add(doBorrow(token, fee));
//   }

//     /// @dev Internal function to perform borrow from the bank and return the amount received.
//   /// @param token The token to perform borrow action.
//   /// @param amountCall The amount use in the transferFrom call.
//   /// NOTE: Caller must ensure that cToken interest was already accrued up to this block.
//   function doBorrow(address token, uint amountCall) internal returns (uint) {
//     Bank storage bank = banks[token]; // assume the input is already sanity checked.
//     uint balanceBefore = IERC20(token).balanceOf(address(this));
//     require(ICErc20(bank.cToken).borrow(amountCall) == 0, 'bad borrow');
//     uint balanceAfter = IERC20(token).balanceOf(address(this));
//     bank.totalDebt = bank.totalDebt.add(amountCall);
//     return balanceAfter.sub(balanceBefore);
//   }

  
// }