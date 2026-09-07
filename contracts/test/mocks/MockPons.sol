// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPonsV2LaunchFactory, IPonsV2FeeEscrow} from "../../src/interfaces/IPons.sol";

contract MockEscrow is IPonsV2FeeEscrow {
    mapping(address => uint256) public balanceOf;

    function credit(address recipient) external payable {
        balanceOf[recipient] += msg.value;
    }

    function claim() external returns (uint256 amount) {
        amount = balanceOf[msg.sender];
        balanceOf[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "claim send failed");
    }
}

contract MockCurve {
    bool public graduated;
    uint256 public tokensPerWei = 1000;
    address public feeRecipient;
    MockEscrow public escrow;
    uint256 public accrued;
    address public lastBuyer;
    uint256 public lastBuyWei;
    MockToken public token;

    constructor(address feeRecipient_, MockEscrow escrow_, MockToken token_) {
        feeRecipient = feeRecipient_;
        escrow = escrow_;
        token = token_;
    }

    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut) {
        require(msg.value == quoteIn, "value");
        lastBuyer = recipient;
        lastBuyWei = quoteIn;
        accrued += quoteIn * 37 / 1000; // 3.7% to the creator side
        tokensOut = quoteIn * tokensPerWei;
        require(tokensOut >= minTokensOut, "slippage");
        token.mint(recipient, tokensOut);
    }

    function sweepFees(uint256) external {
        uint256 a = accrued;
        accrued = 0;
        escrow.credit{value: a}(feeRecipient);
    }
}

contract MockFactory {
    MockEscrow public immutable escrowContract;
    uint256 public launchFee = 0.0005 ether;
    mapping(address => IPonsV2LaunchFactory.LaunchedToken) internal launched;
    uint256 public count;
    IPonsV2LaunchFactory.TokenParams public lastParams;
    uint256 public lastValue;

    constructor() {
        escrowContract = new MockEscrow();
    }

    function feeEscrow() external view returns (IPonsV2FeeEscrow) {
        return escrowContract;
    }

    function canLaunch(address) external pure returns (bool) {
        return true;
    }

    function previewLaunchEconomics(uint256, address) external pure returns (bytes32) {
        return keccak256("econ");
    }

    function launchToken(IPonsV2LaunchFactory.TokenParams calldata params, uint256, address)
        external
        payable
        returns (address token, address curve)
    {
        require(msg.value == launchFee, "fee");
        lastParams = params;
        lastValue = msg.value;
        ++count;
        MockToken t = new MockToken();
        token = address(t);
        curve = address(new MockCurve(params.creatorFeeRecipient, escrowContract, t));
        IPonsV2LaunchFactory.LaunchedToken storage l = launched[token];
        l.token = token;
        l.curve = curve;
        l.deployer = msg.sender;
        l.creatorFeeRecipient = params.creatorFeeRecipient;
        l.creatorTaxBps = params.creatorTaxBps;
        l.exists = true;
    }

    address[] public lastExemptions;

    function launchToken(
        IPonsV2LaunchFactory.TokenParams calldata params,
        uint256 id,
        address pairToken,
        address[] calldata exemptions
    ) external payable returns (address token, address curve) {
        delete lastExemptions;
        for (uint256 i = 0; i < exemptions.length; ++i) lastExemptions.push(exemptions[i]);
        return this.launchToken{value: msg.value}(params, id, pairToken);
    }

    function getLaunchedToken(address token) external view returns (IPonsV2LaunchFactory.LaunchedToken memory) {
        return launched[token];
    }

    function transferCreatorFeeRecipient(address, address) external {}
}

/// A recipient that refuses ETH, to exercise the deferred-payout path.
contract Rejecter {
    receive() external payable {
        revert("no");
    }
}

contract MockToken {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
