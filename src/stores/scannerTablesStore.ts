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
  setFilters: (filters: Partial<ScannerTablesState["filters"]>) => void;
  setTrendingTokens: (tokens: TokenData[]) => void;
  setNewTokens: (tokens: TokenData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadTokens: () => Promise<void>;
}

export const useScannerTablesStore = create<ScannerTablesState>((set, get) => ({
  trendingTokens: [],
  newTokens: [],
  loading: false,
  error: null,
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
      set({ trendingTokens });

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
      set({ newTokens });
      set({ loading: false });
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : "API error",
        loading: false,
      });
    }
  },
}));
