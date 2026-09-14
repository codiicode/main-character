// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsV2LaunchFactory, IPonsV2BondingCurve} from "./interfaces/IPons.sol";

interface IBurnable {
    function burn(uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
}

/// @notice Post-graduation route: swaps the ETH sent for MAIN and returns it to msg.sender.
interface IBuybackRouter {
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut);
}

/**
 * @title BuybackVault
 * @notice Collects the buyback share of every fee and turns it into burned $MAIN. `buyAndBurn` is permissionless:
 *         while $MAIN trades on its Pons bonding curve it buys straight from the curve; once graduated, through
 *         an owner-set router (Uniswap V4). Until the token is set, ETH simply accumulates.
 */
contract BuybackVault is Ownable2Step, ReentrancyGuard {
    IPonsV2LaunchFactory public immutable pons;
    address public token; // $MAIN, set once
    IBuybackRouter public router; // for the graduated pool, optional until then
    uint256 public minBuy = 0.005 ether; // don't bother below this

    uint256 public totalSpent;
    uint256 public totalBurned;

    event TokenSet(address token);
    event RouterSet(address router);
    event MinBuySet(uint256 minBuy);
    event BoughtAndBurned(uint256 ethSpent, uint256 tokensBurned, bool viaCurve);

    error AlreadySet();
    error NoToken();
    error BelowMin();
    error NeedsRouter();
    error ZeroAddress();

    constructor(address owner_, IPonsV2LaunchFactory pons_) Ownable(owner_) {
        pons = pons_;
    }

    receive() external payable {}

    function setToken(address token_) external onlyOwner {
        if (token != address(0)) revert AlreadySet();
        if (token_ == address(0)) revert ZeroAddress();
        token = token_;
        emit TokenSet(token_);
    }

    function setRouter(IBuybackRouter router_) external onlyOwner {
        router = router_;
        emit RouterSet(address(router_));
    }

    function setMinBuy(uint256 v) external onlyOwner {
        minBuy = v;
        emit MinBuySet(v);
    }

    /// @notice True when a buy would go through right now.
    function ready() external view returns (bool) {
        if (token == address(0) || address(this).balance < minBuy) return false;
        IPonsV2LaunchFactory.LaunchedToken memory l = pons.getLaunchedToken(token);
        return l.phase == IPonsV2LaunchFactory.GraduationPhase.NotGraduated || address(router) != address(0);
    }

    /// @notice Spend the whole balance on $MAIN and burn it. Anyone may call; `minTokensOut` guards slippage.
    function buyAndBurn(uint256 minTokensOut) external nonReentrant returns (uint256 spent, uint256 burned) {
        if (token == address(0)) revert NoToken();
        spent = address(this).balance;
        if (spent < minBuy) revert BelowMin();

        IPonsV2LaunchFactory.LaunchedToken memory l = pons.getLaunchedToken(token);
        bool viaCurve = l.phase == IPonsV2LaunchFactory.GraduationPhase.NotGraduated;
        if (viaCurve) {
            burned = IPonsV2BondingCurve(l.curve).buy{value: spent}(spent, minTokensOut, address(this));
        } else {
            if (address(router) == address(0)) revert NeedsRouter();
            burned = router.buy{value: spent}(minTokensOut);
        }
        // Burn whatever we hold, in case a previous round left dust.
        uint256 bal = IBurnable(token).balanceOf(address(this));
        IBurnable(token).burn(bal);
        burned = bal;
        totalSpent += spent;
        totalBurned += burned;
        emit BoughtAndBurned(spent, burned, viaCurve);
    }
}
