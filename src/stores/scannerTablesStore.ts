import type {
  TokenData,
  SupportedChainName,
  GetScannerResultParams,
  SerdeRankBy,
  OrderBy,
  TimeFrame,
} from "../api/types";
import { fetchScanner } from "../api/scanner";
import { mapScannerResultToTokenData } from "../api/mapScannerResultToTokenData";
import WsClient from "../services/wsClient";
import { WS_URL } from "../const/api";
import type {
  IncomingWebSocketMessage,
  TickEventPayload,
  PairStatsMsgData,
  ScannerPairsEventPayload,
} from "../api/types";
import { create } from "zustand";

// pending tick updates batching (module-scoped)
type PendingTick = {
  priceUsd?: number;
  mcap?: number;
  volumeDelta?: number;
  buysDelta?: number;
  sellsDelta?: number;
};
const pendingTicks = new Map<string, PendingTick>();
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlushPendingTicks(flushFn: () => void) {
  if (pendingFlushTimer) return;
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null;
    try {
      flushFn();
    } catch (e) {
      console.warn("flushPendingTicks error", e);
    }
  }, 100);
}

export interface ScannerTablesState {
  trendingTokens: TokenData[];
  newTokens: TokenData[];
  loading: boolean;
  error: string | null;
  filters: {
    chain: SupportedChainName;
    minVolume: number;
    maxAge: number;
    minMcap: number; // client-side only, API doesn't expose minMcap param
    excludeHoneypots: boolean;
    minLiq: number | null;
    maxLiq: number | null;
    minBuys24H: number | null;
    minSells24H: number | null;
    minTxns24H: number | null;
    isVerified: boolean | null;
    dexes: string[] | null;
    virtualDexes: string[] | null;
    timeFrame?: TimeFrame | null;
  };
  // pagination state
  trendingPage: number;
  newPage: number;
  trendingTotalRows: number;
  newTotalRows: number;
  loadingMoreTrending: boolean;
  loadingMoreNew: boolean;
  trendingLoading: boolean;
  newLoading: boolean;
  // server sort state per table
  trendingRankBy: SerdeRankBy;
  trendingOrderBy: OrderBy;
  newRankBy: SerdeRankBy;
  newOrderBy: OrderBy;
  setFilters: (filters: Partial<ScannerTablesState["filters"]>) => void;
  setTrendingTokens: (tokens: TokenData[]) => void;
  setNewTokens: (tokens: TokenData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadTokens: () => Promise<void>;
  loadMoreTrendingTokens: () => Promise<void>;
  loadMoreNewTokens: () => Promise<void>;
  loadTrendingTokens: (opts?: {
    rankBy?: SerdeRankBy;
    orderBy?: OrderBy;
  }) => Promise<void>;
  loadNewTokens: (opts?: {
    rankBy?: SerdeRankBy;
    orderBy?: OrderBy;
  }) => Promise<void>;
  setTrendingRankBy: (r: SerdeRankBy) => void;
  setTrendingOrderBy: (o: OrderBy) => void;
  setNewRankBy: (r: SerdeRankBy) => void;
  setNewOrderBy: (o: OrderBy) => void;
  unsubscribeTokens: (tokens: TokenData[]) => void;
}

export const useScannerTablesStore = create<ScannerTablesState>((set, get) => ({
  trendingTokens: [],
  newTokens: [],
  loading: false,
  error: null,
  // pagination initial
  trendingPage: 1,
  newPage: 1,
  trendingTotalRows: 0,
  newTotalRows: 0,
  loadingMoreTrending: false,
  loadingMoreNew: false,
  trendingLoading: false,
  newLoading: false,
  trendingRankBy: "volume",
  trendingOrderBy: "desc",
  newRankBy: "age",
  newOrderBy: "desc",
  filters: {
    chain: "SOL",
    minVolume: 0,
    maxAge: 86400,
    minMcap: 0,
    excludeHoneypots: true,
    minLiq: null,
    maxLiq: null,
    minBuys24H: null,
    minSells24H: null,
    minTxns24H: null,
    isVerified: null,
    dexes: null,
    virtualDexes: null,
    timeFrame: null,
  },
  setFilters: (filters) =>
    set((state) => {
      // attempt to unsubscribe previous scanner filter so server stops sending old data
      try {
        const prev = state.filters;
        const win = window as unknown as { __dexWsClient?: WsClient };
        const prevParams: GetScannerResultParams = {
          chain: prev.chain,
          isNotHP: prev.excludeHoneypots,
          minVol24H: prev.minVolume,
          maxAge: prev.maxAge,
        };
        win.__dexWsClient?.unsubscribeFilter(prevParams);
      } catch {
        // ignore
      }
      return { filters: { ...state.filters, ...filters } };
    }),
  setTrendingTokens: (tokens) => {
    set({ trendingTokens: tokens });
    try {
      const win = window as unknown as { __dexWsClient?: WsClient };
      const ws = win.__dexWsClient;
      if (ws) {
        // subscribe to pair and pair-stats for all tokens in the list (wsClient will dedupe)
        for (const t of tokens) {
          try {
            ws.subscribePair(t.pairAddress, t.tokenAddress, t.chain as string);
            ws.subscribePairStats(
              t.pairAddress,
              t.tokenAddress,
              t.chain as string
            );
          } catch {
            // ignore per-token errors
          }
        }
      }
    } catch {
      // ignore
    }
  },
  setNewTokens: (tokens) => {
    set({ newTokens: tokens });
    try {
      const win = window as unknown as { __dexWsClient?: WsClient };
      const ws = win.__dexWsClient;
      if (ws) {
        for (const t of tokens) {
          try {
            ws.subscribePair(t.pairAddress, t.tokenAddress, t.chain as string);
            ws.subscribePairStats(
              t.pairAddress,
              t.tokenAddress,
              t.chain as string
            );
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  },
  // helper to unsubscribe a list of tokens (by pair/token/chain)
  unsubscribeTokens: (tokens: TokenData[]) => {
    try {
      const win = window as unknown as { __dexWsClient?: WsClient };
      const ws = win.__dexWsClient;
      if (!ws) return;
      for (const t of tokens) {
        try {
          ws.unsubscribePair(t.pairAddress, t.tokenAddress, t.chain as string);
          ws.unsubscribePairStats(
            t.pairAddress,
            t.tokenAddress,
            t.chain as string
          );
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  },
  // setLoading kept for backwards compatibility: sets global and per-table flags
  setLoading: (loading) =>
    set({ loading, trendingLoading: loading, newLoading: loading }),
  setError: (error) => set({ error }),
  loadTokens: async () => {
    // load both tables using per-table rank/order preferences
    set({ error: null, trendingLoading: true, newLoading: true });
    try {
      // ensure websocket client is connected and listening
      try {
        const win = window as unknown as { __dexWsClient?: WsClient };
        if (!win.__dexWsClient) {
          win.__dexWsClient = new WsClient(WS_URL);
          win.__dexWsClient.connect();
          try {
            window.addEventListener("beforeunload", () => {
              try {
                win.__dexWsClient?.disconnect();
              } catch {
                // ignore
              }
            });
          } catch {
            // ignore
          }
          win.__dexWsClient.onMessage((msg: IncomingWebSocketMessage) => {
            // basic routing of incoming ws messages
            if (msg.event === "scanner-pairs") {
              try {
                const pl = msg.data as ScannerPairsEventPayload;
                const mapped = pl.results.pairs.map(
                  mapScannerResultToTokenData
                );
                try {
                  console.debug("scanner-pairs received", {
                    count: pl.results.pairs.length,
                    firstIds: pl.results.pairs
                      .slice(0, 5)
                      .map((p) => p.pairAddress),
                  });
                } catch (e) {
                  console.debug("scanner-pairs debug error", e);
                }
                // determine which table this payload belongs to by comparing rankBy & chain
                try {
                  const current = get();
                  const payloadFilter = pl.filter;

                  const isTrendingPayload =
                    payloadFilter.rankBy === current.trendingRankBy &&
                    (payloadFilter.chain ?? current.filters.chain) ===
                      current.filters.chain;
                  const isNewPayload =
                    payloadFilter.rankBy === current.newRankBy &&
                    (payloadFilter.chain ?? current.filters.chain) ===
                      current.filters.chain;

                  if (isTrendingPayload) {
                    // replace trendingTokens with mapped, but preserve existing price/mcap when present
                    const prev = current.trendingTokens || [];
                    const prevById = new Map(prev.map((t) => [t.id, t]));
                    const newList: TokenData[] = mapped.map((m) => {
                      const existing = prevById.get(m.id);
                      if (existing && existing.priceUsd > 0) {
                        // preserve price and mcap and price history
                        const history = Array.isArray(existing.priceHistory)
                          ? [...existing.priceHistory]
                          : [existing.priceUsd].filter(Boolean);
                        return {
                          ...m,
                          priceUsd: existing.priceUsd,
                          mcap: existing.mcap ?? m.mcap,
                          priceHistory: history,
                        };
                      }
                      return m;
                    });
                    // find removed tokens to unsubscribe
                    const removed = prev.filter(
                      (t) => !newList.some((n) => n.id === t.id)
                    );
                    if (removed.length > 0) get().unsubscribeTokens(removed);
                    set({ trendingTokens: newList });
                  } else {
                    // default merge behavior for trending
                    const byId = new Map<string, TokenData>(
                      current.trendingTokens.map((t) => [t.id, t])
                    );
                    for (const m of mapped) {
                      const existing = byId.get(m.id);
                      if (
                        existing &&
                        existing.priceUsd &&
                        existing.priceUsd > 0
                      ) {
                        m.priceUsd = existing.priceUsd;
                        m.mcap = existing.mcap ?? m.mcap;
                        // carry forward price history if present
                        if (Array.isArray(existing.priceHistory))
                          m.priceHistory = [...existing.priceHistory];
                      }
                      byId.set(m.id, m);
                    }
                    set({ trendingTokens: Array.from(byId.values()) });
                  }

                  if (isNewPayload) {
                    // replace newTokens with mapped (scanner-pairs is full dataset for this filter)
                    const prev = current.newTokens || [];
                    const prevById = new Map(prev.map((t) => [t.id, t]));
                    const newList: TokenData[] = mapped.map((m) => {
                      const existing = prevById.get(m.id);
                      if (existing) {
                        // preserve previous price/mcap/history when present
                        const history = Array.isArray(existing.priceHistory)
                          ? [...existing.priceHistory]
                          : [existing.priceUsd].filter(Boolean);
                        return {
                          ...m,
                          priceUsd: existing.priceUsd ?? m.priceUsd,
                          mcap: existing.mcap ?? m.mcap,
                          priceHistory: history,
                        };
                      }
                      return m;
                    });
                    // unsubscribe removed tokens
                    const removed = prev.filter(
                      (t) => !newList.some((n) => n.id === t.id)
                    );
                    if (removed.length > 0) get().unsubscribeTokens(removed);
                    // set and ensure subscriptions
                    get().setNewTokens(newList);
                  } else {
                    // merge into newTokens as before
                    const filters = current.filters;
                    const existingNew = current.newTokens || [];
                    const existingIds = new Set(existingNew.map((t) => t.id));
                    const toPrepend = mapped.filter((m) => {
                      if (
                        filters.minMcap &&
                        filters.minMcap > 0 &&
                        m.mcap < filters.minMcap
                      )
                        return false;
                      return !existingIds.has(m.id);
                    });
                    if (toPrepend.length > 0) {
                      const newList = [...toPrepend, ...existingNew];
                      get().setNewTokens(newList);
                    }
                  }
                } catch (e) {
                  console.warn("scanner-pairs handler error", e);
                }
                // merge into newTokens: prepend unseen mapped pairs so new arrivals appear on top
                try {
                  const filters = get().filters;
                  const existingNew = get().newTokens || [];
                  const existingIds = new Set(existingNew.map((t) => t.id));
                  // apply client-side minMcap filter if present
                  const toPrepend = mapped.filter((m) => {
                    if (
                      filters.minMcap &&
                      filters.minMcap > 0 &&
                      m.mcap < filters.minMcap
                    )
                      return false;
                    return !existingIds.has(m.id);
                  });
                  try {
                    console.debug("scanner-pairs -> newTokens candidates", {
                      mappedCount: mapped.length,
                      prependCount: toPrepend.length,
                      prependIds: toPrepend.slice(0, 5).map((t) => t.id),
                    });
                  } catch (e) {
                    console.debug("scanner-pairs debug2 error", e);
                  }
                  if (toPrepend.length > 0) {
                    // preserve history
                    const existingById = new Map(
                      existingNew.map((t) => [t.id, t])
                    );
                    const prepared = toPrepend.map((m) => {
                      const ex = existingById.get(m.id);
                      if (ex && Array.isArray(ex.priceHistory))
                        m.priceHistory = [...ex.priceHistory];
                      return m;
                    });
                    // new tokens should appear first
                    const newList = [...prepared, ...existingNew];
                    // use setter helper to also manage pair subscriptions
                    get().setNewTokens(newList);
                  }
                } catch (e) {
                  console.warn("merge into newTokens failed", e);
                }
              } catch (e) {
                console.warn("ws scanner-pairs handler", e);
              }
            } else if (msg.event === "tick") {
              try {
                const tick = msg.data as TickEventPayload;
                const pairId = tick.pair?.pair;
                if (!pairId) return;

                // pick latest non-outlier swap
                const swaps = tick.swaps ?? [];
                const latestSwap = swaps.filter((s) => !s.isOutlier).pop();
                if (!latestSwap) return;

                // prefer priceToken1Usd when present
                const newPrice = Number(
                  latestSwap.priceToken1Usd ?? latestSwap.priceToken0Usd ?? NaN
                );
                if (Number.isNaN(newPrice)) return;

                // determine volume impact from swap amounts (best-effort)
                // (actual normalized volume computed later using token decimals)

                // accumulate pending updates to batch renders
                try {
                  // read existing tokens to compute totals and deltas
                  const state = get();
                  const applyPending = (arr: TokenData[]) => {
                    const idx = arr.findIndex((x) => x.pairAddress === pairId);
                    if (idx < 0) return;
                    const existing = arr[idx];
                    const totalSupply = existing.totalSupply ?? 0;
                    const newMcap =
                      totalSupply > 0 ? totalSupply * newPrice : existing.mcap;

                    // normalize swap amounts by decimals when amounts seem large (heuristic)
                    const dec1 = existing.token1Decimals ?? 0;
                    const dec0 = existing.token0Decimals ?? 0;
                    let normA1 = Number(latestSwap.amountToken1 || 0);
                    let normA0 = Number(latestSwap.amountToken0 || 0);
                    try {
                      if (dec1 > 0 && normA1 > 1e6)
                        normA1 = normA1 / Math.pow(10, dec1);
                      if (dec0 > 0 && normA0 > 1e6)
                        normA0 = normA0 / Math.pow(10, dec0);
                    } catch {
                      // ignore
                    }

                    const pending = pendingTicks.get(pairId) ?? {};
                    pending.priceUsd = newPrice;
                    pending.mcap = newMcap;
                    pending.volumeDelta =
                      (pending.volumeDelta || 0) +
                      (normA1 > 0
                        ? normA1 * Number(latestSwap.priceToken1Usd || newPrice)
                        : normA0 *
                          Number(latestSwap.priceToken0Usd || newPrice));

                    try {
                      if (latestSwap.tokenInAddress && existing.tokenAddress) {
                        const boughtToken =
                          latestSwap.tokenInAddress.toLowerCase();
                        const ourToken = existing.tokenAddress.toLowerCase();
                        if (boughtToken === ourToken)
                          pending.buysDelta = (pending.buysDelta || 0) + 1;
                        else pending.sellsDelta = (pending.sellsDelta || 0) + 1;
                      }
                    } catch {
                      // ignore
                    }

                    pendingTicks.set(pairId, pending);
                  };

                  applyPending(state.trendingTokens);
                  applyPending(state.newTokens);

                  scheduleFlushPendingTicks(() => {
                    // flush all pendingTicks into the store in one set()
                    set((s) => {
                      const newState: Partial<ScannerTablesState> = {};
                      if (pendingTicks.size === 0) return newState;
                      for (const [pid, p] of pendingTicks.entries()) {
                        const updateIn = (arr: TokenData[]) => {
                          const i = arr.findIndex((x) => x.pairAddress === pid);
                          if (i < 0) return arr;
                          const copy = [...arr];
                          const ex = copy[i];
                          const txs = { ...ex.transactions };
                          if (p.buysDelta)
                            txs.buys = (txs.buys || 0) + p.buysDelta;
                          if (p.sellsDelta)
                            txs.sells = (txs.sells || 0) + p.sellsDelta;
                          // append price to history (cap at 30)
                          const history = Array.isArray(ex.priceHistory)
                            ? [...ex.priceHistory]
                            : [ex.priceUsd].filter(Boolean);
                          if (p.priceUsd && !Number.isNaN(p.priceUsd)) {
                            history.push(p.priceUsd);
                            if (history.length > 30)
                              history.splice(0, history.length - 30);
                          }
                          copy[i] = {
                            ...ex,
                            priceUsd: p.priceUsd ?? ex.priceUsd,
                            mcap: p.mcap ?? ex.mcap,
                            volumeUsd:
                              (ex.volumeUsd || 0) + (p.volumeDelta || 0),
                            transactions: txs,
                            priceHistory: history,
                          };
                          return copy;
                        };
                        newState.trendingTokens = updateIn(s.trendingTokens);
                        newState.newTokens = updateIn(s.newTokens);
                      }
                      pendingTicks.clear();
                      return newState;
                    });
                  });
                } catch (e) {
                  console.warn("tick accumulate error", e);
                }
              } catch (e) {
                console.warn("ws tick handler", e);
              }
            } else if (msg.event === "pair-stats") {
              try {
                const stats = msg.data as PairStatsMsgData;
                const pid = stats.pair.pairAddress;
                set((state) => {
                  const idx = state.trendingTokens.findIndex(
                    (x) => x.pairAddress === pid
                  );
                  if (idx >= 0) {
                    const copy = [...state.trendingTokens];
                    const existing = copy[idx];
                    const p = stats.pair;
                    copy[idx] = {
                      ...existing,
                      // keep existing token identity fields
                      exchange:
                        p.routerAddress ||
                        p.virtualRouterType ||
                        existing.exchange,
                      tokenImageUri: p.token1ImageUri ?? existing.tokenImageUri,
                      priceUsd: Number(
                        p.pairPrice1Usd ?? p.pairPrice0Usd ?? existing.priceUsd
                      ),
                      // preserve previous mcap if missing
                      mcap: Number(p.pairMarketcapUsd ?? existing.mcap),
                      // update liquidity when available
                      liquidity: {
                        current: Number(
                          p.pairReserves1Usd ?? existing.liquidity.current
                        ),
                        changePc: existing.liquidity.changePc,
                      },
                      // audit mapping per spec
                      audit: {
                        mintable: !!p.mintAuthorityRenounced,
                        freezable: !!p.freezeAuthorityRenounced,
                        honeypot: !(p.token1IsHoneypot ?? false),
                        contractVerified:
                          existing.audit.contractVerified ?? !!p.isVerified,
                      },
                      // social links and flags
                      linkDiscord: p.linkDiscord ?? existing.linkDiscord,
                      linkTelegram: p.linkTelegram ?? existing.linkTelegram,
                      linkTwitter: p.linkTwitter ?? existing.linkTwitter,
                      linkWebsite: p.linkWebsite ?? existing.linkWebsite,
                      dexPaid: !!p.dexPaid,
                      migrationPc: stats.migrationProgress
                        ? Number(stats.migrationProgress)
                        : existing.migrationPc ?? null,
                    };
                    return {
                      trendingTokens: copy,
                    } as Partial<ScannerTablesState>;
                  }
                  const idx2 = state.newTokens.findIndex(
                    (x) => x.pairAddress === pid
                  );
                  if (idx2 >= 0) {
                    const copy = [...state.newTokens];
                    const existing = copy[idx2];
                    const p = stats.pair;
                    copy[idx2] = {
                      ...existing,
                      exchange:
                        p.routerAddress ||
                        p.virtualRouterType ||
                        existing.exchange,
                      tokenImageUri: p.token1ImageUri ?? existing.tokenImageUri,
                      priceUsd: Number(
                        p.pairPrice1Usd ?? p.pairPrice0Usd ?? existing.priceUsd
                      ),
                      mcap: Number(p.pairMarketcapUsd ?? existing.mcap),
                      liquidity: {
                        current: Number(
                          p.pairReserves1Usd ?? existing.liquidity.current
                        ),
                        changePc: existing.liquidity.changePc,
                      },
                      audit: {
                        // per spec: mintable <- mintAuthorityRenounced, freezable <- freezeAuthorityRenounced
                        mintable: !!p.mintAuthorityRenounced,
                        freezable: !!p.freezeAuthorityRenounced,
                        honeypot: !(p.token1IsHoneypot ?? false),
                        contractVerified: !!p.isVerified,
                      },
                      linkDiscord: p.linkDiscord ?? null,
                      linkTelegram: p.linkTelegram ?? null,
                      linkTwitter: p.linkTwitter ?? null,
                      linkWebsite: p.linkWebsite ?? null,
                      dexPaid: !!p.dexPaid,
                      migrationPc: stats.migrationProgress
                        ? Number(stats.migrationProgress)
                        : null,
                    };
                    return { newTokens: copy } as Partial<ScannerTablesState>;
                  }
                  return {} as Partial<ScannerTablesState>;
                });
                // If pair not found in either list, create a minimal TokenData and prepend to newTokens
                try {
                  const state = get();
                  const existsInTrending = state.trendingTokens.some(
                    (x) => x.pairAddress === pid
                  );
                  const existsInNew = state.newTokens.some(
                    (x) => x.pairAddress === pid
                  );
                  if (!existsInTrending && !existsInNew) {
                    const p = stats.pair;
                    const mapped: TokenData = {
                      id: p.pairAddress,
                      tokenName: p.token1Name ?? p.token1Symbol ?? "",
                      tokenSymbol: p.token1Symbol ?? "",
                      tokenAddress: p.token1Address ?? "",
                      pairAddress: p.pairAddress,
                      chain: (p.chain ?? "ETH") as SupportedChainName,
                      exchange: p.routerAddress || p.virtualRouterType || "",
                      tokenImageUri: p.token1ImageUri ?? null,
                      priceUsd: Number(p.pairPrice1Usd ?? p.pairPrice0Usd ?? 0),
                      volumeUsd: 0,
                      mcap: Number(p.pairMarketcapUsd ?? 0),
                      priceChangePcs: {
                        "5m": 0,
                        "1h": 0,
                        "6h": 0,
                        "24h": 0,
                      },
                      transactions: {
                        buys: 0,
                        sells: 0,
                      },
                      audit: {
                        mintable: !!p.mintAuthorityRenounced,
                        freezable: !!p.freezeAuthorityRenounced,
                        honeypot: !(p.token1IsHoneypot ?? false),
                        contractVerified: !!p.isVerified,
                      },
                      linkDiscord: p.linkDiscord ?? null,
                      linkTelegram: p.linkTelegram ?? null,
                      linkTwitter: p.linkTwitter ?? null,
                      linkWebsite: p.linkWebsite ?? null,
                      dexPaid: !!p.dexPaid,
                      migrationPc: stats.migrationProgress
                        ? Number(stats.migrationProgress)
                        : null,
                      tokenCreatedTimestamp: p.pairCreatedAt
                        ? new Date(p.pairCreatedAt)
                        : new Date(),
                      liquidity: {
                        current: Number(
                          p.pairReserves1Usd ?? p.pairMarketcapUsd ?? 0
                        ),
                        changePc: 0,
                      },
                    };
                    try {
                      console.debug(
                        "pair-stats -> adding new TokenData from pair-stats",
                        { id: mapped.id, symbol: mapped.tokenSymbol }
                      );
                    } catch (e) {
                      console.debug("pair-stats debug error", e);
                    }
                    // prepend and subscribe via setter
                    get().setNewTokens([mapped, ...state.newTokens]);
                  }
                } catch (e) {
                  console.warn("pair-stats add new token failed", e);
                }
              } catch (e) {
                console.warn("ws pair-stats handler", e);
              }
            }
          });
        }
      } catch (e) {
        console.warn("ws init", e);
      }
      await get().loadTrendingTokens();
      await get().loadNewTokens();
      set({ trendingLoading: false, newLoading: false });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        trendingLoading: false,
        newLoading: false,
      });
    }
  },
  loadTrendingTokens: async (opts) => {
    set({ trendingLoading: true, error: null });
    try {
      const { filters, trendingRankBy, trendingOrderBy } = get();
      const rankBy =
        opts?.rankBy ?? trendingRankBy ?? ("volume" as SerdeRankBy);
      const orderBy = opts?.orderBy ?? trendingOrderBy ?? ("desc" as OrderBy);
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy,
        orderBy,
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        maxAge: filters.maxAge,
        // server-side supported filters
        minLiq: filters.minLiq ?? undefined,
        maxLiq: filters.maxLiq ?? undefined,
        minBuys24H: filters.minBuys24H ?? undefined,
        minSells24H: filters.minSells24H ?? undefined,
        minTxns24H: filters.minTxns24H ?? undefined,
        isVerified: filters.isVerified ?? undefined,
        dexes: filters.dexes ?? undefined,
        virtualDexes: filters.virtualDexes ?? undefined,
        timeFrame: filters.timeFrame ?? undefined,
        page: 1,
      };
      // ensure server knows our scanner filter (will trigger scanner-pairs updates)
      try {
        const win = window as unknown as { __dexWsClient?: WsClient };
        win.__dexWsClient?.subscribeFilter(params);
      } catch (e) {
        console.warn("subscribeFilter error", e);
      }
      const res = await fetchScanner(params);
      let tokens = res.pairs.map(mapScannerResultToTokenData);
      // client-side filter: minMcap (API does not expose minMcap param)
      if (filters.minMcap && filters.minMcap > 0) {
        tokens = tokens.filter((t) => t.mcap >= filters.minMcap);
      }
      // use helper so top tokens get subscribed to pair updates
      get().setTrendingTokens(tokens);
      set({
        trendingPage: 1,
        trendingTotalRows: res.totalRows,
        trendingLoading: false,
      });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        trendingLoading: false,
      });
    }
  },
  loadNewTokens: async (opts) => {
    set({ newLoading: true, error: null });
    try {
      const { filters, newRankBy, newOrderBy } = get();
      const rankBy = opts?.rankBy ?? newRankBy ?? ("age" as SerdeRankBy);
      const orderBy = opts?.orderBy ?? newOrderBy ?? ("desc" as OrderBy);
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy,
        orderBy,
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        maxAge: filters.maxAge,
        // server-side supported filters
        minLiq: filters.minLiq ?? undefined,
        maxLiq: filters.maxLiq ?? undefined,
        minBuys24H: filters.minBuys24H ?? undefined,
        minSells24H: filters.minSells24H ?? undefined,
        minTxns24H: filters.minTxns24H ?? undefined,
        isVerified: filters.isVerified ?? undefined,
        dexes: filters.dexes ?? undefined,
        virtualDexes: filters.virtualDexes ?? undefined,
        timeFrame: filters.timeFrame ?? undefined,
        page: 1,
      };
      // notify server of the new filter so it will send scanner-pairs
      try {
        const win = window as unknown as { __dexWsClient?: WsClient };
        win.__dexWsClient?.subscribeFilter(params);
      } catch (e) {
        console.warn("subscribeFilter error", e);
      }
      const res = await fetchScanner(params);
      let tokens = res.pairs.map(mapScannerResultToTokenData);
      // client-side filter: minMcap (API does not expose minMcap param)
      if (filters.minMcap && filters.minMcap > 0) {
        tokens = tokens.filter((t) => t.mcap >= filters.minMcap);
      }
      get().setNewTokens(tokens);
      set({ newPage: 1, newTotalRows: res.totalRows, newLoading: false });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        newLoading: false,
      });
    }
  },
  loadMoreTrendingTokens: async () => {
    const state = get();
    if (state.trendingTokens.length >= state.trendingTotalRows) return;
    set({ loadingMoreTrending: true });
    try {
      const { filters, trendingPage, trendingRankBy, trendingOrderBy } = get();
      const nextPage = trendingPage + 1;
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: trendingRankBy,
        orderBy: trendingOrderBy,
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        maxAge: filters.maxAge,
        // server-side supported filters
        minLiq: filters.minLiq ?? undefined,
        maxLiq: filters.maxLiq ?? undefined,
        minBuys24H: filters.minBuys24H ?? undefined,
        minSells24H: filters.minSells24H ?? undefined,
        minTxns24H: filters.minTxns24H ?? undefined,
        isVerified: filters.isVerified ?? undefined,
        dexes: filters.dexes ?? undefined,
        virtualDexes: filters.virtualDexes ?? undefined,
        timeFrame: filters.timeFrame ?? undefined,
        page: nextPage,
      };
      const res = await fetchScanner(params);
      const more = res.pairs.map(mapScannerResultToTokenData);
      const filtered =
        filters.minMcap && filters.minMcap > 0
          ? more.filter((t) => t.mcap >= filters.minMcap)
          : more;
      // append while preventing duplicates
      const existingIds = new Set(get().trendingTokens.map((t) => t.id));
      const appended = filtered.filter((t) => !existingIds.has(t.id));
      set({
        trendingTokens: [...get().trendingTokens, ...appended],
        trendingPage: nextPage,
        trendingTotalRows: res.totalRows,
      });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "API error" });
    } finally {
      set({ loadingMoreTrending: false });
    }
  },
  loadMoreNewTokens: async () => {
    const state = get();
    if (state.newTokens.length >= state.newTotalRows) return;
    set({ loadingMoreNew: true });
    try {
      const { filters, newPage, newRankBy, newOrderBy } = get();
      const nextPage = newPage + 1;
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: newRankBy,
        orderBy: newOrderBy,
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        maxAge: filters.maxAge,
        page: nextPage,
      };
      const res = await fetchScanner(params);
      const more = res.pairs.map(mapScannerResultToTokenData);
      const existingIds = new Set(get().newTokens.map((t) => t.id));
      const appended = more.filter((t) => !existingIds.has(t.id));
      set({
        newTokens: [...get().newTokens, ...appended],
        newPage: nextPage,
        newTotalRows: res.totalRows,
      });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "API error" });
    } finally {
      set({ loadingMoreNew: false });
    }
  },
  setTrendingRankBy: (r) => set({ trendingRankBy: r }),
  setTrendingOrderBy: (o) => set({ trendingOrderBy: o }),
  setNewRankBy: (r) => set({ newRankBy: r }),
  setNewOrderBy: (o) => set({ newOrderBy: o }),
}));
