// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsV2FeeEscrow, IPonsV2BondingCurve} from "./interfaces/IPons.sol";

/**
 * @title MainSplitter
 * @notice One clone per MAIN coin. It is the coin's creatorFeeRecipient on Pons, so every creator
 *         fee and creator-tax payout lands in its escrow balance. `distribute()` claims that ETH and
 *         splits it between the KOL side (one trader, or a clan of traders), the launcher and MAIN.
 *
 *         Shares are in basis points of the intake:
 *           launcherBps            fixed for the life of the coin
 *           kolBps / endorsedKolBps the KOL-side pool, doubled once the KOL endorses
 *           remainder              MAIN treasury
 *
 *         KOL-side recipients whose wallet is not known yet are stored as address(0); their share
 *         accrues in `pending` until the launcher contract sets the address.
 */
contract MainSplitter is Initializable, ReentrancyGuard {
    struct Recipient {
        address account; // address(0) = wallet not resolved yet
        uint96 weight; // relative weight inside the KOL pool
    }

    uint256 public constant BPS = 10_000;

    address public launcherContract; // MainLauncher, the only admin
    address public token;
    address public launcher; // the wallet that launched the coin
    address public treasury;
    IPonsV2FeeEscrow public escrow;

    uint16 public kolBps;
    uint16 public endorsedKolBps;
    uint16 public launcherBps;
    bool public endorsed;

    Recipient[] public kolRecipients;
    uint256 public totalKolWeight;

    /// ETH owed to a recipient that could not be pushed (or whose wallet is unknown), claimable any time.
    mapping(address => uint256) public owed;
    /// ETH accrued for KOL recipients that still have address(0), by recipient index.
    mapping(uint256 => uint256) public pending;

    uint256 public totalDistributed;
    uint256 public totalToKol;

    event Distributed(uint256 intake, uint256 toKol, uint256 toLauncher, uint256 toTreasury);
    event Paid(address indexed to, uint256 amount);
    event Deferred(address indexed to, uint256 amount);
    event PendingAccrued(uint256 indexed index, uint256 amount);
    event EndorsedSet(bool endorsed);
    event KolRecipientSet(uint256 indexed index, address account);
    event Withdrawn(address indexed to, uint256 amount);

    error NotLauncherContract();
    error BadShares();
    error BadRecipients();
    error NothingToDistribute();
    error ZeroAddress();

    modifier onlyLauncherContract() {
        if (msg.sender != launcherContract) revert NotLauncherContract();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address launcherContract_,
        address launcher_,
        address treasury_,
        IPonsV2FeeEscrow escrow_,
        uint16 kolBps_,
        uint16 endorsedKolBps_,
        uint16 launcherBps_,
        address[] calldata kolAccounts,
        uint96[] calldata kolWeights
    ) external initializer {
        if (launcherContract_ == address(0) || launcher_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (uint256(endorsedKolBps_) + launcherBps_ > BPS || kolBps_ > endorsedKolBps_) revert BadShares();
        if (kolAccounts.length == 0 || kolAccounts.length != kolWeights.length) revert BadRecipients();

        launcherContract = launcherContract_;
        launcher = launcher_;
        treasury = treasury_;
        escrow = escrow_;
        kolBps = kolBps_;
        endorsedKolBps = endorsedKolBps_;
        launcherBps = launcherBps_;

        uint256 weight;
        for (uint256 i = 0; i < kolAccounts.length; ++i) {
            if (kolWeights[i] == 0) revert BadRecipients();
            kolRecipients.push(Recipient({account: kolAccounts[i], weight: kolWeights[i]}));
            weight += kolWeights[i];
        }
        totalKolWeight = weight;
    }

    /// @dev Called once by the launcher contract right after the Pons launch.
    function setToken(address token_) external onlyLauncherContract {
        if (token != address(0)) revert BadRecipients();
        token = token_;
    }

    receive() external payable {}

    // ------------------------------------------------------------------ admin (via MainLauncher)

    function setEndorsed(bool value) external onlyLauncherContract {
        endorsed = value;
        emit EndorsedSet(value);
    }

    /// @notice Sets a KOL recipient's wallet once resolved and releases what accrued for them.
    function setKolRecipient(uint256 index, address account) external onlyLauncherContract nonReentrant {
        if (account == address(0)) revert ZeroAddress();
        kolRecipients[index].account = account;
        emit KolRecipientSet(index, account);
        uint256 amount = pending[index];
        if (amount > 0) {
            pending[index] = 0;
            _pay(account, amount);
        }
    }

    /// @notice Pons lets the creator fee recipient sweep its own curve. This contract is that recipient.
    function sweep(address curve) external onlyLauncherContract {
        IPonsV2BondingCurve(curve).sweepFees(0);
    }

    // ------------------------------------------------------------------ distribution

    function kolRecipientCount() external view returns (uint256) {
        return kolRecipients.length;
    }

    /// @notice ETH waiting in Pons escrow plus whatever already sits in this contract.
    function claimable() external view returns (uint256) {
        return escrow.balanceOf(address(this)) + _undistributedBalance();
    }

    /// @notice Permissionless. Claims from Pons escrow and pays everyone their share.
    function distribute() external nonReentrant returns (uint256 intake) {
        if (escrow.balanceOf(address(this)) > 0) escrow.claim();
        intake = _undistributedBalance();
        if (intake == 0) revert NothingToDistribute();

        uint256 kolShare = intake * (endorsed ? endorsedKolBps : kolBps) / BPS;
        uint256 launcherShare = intake * launcherBps / BPS;
        uint256 treasuryShare = intake - kolShare - launcherShare;

        totalDistributed += intake;
        totalToKol += kolShare;

        // KOL pool, weighted; dust from rounding goes to the treasury.
        uint256 paidKol;
        uint256 n = kolRecipients.length;
        for (uint256 i = 0; i < n; ++i) {
            Recipient memory r = kolRecipients[i];
            uint256 amount = kolShare * r.weight / totalKolWeight;
            paidKol += amount;
            if (r.account == address(0)) {
                pending[i] += amount;
                emit PendingAccrued(i, amount);
            } else {
                _pay(r.account, amount);
            }
        }
        treasuryShare += kolShare - paidKol;

        _pay(launcher, launcherShare);
        _pay(treasury, treasuryShare);
        emit Distributed(intake, kolShare, launcherShare, treasuryShare);
    }

    /// @notice Pulls anything that could not be pushed to `msg.sender`.
    function withdraw() external nonReentrant {
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert NothingToDistribute();
        owed[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ------------------------------------------------------------------ internals

    /// @dev Balance minus everything already earmarked for someone (deferred payouts and pending KOL shares).
    function _undistributedBalance() internal view returns (uint256) {
        return address(this).balance - _reserved();
    }

    function _reserved() internal view returns (uint256 total) {
        uint256 n = kolRecipients.length;
        for (uint256 i = 0; i < n; ++i) {
            total += pending[i];
            address a = kolRecipients[i].account;
            if (a != address(0)) total += owed[a];
        }
        total += owed[launcher] + owed[treasury];
    }

    function _pay(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount, gas: 50_000}("");
        if (ok) {
            emit Paid(to, amount);
        } else {
            owed[to] += amount;
            emit Deferred(to, amount);
        }
    }
}
