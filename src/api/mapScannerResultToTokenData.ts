import type { ScannerResult, TokenData } from "./types";

function parseHumanNumber(input?: string): number {
  if (!input) return 0;
  const s = String(input).trim();
  // remove commas and spaces
  const cleaned = s.replace(/[,\s]/g, "").toUpperCase();
  // handle suffixes K, M, B
  const match = cleaned.match(/^([0-9]*\.?[0-9]+)([KMB])?$/i);
  if (!match) return Number(cleaned) || 0;
  const val = Number(match[1]);
  const suffix = match[2];
  if (!suffix) return val;
  switch (suffix) {
    case "K":
      return val * 1e3;
    case "M":
      return val * 1e6;
    case "B":
      return val * 1e9;
    default:
      return val;
  }
}

// Маппинг ScannerResult -> TokenData
export function mapScannerResultToTokenData(result: ScannerResult): TokenData {
  // Market Cap calculation priority
  let mcap = 0;
  if (parseFloat(result.currentMcap) > 0) mcap = parseFloat(result.currentMcap);
  else if (parseFloat(result.initialMcap) > 0)
    mcap = parseFloat(result.initialMcap);
  else if (parseFloat(result.pairMcapUsd) > 0)
    mcap = parseFloat(result.pairMcapUsd);
  else if (parseFloat(result.pairMcapUsdInitial) > 0)
    mcap = parseFloat(result.pairMcapUsdInitial);
  else {
    // fallback: try parsing human-friendly total supply (e.g. 1.5M, 1,000,000)
    const parsedTotalSupply = parseHumanNumber(
      result.token1TotalSupplyFormatted
    );
    const price = parseFloat(result.price) || 0;
    if (parsedTotalSupply > 0 && price > 0) {
      mcap = parsedTotalSupply * price;
    }
  }

  return {
    id: result.pairAddress,
    tokenName: result.token1Name,
    tokenSymbol: result.token1Symbol,
    tokenAddress: result.token1Address,
    pairAddress: result.pairAddress,
    chain:
      result.chainId === 1
        ? "ETH"
        : result.chainId === 11155111
        ? "SOL"
        : result.chainId === 8453
        ? "BASE"
        : "BSC",
    exchange: result.routerAddress || result.virtualRouterType || "",
    tokenImageUri: result.token1ImageUri ?? null,
    priceUsd: parseFloat(result.price),
    volumeUsd: parseFloat(result.volume),
    mcap,
    // keep raw total supply and parsed numeric total supply for realtime updates
    token1TotalSupplyRaw: result.token1TotalSupplyFormatted,
    totalSupply: parseHumanNumber(result.token1TotalSupplyFormatted),
    token1Decimals: Number(result.token1Decimals) || 0,
    token0Decimals: Number(result.token0Decimals) || 0,
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
