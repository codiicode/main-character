// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsV2LaunchFactory, IPonsV2FeeEscrow, IPonsV2BondingCurve, IERC20Minimal} from "./interfaces/IPons.sol";
import {MainSplitter} from "./MainSplitter.sol";

/**
 * @title MainLauncher
 * @notice Entry point for MAIN. One transaction from the launcher's wallet:
 *           1. clone a MainSplitter for the coin,
 *           2. launch on Pons V2 with the splitter as creatorFeeRecipient and MAIN's creator tax,
 *           3. optionally buy from the curve in the same tx, tokens go straight to the launcher.
 *
 *         Because this contract is the Pons `deployer`, it may call `sweepFees` on its own curves,
 *         so `sweepAndDistribute` moves fees from curve → escrow → splitter → wallets without waiting
 *         for Pons' operator. Anyone may call it.
 */
contract MainLauncher is Ownable2Step, ReentrancyGuard {
    enum Kind {
        KOL,
        CLAN
    }

    struct LaunchInput {
        string name;
        string symbol;
        string logo;
        string description;
        IPonsV2LaunchFactory.Socials socials;
        bytes32 expectedEconomics; // from factory.previewLaunchEconomics, or 0 to skip the pin
        bytes32 salt;
        Kind kind;
        string kolRef; // FOMO handle, or clan id
        address[] kolAccounts; // one for a KOL, N for a clan; address(0) = wallet pending
        uint96[] kolWeights;
        uint256 minTokensOut; // slippage guard for the optional dev buy
    }

    struct Shares {
        uint16 kolBps;
        uint16 endorsedKolBps;
        uint16 launcherBps;
        uint16 creatorTaxBps;
    }

    IPonsV2LaunchFactory public immutable pons;
    IPonsV2FeeEscrow public immutable escrow;
    address public immutable splitterImplementation;

    address public treasury;
    address public signer; // MAIN backend key: endorsements and wallet resolution
    address public relayer; // MAIN hot wallet that launches on behalf of users who have no wallet
    uint256 public launchConfigId;
    Shares public shares;

    mapping(address token => address splitter) public splitterOf;
    address[] public tokens;

    event CoinLaunched(
        address indexed token,
        address indexed curve,
        address indexed splitter,
        address launcher,
        Kind kind,
        string kolRef,
        address[] kolAccounts,
        uint256 devBuyWei,
        bool relayed
    );
    event Endorsed(address indexed token, bool endorsed);
    event KolWalletSet(address indexed token, uint256 index, address account);
    event Swept(address indexed token, uint256 distributed);
    event SharesUpdated(Shares shares);
    event TreasuryUpdated(address treasury);
    event SignerUpdated(address signer);
    event RelayerUpdated(address relayer);

    error NotSigner();
    error NotRelayer();
    error UnknownToken();
    error ZeroAddress();
    error BadShares();
    error BadDevBuy();

    modifier onlySigner() {
        if (msg.sender != signer && msg.sender != owner()) revert NotSigner();
        _;
    }

    constructor(IPonsV2LaunchFactory pons_, address treasury_, address signer_, Shares memory shares_)
        Ownable(msg.sender)
    {
        if (treasury_ == address(0) || signer_ == address(0)) revert ZeroAddress();
        pons = pons_;
        escrow = pons_.feeEscrow();
        splitterImplementation = address(new MainSplitter());
        treasury = treasury_;
        signer = signer_;
        relayer = signer_;
        _setShares(shares_);
    }

    // ------------------------------------------------------------------ launch

    /// @notice Launch fee for Pons; anything above it in msg.value is spent buying from the curve.
    function launchFee() external view returns (uint256) {
        return pons.launchFee();
    }

    function launch(LaunchInput calldata input)
        external
        payable
        nonReentrant
        returns (address token, address curve, address splitter)
    {
        return _launch(input, msg.sender, shares, treasury);
    }

    /**
     * @notice Owner-only launch with its own fee terms and fee sink. Used for the platform token, which has no
     *         KOL and no outside launcher: `launcher` receives the launcher share, `kolAccounts` are the team,
     *         and `treasury_` (e.g. the buyback vault) takes the remainder.
     */
    function launchWithShares(LaunchInput calldata input, address launcher, Shares calldata shares_, address treasury_)
        external
        payable
        onlyOwner
        nonReentrant
        returns (address token, address curve, address splitter)
    {
        if (launcher == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (uint256(shares_.endorsedKolBps) + shares_.launcherBps > 10_000 || shares_.kolBps > shares_.endorsedKolBps) revert BadShares();
        return _launch(input, launcher, shares_, treasury_);
    }

    /**
     * @notice Launch on behalf of `launcher`, paid by MAIN's relayer. Lets someone with no wallet get a coin out:
     *         the relayer covers the Pons fee and gas, `launcher` receives the launcher share (and any first buy).
     *         Pass the treasury as `launcher` when the user gave no payout address.
     */
    function launchFor(LaunchInput calldata input, address launcher)
        external
        payable
        nonReentrant
        returns (address token, address curve, address splitter)
    {
        if (msg.sender != relayer && msg.sender != owner()) revert NotRelayer();
        if (launcher == address(0)) revert ZeroAddress();
        return _launch(input, launcher, shares, treasury);
    }

    function _launch(LaunchInput calldata input, address launcher, Shares memory s, address treasury_)
        private
        returns (address token, address curve, address splitter)
    {
        uint256 fee = pons.launchFee();
        if (msg.value < fee) revert BadDevBuy();
        uint256 devBuy = msg.value - fee;

        // 1. splitter clone, deterministic so the frontend can show the address before sending.
        splitter = Clones.cloneDeterministic(splitterImplementation, keccak256(abi.encode(launcher, input.salt)));
        MainSplitter(payable(splitter)).initialize(
            address(this),
            launcher,
            treasury_,
            escrow,
            s.kolBps,
            s.endorsedKolBps,
            s.launcherBps,
            input.kolAccounts,
            input.kolWeights
        );

        // 2. Pons launch with the splitter as the fee recipient.
        IPonsV2LaunchFactory.TokenParams memory params = IPonsV2LaunchFactory.TokenParams({
            name: input.name,
            symbol: input.symbol,
            logo: input.logo,
            description: input.description,
            socials: input.socials,
            creatorFeeRecipient: splitter,
            creatorTaxBps: s.creatorTaxBps,
            buybackEnabled: false,
            expectedEconomics: input.expectedEconomics,
            salt: input.salt
        });
        // The launcher's own wallet is declared up front so neither the buy below nor their own buys in
        // the launch window pay the snipe tax. This contract is exempt already as the Pons deployer.
        address[] memory exempt = new address[](1);
        exempt[0] = launcher;
        (token, curve) = pons.launchToken{value: fee}(params, launchConfigId, address(0), exempt);
        MainSplitter(payable(splitter)).setToken(token);
        splitterOf[token] = splitter;
        tokens.push(token);

        // 3. optional first buy. Bought to this contract (exempt) and handed to the launcher.
        if (devBuy > 0) {
            uint256 got = IPonsV2BondingCurve(curve).buy{value: devBuy}(devBuy, input.minTokensOut, address(this));
            IERC20Minimal(token).transfer(launcher, got);
        }

        emit CoinLaunched(token, curve, splitter, launcher, input.kind, input.kolRef, input.kolAccounts, devBuy, msg.sender != launcher);
    }

    /// @notice Splitter address a launch from `launcher` with `salt` will get.
    function predictSplitter(address launcher, bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(splitterImplementation, keccak256(abi.encode(launcher, salt)));
    }

    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }

    // ------------------------------------------------------------------ fees

    /// @notice Sweeps curve fees into escrow (pre-graduation) and distributes. Permissionless.
    function sweepAndDistribute(address token) public returns (uint256 distributed) {
        address splitter = splitterOf[token];
        if (splitter == address(0)) revert UnknownToken();
        IPonsV2LaunchFactory.LaunchedToken memory l = pons.getLaunchedToken(token);
        if (l.phase == IPonsV2LaunchFactory.GraduationPhase.NotGraduated) {
            // The splitter is the curve's fee recipient, which Pons allows to sweep. Skips quietly if the
            // curve needs the trusted operator (buyback route) or has nothing pending.
            try MainSplitter(payable(splitter)).sweep(l.curve) {} catch {}
        }
        if (MainSplitter(payable(splitter)).claimable() > 0) {
            distributed = MainSplitter(payable(splitter)).distribute();
            emit Swept(token, distributed);
        }
    }

    function sweepAndDistributeMany(address[] calldata list) external {
        for (uint256 i = 0; i < list.length; ++i) {
            sweepAndDistribute(list[i]);
        }
    }

    // ------------------------------------------------------------------ signer actions

    function setEndorsed(address token, bool endorsed) external onlySigner {
        address splitter = splitterOf[token];
        if (splitter == address(0)) revert UnknownToken();
        MainSplitter(payable(splitter)).setEndorsed(endorsed);
        emit Endorsed(token, endorsed);
    }

    function setKolWallet(address token, uint256 index, address account) external onlySigner {
        address splitter = splitterOf[token];
        if (splitter == address(0)) revert UnknownToken();
        MainSplitter(payable(splitter)).setKolRecipient(index, account);
        emit KolWalletSet(token, index, account);
    }

    // ------------------------------------------------------------------ owner

    function setShares(Shares calldata shares_) external onlyOwner {
        _setShares(shares_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setRelayer(address relayer_) external onlyOwner {
        if (relayer_ == address(0)) revert ZeroAddress();
        relayer = relayer_;
        emit RelayerUpdated(relayer_);
    }

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerUpdated(signer_);
    }

    function setLaunchConfigId(uint256 id) external onlyOwner {
        launchConfigId = id;
    }

    function _setShares(Shares memory s) internal {
        if (uint256(s.endorsedKolBps) + s.launcherBps > 10_000 || s.kolBps > s.endorsedKolBps) revert BadShares();
        shares = s;
        emit SharesUpdated(s);
    }
}
