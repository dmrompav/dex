import type {
  TokenData,
  SupportedChainName,
  GetScannerResultParams,
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
  setFilters: (filters: Partial<ScannerTablesState["filters"]>) => void;
  setTrendingTokens: (tokens: TokenData[]) => void;
  setNewTokens: (tokens: TokenData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadTokens: () => Promise<void>;
  loadMoreTrendingTokens: () => Promise<void>;
  loadMoreNewTokens: () => Promise<void>;
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
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      // Trending Tokens: сортировка по volume
      const trendingParams: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: "volume",
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        // minMcap: filters.minMcap, // нет такого поля в GetScannerResultParams
        maxAge: filters.maxAge,
        page: 1,
      };
      const trendingRes = await fetchScanner(trendingParams);
      const trendingTokens = trendingRes.pairs.map(mapScannerResultToTokenData);
      // reset pagination state for trending
      set({ trendingTokens, trendingPage: 1, trendingTotalRows: trendingRes.totalRows });

      // New Tokens: сортировка по age
      const newParams: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: "age",
        isNotHP: filters.excludeHoneypots,
        minVol24H: filters.minVolume,
        // minMcap: filters.minMcap, // нет такого поля в GetScannerResultParams
        maxAge: filters.maxAge,
        page: 1,
      };
      const newRes = await fetchScanner(newParams);
      const newTokens = newRes.pairs.map(mapScannerResultToTokenData);
      // reset pagination state for new tokens
      set({ newTokens, newPage: 1, newTotalRows: newRes.totalRows });
      set({ loading: false });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        loading: false,
      });
    }
  },
  loadMoreTrendingTokens: async () => {
    const state = get();
    if (state.trendingTokens.length >= state.trendingTotalRows) return;
    set({ loadingMoreTrending: true });
    try {
      const { filters, trendingPage } = get();
      const nextPage = trendingPage + 1;
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: "volume",
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
      const { filters, newPage } = get();
      const nextPage = newPage + 1;
      const params: GetScannerResultParams = {
        chain: filters.chain,
        rankBy: "age",
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
}));
