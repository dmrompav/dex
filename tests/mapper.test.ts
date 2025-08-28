import { describe, it, expect } from "vitest";
import { mapScannerResultToTokenData } from "../src/api/mapScannerResultToTokenData";
import type { ScannerResult } from "../src/api/types";

const baseScannerResult = (overrides = {}) => ({
  age: new Date().toISOString(),
  bundlerHoldings: "0",
  callCount: 0,
  chainId: 1,
  contractRenounced: false,
  contractVerified: false,
  currentMcap: "0",
  devHoldings: "0",
  dexPaid: false,
  diff1H: "0",
  diff24H: "0",
  diff5M: "0",
  diff6H: "0",
  fdv: "0",
  first1H: "0",
  first24H: "0",
  first5M: "0",
  first6H: "0",
  honeyPot: false,
  initialMcap: "0",
  insiderHoldings: "0",
  insiders: 0,
  isFreezeAuthDisabled: false,
  isMintAuthDisabled: false,
  liquidity: "0",
  liquidityLocked: false,
  liquidityLockedAmount: "0",
  liquidityLockedRatio: "0",
  migratedFromVirtualRouter: null,
  virtualRouterType: null,
  pairAddress: "0xpair",
  pairMcapUsd: "0",
  pairMcapUsdInitial: "0",
  percentChangeInLiquidity: "0",
  percentChangeInMcap: "0",
  price: "0",
  reserves0: "0",
  reserves0Usd: "0",
  reserves1: "0",
  reserves1Usd: "0",
  routerAddress: "0xrouter",
  sells: 0,
  sniperHoldings: "0",
  snipers: 0,
  token0Decimals: 6,
  token0Symbol: "T0",
  token1Address: "0xtoken",
  token1Decimals: "6",
  token1ImageUri: null,
  token1IsHoneypot: false,
  token1IsProxy: false,
  token1Name: "MyToken",
  token1SellFee: 0,
  token1Symbol: "MTK",
  token1TotalSupply: "1000000",
  token1TotalSupplyFormatted: "1,000,000",
  token1TransferFee: 0,
  top10Holdings: "0",
  txns: 0,
  volume: "0",
  ...overrides,
});

describe("mapScannerResultToTokenData", () => {
  it("uses currentMcap when > 0", () => {
    const r = baseScannerResult({ currentMcap: "12345", price: "2.5" });
    const t = mapScannerResultToTokenData(r as ScannerResult);
    expect(t.mcap).toBeCloseTo(12345);
  });

  it("falls back to totalSupply * price when no currentMcap", () => {
    const r = baseScannerResult({
      currentMcap: "0",
      price: "2",
      token1TotalSupplyFormatted: "1.5M",
    });
    const t = mapScannerResultToTokenData(r as ScannerResult);
    // 1.5M * 2 = 3,000,000
    expect(t.totalSupply).toBeCloseTo(1500000);
    expect(t.mcap).toBeCloseTo(3000000);
  });
});
