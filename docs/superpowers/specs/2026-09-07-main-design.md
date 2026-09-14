# MAIN (Main Character) – designspec

Datum: 2026-09-07. Status: del 1 (systemöversikt) godkänd. Del 2–4 (kontrakt, backend, test) skrivs efter UI-skalet.

## 1. Vad MAIN är

En launchpad på Robinhood Chain där vem som helst skapar en coin "parad" mot en KOL (en trader på FOMO-appen). Trading-fees går automatiskt till KOL:ens FOMO-wallet. KOL:en kan endorsa coinen via X-login och får då dubbla fees. Launchen sker på Pons V2, MAIN är identitetslager + fee-router + frontend.

## 2. Fakta om underliggande system (verifierat 2026-09-07)

### Robinhood Chain
- Arbitrum Orbit L2, EVM. Gas i ETH. Lanserad 2026-07-01.

### Pons V2 (github.com/ponsdotdev/ponsfamily, MIT)
- Factory: `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e`
- `launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable` – `msg.value == launchFee`. `TokenParams` innehåller `creatorFeeRecipient` och `creatorTaxBps` (≤ `maxCreatorTaxBps`, 10 %). Event `TokenLaunched(token, curve, deployer, pairToken, launchConfigId, graduationThreshold)`.
- Fee: 1 % på quote-benet, 70 % creator / 30 % protokoll. Creator-tax betalas 100 % till `creatorFeeRecipient`. Fee-policy snapshottas per launch, kan inte ändras efteråt.
- Fees för ETH-parade launches är **native ETH**, krediteras till `IPonsV2FeeEscrow` per mottagaradress. `claim()` betalar ut `balanceOf(msg.sender)`. Ledgern är per adress, inte per coin.
- `transferCreatorFeeRecipient(token, newRecipient)` – bara nuvarande mottagare. Pons-ägaren kan föreslå ny mottagare med timelock (`setCreatorFeeRecipient`), risk vi accepterar och övervakar via event.
- Fees sopas (`FeesSwept`) av Pons sweep-operator; utbetalningstakt beror på deras sweeps.

### FOMO (fomo.family)
- Inget officiellt API. Inofficiella: fomoapi.io (Bearer-key, credits: gratis 1000/mån, Starter 49 USD 10k), fomoscan.sh, YvesxDev/fomo-wallet-resolver (open source, använder FOMO:s interna Privy-API).
- Wallets är Privy-embedded. EVM-adress går att resolva först efter att användaren gjort en EVM-swap i appen.
- FOMO stödjer Robinhood Chain sedan 2026-07-10; Pons-tokens listas automatiskt på `fomo.family/tokens/robinhood/<addr>`.
- FOMO visar native ETH som saldo; WETH visas bara som token-rad.

## 3. Fee-modell (låst)

`creatorTaxBps = 300`. Splittern får 0,7 % (Pons-andel) + 3 % (tax) = 3,7 % av volymen.

| Mottagare | Standard | Efter endorse |
|---|---|---|
| KOL | 1,0 % | 2,0 % |
| Launcher | 0,5 % | 0,5 % |
| MAIN | 2,2 % | 1,2 % |

I bps av splitterns intag (3,7 % = 10000 bps): KOL 2703 → 5405, launcher 1351, MAIN resten.

## 4. Produktbeslut

- **Endorse:** "Logga in med X" (OAuth). Backend matchar X-handle mot FOMO-profil i vår DB. MAIN-signerare sätter `endorsed` på klonen. Wallet-signering som alternativ senare.
- **KOL-lista:** fomoapi leaderboard (24h/7d/30d/all, topp 200–500), synk varje timme, wallets resolvade och cachade. Fritt FOMO-handle tillåts men köas för resolving innan launch låses upp.
- **Handel:** v1 = launch + visning. Köpknapp deep-linkar till FOMO-appen och Pons. Köp-panel på MAIN byggs senare (plats reserverad i layouten).
- **Launcher-wallet:** MetaMask/Rabby/Coinbase via wagmi. Privy senare.
- **Oresolvad KOL-wallet:** klonen håller KOL-andelen tills adress sätts.
- **Utbetalning:** `distribute()` är permissionless; MAIN kör cron över klonar med saldo över tröskel.

## 5. Systemöversikt (godkänd)

1. **Kontrakt** (Foundry): `MainSplitterFactory` skapar EIP-1167-klon per coin. Klon = `creatorFeeRecipient` hos Pons. `distribute()` claimar från escrow och delar ut. `setEndorsed`, `setKolWallet` av MAIN-signerare.
2. **Backend** (Supabase): tabeller för kols, wallets, coins, endorsements, x_sessions. Edge Functions: leaderboard-synk (cron 1h), Pons-event-indexer, X OAuth-callback, endorse-signering, distribute-cron.
3. **Frontend** (Vite + React + TS + Tailwind v4 + wagmi): FOMO-tokens i `@theme`, Satoshi. Sidor: Hem (KOL-leaderboard + senaste coins), KOL-sida, Coin-sida, Launch-flöde, Endorse-flöde, Mina fees.
4. **Hosting:** Cloudflare Pages + Supabase.

Flöden: se konversationslogg 2026-09-07 (launch, endorse, utbetalning) – sammanfattade ovan.

## 6. Design-tokens (från FOMO:s CSS-bundle, root-v2)

```
--color-bg-primary:#060510  --color-bg-secondary:#12111a
--color-bg-tertiary-solid:#161522  --color-bg-tertiary:#cbd0eb1a
--color-primary:#516af6  --color-accent-primary-transparent:#516af629
--color-accent-secondary:#221d4b
--color-text-primary:#f7f7f7  --color-text-secondary:#9899a3  --color-text-tertiary:#474b52
--color-border:#474b52  --color-input:#474b52
--color-green:#21c95e (#21c95e33)  --color-red:#ff622e (#ff622e33)
--color-yellow:#ffbf17  --color-warning:#ffc74f  --color-dev:#fd5dd3
--radius: 6/8/12/16/24px + full   --blur: 8/12/24px
body: font-weight 500, antialiased, color-scheme dark
Glas: bg rgba(255,255,255,.12), border .8px solid rgba(203,208,235,.1), backdrop-filter blur(12px), radius 12px
Primärknapp-glas: bg rgba(96,106,247,.5) + samma border/blur
Rubriker: weight 500, letter-spacing ≈ -0.05em
```

Font: Satoshi 400/500/700 (Fontshare) nu; Aeonik när licens köpts. Ingen FOMO-logga eller namn.

## 7. Öppna punkter (del 2–4)
- Exakt klon-ABI, CREATE2-prediktion vs. två transaktioner.
- Verifiera escrow-adress on-chain (implementationen finns inte i repot).
- fomoapi vs fomoscan som primär källa, kostnadstak.
- Testplan: Foundry-tester för split/endorse, fork-test mot Pons på Robinhood Chain.

## 8. Del 2–4, byggt 2026-09-07 (kväll)

### Kontrakt (`contracts/`, Foundry, via-IR, solc 0.8.26)
- `MainLauncher.launch(LaunchInput) payable` – en tx: klonar `MainSplitter` (EIP-1167, CREATE2 på `keccak(launcher, salt)`), anropar Pons `launchToken(params, 0, address(0), [launcher])` med klonen som `creatorFeeRecipient` och `creatorTaxBps=300`, valfritt dev-buy köpt till fabriken (snipe-exempt) och skickat till launchern. Event `CoinLaunched(token, curve, splitter, launcher, kind, kolRef, kolAccounts, devBuyWei)`.
- `MainSplitter`: `distribute()` permissionless, claimar från Pons escrow, delar KOL-pott (viktade mottagare, klan = N), launcher, treasury. `sweep(curve)` – Pons låter fee-mottagaren (klonen) sopa kurvan; `MainLauncher.sweepAndDistribute(token)` gör sweep + distribute. `setEndorsed`, `setKolRecipient` via fabriken (signer/owner). Okända wallets ackumuleras i `pending[i]`, misslyckade pushar i `owed[addr]` (`withdraw()`).
- Andelar i bps av intaget: KOL 2703 (endorsed 5405), launcher 1351, treasury rest. Verifierat i fork-test: exakt 100 bps av volymen till KOL, dubbelt efter endorse.
- **Pons-fakta som styrde designen:** kurvans `deployer` = creatorFeeRecipient (inte tx-avsändaren); snipe-skatt 99 % som avtar över 3 s, undantag via `launchToken`-överlagringen med lista; fees i native ETH; escrow per adress.
- Tester: 15 enhetstester (mock-Pons) + 1 fork-test mot riktiga fabriken. `forge test` i `contracts/`.
- Deploy: `contracts/script/Deploy.s.sol` (DEPLOYER_PK, TREASURY, SIGNER). Signer-adress för backend: `SIGNER_ADDRESS` i `.env`.

### Frontend
- wagmi + viem, `src/lib/chain.ts` (chainId 4663). `VITE_MAIN_LAUNCHER`, `VITE_MAIN_START_BLOCK`, `VITE_RPC`, `VITE_DEV_MOCK_WALLET` (dev: mock-wallet mot anvil-fork).
- `src/data/coins.ts`: läser `CoinLaunched/Endorsed/Swept` + kurvreserver, `CurveBuy/Sell` (volym, köpare), splitter-stats. Mock som fallback utan kontrakt. Aktivitetsflöde på startsidan.
- Launch: KOL- eller klan-läge. Klan = leaderboard-medlemmar med samma `clan.name` och EVM-wallet, lika vikt.
- Endorse: `/endorse/:token`, X OAuth PKCE via Pages Functions, HMAC-session-cookie, `/api/endorse` matchar X-handle mot FOMO-handle (eller FOMO-profilens länkade X) och anropar `setEndorsed` med `SIGNER_PK`.
- Delningskort: canvas 1200×630 klient-side (`ShareCard.tsx`), avatar via `/api/img` CORS-proxy. Watchlist i localStorage.

### Secrets (Cloudflare Pages)
Satta: `FOMOAPI_KEY`, `SESSION_SECRET`. Saknas: `X_CLIENT_ID`, `X_CLIENT_SECRET` (X developer app, callback `https://<domän>/api/x/callback`), `SIGNER_PK`, `MAIN_LAUNCHER`, `MAIN_START_BLOCK` (efter deploy). Bygg-tid: `VITE_MAIN_LAUNCHER`, `VITE_MAIN_START_BLOCK`.

### Inte byggt
- X-DM/tagg till KOL vid launch (kräver X:s betalda API-nivå för att posta).
- Push-notiser för watchlist (kräver backend + service worker).
- Riktig prisgraf och handel i MAIN (kräver trade-indexer).

## 9. Mainnet-deploy 2026-09-08 00:48
- `MainLauncher` **0xce0f3C1Be0836561A6F4aE8bA0df5B8AE1684dC4**, block 57203022, tx 0x9ddd63d2…b06bc6
- `MainSplitter` impl 0x8E746424A0dfb9551F8EBD2d68966a9A828806e9
- owner (deploy-wallet) 0xB9a5753422657Cdb04f4c95b30Ee5bb26C0Ecd02, treasury 0x0B1c79A94e6e933eD3531FE11A9cD03ce1369966, signer = relayer 0x5332A888A09b128Bf84e2ce75634CCb60026CF62
- Shares 2703/5405/1351, tax 300. Domän: maincharacter.family (Cloudflare-zon, DNS-poster ska vara CNAME → main-character-c38.pages.dev).
- Frontend: `web/.env.production` (VITE_MAIN_LAUNCHER, VITE_MAIN_START_BLOCK, VITE_RPC). Pages-secrets: MAIN_LAUNCHER, MAIN_START_BLOCK.

## 10. Fee-modell v2 (beslutad 2026-09-14, ersätter §3)

Endorse-bonusen är borttagen; endorse = verifierad badge, inget mer.

| | Plattforms-coins (3,5 %) | $MAIN (3,6 %) |
|---|---|---|
| Pons | 0,3 | 0,3 |
| KOL | 1,0 | – |
| Launcher | 0,5 | – |
| Buyback & burn $MAIN | 0,5 | 0,5 |
| Team (0xdC397056D4F851b0ab4C74Accb8aa4D9167D9F99) | – | 1,0 |
| Founder (0x5Bc6884BAb4f2Ae87A2F18c3180C8B4E2Bfbb070) | 1,2 | 1,8 |

Kontrakt: `MainLauncher.Shares{kol 3125, endorsed 3125, launcher 1563, tax 250}` → treasury = `TreasurySplit` (vault 5 : founder 12). $MAIN launchas via `launchWithShares` (owner) med `{kol 3030, endorsed 3030, launcher 5455, tax 260}`, launcher = founder, kolAccounts = [team], treasury = `BuybackVault`.
`BuybackVault.buyAndBurn` köper på $MAIN:s Pons-kurva och bränner (ERC20Burnable); efter graduation krävs en router (`setRouter`, ej byggd än). Cron-workern kör `TreasurySplit.distribute` och `buyAndBurn` varje timme (env `TREASURY_SPLIT`, `BUYBACK_VAULT`).
Deploy: `contracts/script/DeployV2.s.sol` (Leo, DEPLOYER_PK). Kräver ny MainLauncher-adress i `web/.env.production` + Pages-secret `MAIN_LAUNCHER` + worker `MAIN_LAUNCHER` var.
Tester: 28 unit + fork.
