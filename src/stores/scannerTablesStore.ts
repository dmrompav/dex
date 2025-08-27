import type {
  TokenData,
  SupportedChainName,
  GetScannerResultParams,
  SerdeRankBy,
  OrderBy,
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
    minMcap: number;
    excludeHoneypots: boolean;
  };
  // pagination state
  trendingPage: number;
  newPage: number;
  trendingTotalRows: number;
  newTotalRows: number;
  loadingMoreTrending: boolean;
  loadingMoreNew: boolean;
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
  loadTrendingTokens: (opts?: { rankBy?: SerdeRankBy; orderBy?: OrderBy }) => Promise<void>;
  loadNewTokens: (opts?: { rankBy?: SerdeRankBy; orderBy?: OrderBy }) => Promise<void>;
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
  },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setTrendingTokens: (tokens) => set({ trendingTokens: tokens }),
  setNewTokens: (tokens) => set({ newTokens: tokens }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  loadTokens: async () => {
    // load both tables using per-table rank/order preferences
    set({ loading: true, error: null });
    try {
      await get().loadTrendingTokens();
      await get().loadNewTokens();
      set({ loading: false });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        loading: false,
      });
    }
  },
  loadTrendingTokens: async (opts) => {
    set({ loading: true, error: null });
    try {
      const { filters, trendingRankBy, trendingOrderBy } = get();
      const rankBy = opts?.rankBy ?? trendingRankBy ?? ("volume" as SerdeRankBy);
      const orderBy = opts?.orderBy ?? trendingOrderBy ?? ("desc" as OrderBy);
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy,
        orderBy,
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        maxAge: filters.maxAge,
        page: 1,
      };
      const res = await fetchScanner(params);
      const tokens = res.pairs.map(mapScannerResultToTokenData);
      set({ trendingTokens: tokens, trendingPage: 1, trendingTotalRows: res.totalRows });
      set({ loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "API error", loading: false });
    }
  },
  loadNewTokens: async (opts) => {
    set({ loading: true, error: null });
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
        page: 1,
      };
      const res = await fetchScanner(params);
      const tokens = res.pairs.map(mapScannerResultToTokenData);
      set({ newTokens: tokens, newPage: 1, newTotalRows: res.totalRows });
      set({ loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "API error", loading: false });
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
        page: nextPage,
      };
      const res = await fetchScanner(params);
      const more = res.pairs.map(mapScannerResultToTokenData);
      // append while preventing duplicates
      const existingIds = new Set(get().trendingTokens.map((t) => t.id));
      const appended = more.filter((t) => !existingIds.has(t.id));
      set({ trendingTokens: [...get().trendingTokens, ...appended], trendingPage: nextPage, trendingTotalRows: res.totalRows });
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
      set({ newTokens: [...get().newTokens, ...appended], newPage: nextPage, newTotalRows: res.totalRows });
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
