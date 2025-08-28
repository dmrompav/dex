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
import { create } from "zustand";

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
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setTrendingTokens: (tokens) => set({ trendingTokens: tokens }),
  setNewTokens: (tokens) => set({ newTokens: tokens }),
  // setLoading kept for backwards compatibility: sets global and per-table flags
  setLoading: (loading) =>
    set({ loading, trendingLoading: loading, newLoading: loading }),
  setError: (error) => set({ error }),
  loadTokens: async () => {
    // load both tables using per-table rank/order preferences
    set({ error: null, trendingLoading: true, newLoading: true });
    try {
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
      const res = await fetchScanner(params);
      let tokens = res.pairs.map(mapScannerResultToTokenData);
      // client-side filter: minMcap (API does not expose minMcap param)
      if (filters.minMcap && filters.minMcap > 0) {
        tokens = tokens.filter((t) => t.mcap >= filters.minMcap);
      }
      set({
        trendingTokens: tokens,
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
      const res = await fetchScanner(params);
      let tokens = res.pairs.map(mapScannerResultToTokenData);
      // client-side filter: minMcap (API does not expose minMcap param)
      if (filters.minMcap && filters.minMcap > 0) {
        tokens = tokens.filter((t) => t.mcap >= filters.minMcap);
      }
      set({
        newTokens: tokens,
        newPage: 1,
        newTotalRows: res.totalRows,
        newLoading: false,
      });
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
        const filtered = filters.minMcap && filters.minMcap > 0 ? more.filter((t)=>t.mcap>=filters.minMcap) : more;
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
