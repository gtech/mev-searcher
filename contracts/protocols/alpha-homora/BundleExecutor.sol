//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "hardhat/console.sol";
// import "./IWMasterChef2.sol";
import "./interfaces/IWMasterChef.sol";
import "./interfaces/IBank.sol";
// import './IUniswapV2Router01.sol';
import "./interfaces/IUniswapV2Router02.sol";
import { FlashLoanReceiverBase } from "./contracts/FlashLoanReceiverBase.sol";
import {ILendingPoolAddressesProvider} from "./interfaces/ILendingPoolAddressesProvider.sol";
import { ILendingPool} from "./interfaces/ILendingPool.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

pragma experimental ABIEncoderV2;

// interface IERC20 {
//     event Approval(address indexed owner, address indexed spender, uint value);
//     event Transfer(address indexed from, address indexed to, uint value);

//     function name() external view returns (string memory);
//     function symbol() external view returns (string memory);
//     function decimals() external view returns (uint8);
//     function totalSupply() external view returns (uint);
//     function balanceOf(address owner) external view returns (uint);
//     function allowance(address owner, address spender) external view returns (uint);

//     function approve(address spender, uint value) external returns (bool);
//     function transfer(address to, uint value) external returns (bool);
//     function transferFrom(address from, address to, uint value) external returns (bool);
// }

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint) external;
    // function override balanceOf(address owner) external view returns (uint);
}

// This contract simply calls multiple targets sequentially, ensuring WETH balance before and after

contract FlashBotsMultiCall  is FlashLoanReceiverBase, ERC1155Holder  {
    using SafeMath for uint256;

    address private immutable owner;
    address payable private immutable executor;
    IWETH private constant WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); //Mainnet
    IBank private constant BANK = IBank(0xba5eBAf3fc1Fcca67147050Bf80462393814E54B);
    uint private minerPercent = 5;
    IWMasterChef private constant WMASTERCHEF = IWMasterChef(0xA2caEa05fF7B98f10Ad5ddc837F15905f33FEb60);
    // IWMasterChef private constant WERC20_UNI = IWMasterChef(0x06799a1e4792001AA9114F0012b9650cA28059a3);
    IUniswapV2Router02 private constant UNISWAPROUTER = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    //TODO This is redundant and costly.
    address private constant SUSHISWAP_ROUTER_ADDRESS = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    IUniswapV2Router02 private constant SUSHI_ROUTER = IUniswapV2Router02(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);

    constructor(ILendingPoolAddressesProvider _addressProvider, address payable _executor) FlashLoanReceiverBase(_addressProvider) public payable {
        owner = msg.sender;
        executor = _executor;
        if (msg.value > 0) {
            WETH.deposit{value: msg.value}();
        }
    }

    //IWETH private constant WETH = IWETH(0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6); //Goerli

    // (uint flashInfo.positionID, uint flashInfo.masterChefID, uint flashInfo.LPBounty, address flashInfo.LPtokenAddress, uint flashInfo.otherTokenOutLP, uint flashInfo.debtTokenOutLP, uint flashInfo.amountInSwap, uint flashInfo.amountOutSwap, uint flashInfo.deadline, address flashInfo.secondTokenAddress)
    struct FlashInfo{
        uint positionID;
        uint masterChefID;
        uint LPBounty;
        address LPtokenAddress;
        uint[] lpAmountsOut;
        uint amountInSwap;
        uint amountOutSwap;
        uint deadline;
        address secondTokenAddress;
        address thirdTokenAddress;
    }


    modifier onlyExecutor() {
        require(msg.sender == executor);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }



    receive() external payable {
    }

    function setMinerPercentage(uint percentage) onlyOwner external{
        minerPercent = percentage;
    }


    //params: LP token address, whether or not it's ether that I'm borrowing, positionId
    function flashLiquidate(address debtToken, uint256 borrowAmount, bytes calldata params) external {
        require(msg.sender == owner, "not owner");

        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = debtToken;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = borrowAmount;

        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        // address onBehalfOf = address(this);
        bytes memory data = params;
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            receiverAddress,
            data,
            referralCode
        );
    }

    // this function is called after your contract has received the flash loaned amount
    //(address underlying, uint amount, uint fee, bytes calldata params) external {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    )
    external
    override
    returns (bool)
    {
        uint amount = amounts[0];
        address underlying = assets[0];

        // {
        //     uint currentBalance = IERC20(underlying).balanceOf(initiator);
        //     require(currentBalance >= amount, "Invalid balance, was the flashLoan successful?");
        // }


        FlashInfo memory flashInfo;
        {
            (uint positionID, uint masterChefID, uint LPBounty, address LPtokenAddress, uint[] memory lpAmountsOut, uint amountInSwap, uint amountOutSwap, uint deadline, address secondTokenAddress, address thirdTokenAddress) = abi.decode(params, (uint,uint,uint,address,uint[],uint,uint,uint,address,address));

            flashInfo.positionID = positionID;
            flashInfo.masterChefID = masterChefID;
            flashInfo.LPBounty = LPBounty;
            flashInfo.LPtokenAddress = LPtokenAddress;
            flashInfo.lpAmountsOut = lpAmountsOut;
            flashInfo.amountInSwap = amountInSwap;
            flashInfo.amountOutSwap = amountOutSwap;
            flashInfo.deadline = deadline;
            flashInfo.secondTokenAddress = secondTokenAddress;
            flashInfo.thirdTokenAddress = thirdTokenAddress;
        }

        require(IERC20(underlying).approve(address(BANK), amount), 'approval of homorabank to spend my loan failed.');

        //TODO this might need to be changed to setApprovalToAll https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155-setApprovalForAll-address-bool-
        //TODO I think here we need to test between the different LPtokens: uni, sushi, or crv, then there will be three different functions from there. I think we'll have to figure it out in the bot and send the information up.
        IERC20 lp = IERC20(flashInfo.LPtokenAddress);
        require(lp.approve(SUSHISWAP_ROUTER_ADDRESS, flashInfo.LPBounty), 'approve failed.');

        //DEBUG
        // {
        //     uint a = IERC20(underlying).balanceOf(initiator);
        //     console.log("My balance of debtToken before liquidation: ");
        //     console.logUint(a);
        //     (uint256 LPbalance) = WMASTERCHEF.balanceOf(initiator, flashInfo.masterChefID);
        //     console.log("LPbalance: ");
        //     console.logUint(LPbalance);
        // }

        // console.logUint();
        BANK.liquidate(flashInfo.positionID, underlying ,amount);

        //DEBUG
        // {
        //     console.log("Successfully Liquidated");
        //     uint a = IERC20(underlying).balanceOf(initiator);
        //     console.log("My balance of debtToken after liquidation: ");
        //     console.logUint(a);
        //     console.log("Theoretical LPBounty: ");
        //     console.logUint(flashInfo.LPBounty);
        //     (uint256 LPbalance) = WMASTERCHEF.balanceOf(initiator, flashInfo.masterChefID);
        //     console.log("LPbalance after liquidation: ");
        //     console.logUint(LPbalance);
        //     uint256 actualLPBalance = lp.balanceOf(initiator);
        //     console.log("actualLPBalance of the token outside of masterchef before burn: ");
        //     console.logUint(actualLPBalance);
        // }

        //TODO Okay it looks like this burn function is slightly different for uni or sushi. For sushi it's a uint and for uni it's an address. We also need a different address lower down here. So there's a major split in functionality here.
        WMASTERCHEF.burn(flashInfo.masterChefID,flashInfo.LPBounty);

        //DEBUG
        // {
        //     console.log("Grabbed the LPbounty from Masterchef");
        //     uint256 actualLPBalance = lp.balanceOf(initiator);
        //     console.log("actualLPBalance of the token outside of masterchef after burn: ");
        //     console.logUint(actualLPBalance);
        // }

        uint deadline = block.timestamp.add(500);
        SUSHI_ROUTER.removeLiquidity(
            underlying,
            flashInfo.secondTokenAddress,
            flashInfo.LPBounty,
            flashInfo.lpAmountsOut[0],//debtTokenOutLP
            flashInfo.lpAmountsOut[1],//otherTokenOutLP,
            initiator,
            deadline
        );

        //DEBUG
        // {
        //     console.log("Balance of WETH before all of the swaps: ");
        //     uint WETHbalance = WETH.balanceOf(initiator);
        //     // uint WETHbalance = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2).balanceOf(initiator);
        //     console.logUint(WETHbalance);
        // }

        require(IERC20(flashInfo.secondTokenAddress).approve(address(UNISWAPROUTER), flashInfo.amountInSwap), 'approve failed.');

        {
            address[] memory path = new address[](2);
            path[0] = flashInfo.secondTokenAddress;
            path[1] = underlying;
            //TODO This may need to change because forETH variants may be more efficient
            UNISWAPROUTER.swapExactTokensForTokens(flashInfo.amountInSwap, flashInfo.amountOutSwap, path, initiator, block.timestamp);
        }

        //DEBUG
        // {
        //     console.log("Balance of WETH after all of the swaps: ");
        //     uint WETHbalance = WETH.balanceOf(initiator);
        //     console.logUint(WETHbalance);
        // }

        // Approve the LendingPool contract allowance to *pull* the owed amount.
        uint amountOwing = amounts[0].add(premiums[0]);
        IERC20(underlying).approve(address(LENDING_POOL), amountOwing);
        WETH.withdraw(WETH.balanceOf(initiator).sub(amountOwing));

        //DEBUG
        // {
        //     console.log("Balance totals before transfer: ");
        //     console.log("ETH: ");
        //     console.logUint(address(this).balance);
        //     console.log("WETH: ");
        //     console.logUint(WETH.balanceOf(address(this)));
        //     uint under = IERC20(underlying).balanceOf(address(this));
        //     console.log("under: ");
        //     console.logUint(under);
        //     uint other = IERC20(flashInfo.secondTokenAddress).balanceOf(address(this));
        //     console.log("other: ");
        //     console.logUint(other);
        //     console.log("owed: ");
        //     console.logUint(amountOwing);
        // }

        //TODO Test this. We can use WAAAAAY less. Probably anyway.
        // if (this.minerPercent != 0){
        //     block.coinbase.transfer(
        //     div(
        //         mul(address(this.balance),this.minerPercent)
        //     ,100)
        //     );
        // }
        executor.transfer(address(this).balance);
        return true;
    }

    function uniswapWeth(uint256 _wethAmountToFirstMarket, uint256 _ethAmountToCoinbase, address[] memory _targets, bytes[] memory _payloads) external onlyExecutor payable {
        require (_targets.length == _payloads.length);
        uint256 _wethBalanceBefore = WETH.balanceOf(address(this));
        WETH.transfer(_targets[0], _wethAmountToFirstMarket);
        for (uint256 i = 0; i < _targets.length; i++) {
            (bool _success, bytes memory _response) = _targets[i].call(_payloads[i]);
            require(_success); _response;
        }

        uint256 _wethBalanceAfter = WETH.balanceOf(address(this));
        require(_wethBalanceAfter > _wethBalanceBefore + _ethAmountToCoinbase);
        if (_ethAmountToCoinbase == 0) return;

        uint256 _ethBalance = address(this).balance;
        if (_ethBalance < _ethAmountToCoinbase) {
            WETH.withdraw(_ethAmountToCoinbase - _ethBalance);
        }
        block.coinbase.transfer(_ethAmountToCoinbase);
    }

    function call(address payable _to, uint256 _value, bytes calldata _data) external onlyOwner payable returns (bytes memory) {
        require(_to != address(0));
        (bool _success, bytes memory _result) = _to.call{value: _value}(_data);
        require(_success);
        return _result;
    }
}
