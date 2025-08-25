import type { ScannerResult, TokenData } from "./types";

// Маппинг ScannerResult -> TokenData
export function mapScannerResultToTokenData(result: ScannerResult): TokenData {
  // Market Cap calculation priority
  let mcap = 0;
  if (parseFloat(result.currentMcap) > 0) mcap = parseFloat(result.currentMcap);
  else if (parseFloat(result.initialMcap) > 0) mcap = parseFloat(result.initialMcap);
  else if (parseFloat(result.pairMcapUsd) > 0) mcap = parseFloat(result.pairMcapUsd);
  else if (parseFloat(result.pairMcapUsdInitial) > 0) mcap = parseFloat(result.pairMcapUsdInitial);
  else if (parseFloat(result.token1TotalSupplyFormatted) > 0 && parseFloat(result.price) > 0) {
    mcap = parseFloat(result.token1TotalSupplyFormatted) * parseFloat(result.price);
  }

  return {
    id: result.pairAddress,
    tokenName: result.token1Name,
    tokenSymbol: result.token1Symbol,
    tokenAddress: result.token1Address,
    pairAddress: result.pairAddress,
    chain: result.chainId === 1 ? "ETH" : result.chainId === 11155111 ? "SOL" : result.chainId === 8453 ? "BASE" : "BSC",
    exchange: result.routerAddress || result.virtualRouterType || "",
    priceUsd: parseFloat(result.price),
    volumeUsd: parseFloat(result.volume),
    mcap,
    priceChangePcs: {
      "5m": parseFloat(result.diff5M),
      "1h": parseFloat(result.diff1H),
      "6h": parseFloat(result.diff6H),
      "24h": parseFloat(result.diff24H),
    },
    transactions: {
      buys: result.buys ?? 0,
      sells: result.sells ?? 0,
    },
    audit: {
      mintable: result.isMintAuthDisabled ?? false,
      freezable: result.isFreezeAuthDisabled ?? false,
      honeypot: result.honeyPot ?? false,
      contractVerified: result.contractVerified,
    },
    tokenCreatedTimestamp: new Date(result.age),
    liquidity: {
      current: parseFloat(result.liquidity),
      changePc: parseFloat(result.percentChangeInLiquidity),
    },
  };
}
