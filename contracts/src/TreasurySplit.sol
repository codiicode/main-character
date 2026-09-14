// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasurySplit
 * @notice MAIN's fee sink. Every coin's splitter pushes the platform share here; `distribute()` forwards it to
 *         the configured recipients by weight (e.g. the buyback vault and the founder). Owner can re-weight at
 *         any time, which only affects money not yet distributed. Pushes that fail are held in `owed` and can be
 *         pulled with `withdraw()`.
 */
contract TreasurySplit is Ownable2Step, ReentrancyGuard {
    struct Recipient {
        address account;
        uint96 weight;
    }

    Recipient[] public recipients;
    uint256 public totalWeight;
    mapping(address => uint256) public owed;
    uint256 public totalDistributed;

    event RecipientsSet(address[] accounts, uint96[] weights);
    event Distributed(uint256 amount);
    event Paid(address indexed to, uint256 amount);
    event Deferred(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    error BadRecipients();
    error Nothing();

    constructor(address owner_, address[] memory accounts, uint96[] memory weights) Ownable(owner_) {
        _set(accounts, weights);
    }

    receive() external payable {}

    function setRecipients(address[] calldata accounts, uint96[] calldata weights) external onlyOwner {
        _set(accounts, weights);
    }

    function recipientCount() external view returns (uint256) {
        return recipients.length;
    }

    /// @notice ETH not yet earmarked for anyone.
    function pending() public view returns (uint256) {
        uint256 reserved;
        for (uint256 i = 0; i < recipients.length; ++i) reserved += owed[recipients[i].account];
        return address(this).balance - reserved;
    }

    /// @notice Permissionless. Forwards everything pending by weight; rounding dust stays for the next round.
    function distribute() external nonReentrant returns (uint256 amount) {
        amount = pending();
        if (amount == 0) revert Nothing();
        totalDistributed += amount;
        for (uint256 i = 0; i < recipients.length; ++i) {
            Recipient memory r = recipients[i];
            uint256 part = amount * r.weight / totalWeight;
            if (part == 0) continue;
            (bool ok,) = r.account.call{value: part, gas: 60_000}("");
            if (ok) emit Paid(r.account, part);
            else {
                owed[r.account] += part;
                emit Deferred(r.account, part);
            }
        }
        emit Distributed(amount);
    }

    function withdraw() external nonReentrant {
        uint256 a = owed[msg.sender];
        if (a == 0) revert Nothing();
        owed[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: a}("");
        require(ok, "withdraw failed");
        emit Withdrawn(msg.sender, a);
    }

    function _set(address[] memory accounts, uint96[] memory weights) internal {
        if (accounts.length == 0 || accounts.length != weights.length) revert BadRecipients();
        delete recipients;
        uint256 w;
        for (uint256 i = 0; i < accounts.length; ++i) {
            if (accounts[i] == address(0) || weights[i] == 0) revert BadRecipients();
            recipients.push(Recipient({account: accounts[i], weight: weights[i]}));
            w += weights[i];
        }
        totalWeight = w;
        emit RecipientsSet(accounts, weights);
    }
}
