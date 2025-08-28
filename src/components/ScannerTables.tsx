import { useEffect } from "react";
import { useScannerTablesStore } from "../stores/scannerTablesStore";
import { ScannerTableFilters } from "./ScannerTableFilters";
import { ScannerTable } from "./ScannerTable";
import type { TokenData, SerdeRankBy, OrderBy } from "../api/types";
import type { ColumnDef } from "@tanstack/react-table";

// Helper: return css class for pcs value
const getPcsClass = (val: number) =>
  val > 0 ? "text-green-600" : val < 0 ? "text-red-600" : "";

// Helper: format pcs value, show '-' when NaN
const formatPcsValue = (val: number) => (Number.isNaN(val) ? "-" : `${val}%`);

const ScannerTables = () => {
  // Additional imports for new columns
  const {
    trendingTokens,
    newTokens,
    // global loading removed in favor of per-table flags
    trendingLoading,
    newLoading,
    error,
    filters,
    setFilters,
    loadTokens,
    loadMoreTrendingTokens,
    loadMoreNewTokens,
    trendingTotalRows,
    newTotalRows,
    loadingMoreTrending,
    loadingMoreNew,
    loadTrendingTokens,
    loadNewTokens,
    setTrendingRankBy,
    setTrendingOrderBy,
  } = useScannerTablesStore();

  // stable keys for array filters to use in deps
  const dexesKey = filters.dexes ? JSON.stringify(filters.dexes) : "";
  const virtualDexesKey = filters.virtualDexes ? JSON.stringify(filters.virtualDexes) : "";

  // Load tokens on filter change — include all filter fields so new controls trigger reload
  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.chain,
    filters.minVolume,
    filters.maxAge,
    filters.excludeHoneypots,
    filters.minMcap,
    filters.minLiq,
    filters.maxLiq,
    filters.minBuys24H,
    filters.minSells24H,
    filters.minTxns24H,
    filters.isVerified,
    filters.timeFrame,
    dexesKey,
    virtualDexesKey,
  ]);

  const columns: ColumnDef<TokenData, unknown>[] = [
    {
      accessorKey: "tokenName",
      header: "Token",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {t.tokenImageUri ? (
                // show image when available
                <img src={t.tokenImageUri} alt={t.tokenSymbol} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">
                  {t.tokenSymbol ? String(t.tokenSymbol).slice(0, 2).toUpperCase() : "?"}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.tokenName}</span>
                <span className="text-xs text-gray-500">({t.tokenSymbol})</span>
                <span className="ml-2 text-[10px] font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {t.chain}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{t.exchange}</span>
                {/* Inline audit badges */}
                {t.audit.contractVerified && (
                  <span className="text-green-500">✔</span>
                )}
                {t.audit.mintable && <span className="text-yellow-400">M</span>}
                {t.audit.freezable && <span className="text-yellow-400">F</span>}
                {t.audit.honeypot && <span className="text-red-500">H</span>}
              </div>
            </div>
          </div>
        );
      },
      meta: { className: "p-2 text-left" },
    },
    {
      accessorKey: "chain",
      header: "Chain",
      cell: ({ getValue }) => String(getValue()),
      meta: { className: "p-2 text-center" },
    },
    {
      accessorKey: "exchange",
      header: "Exchange",
      cell: ({ getValue }) => String(getValue()),
      meta: { className: "p-2 text-center" },
    },
    {
      accessorKey: "priceUsd",
      header: "Price",
      cell: ({ getValue }) => {
        const value = getValue();
        return typeof value === "number" ? value.toFixed(4) : "0.0000";
      },
      meta: { className: "p-2 text-right" },
    },
    {
      accessorKey: "volumeUsd",
      header: "Volume",
      cell: ({ getValue }) => {
        const value = getValue();
        return isNaN(Number(value)) ? "0" : Number(value).toLocaleString();
      },
      meta: { className: "p-2 text-right" },
    },
    {
      accessorKey: "mcap",
      header: "Mcap",
      cell: ({ getValue }) => {
        const value = getValue();
        return isNaN(Number(value)) ? "0" : Number(value).toLocaleString();
      },
      meta: { className: "p-2 text-right" },
    },
    {
      id: "priceChangePcs",
      header: "Price Change",
      cell: ({ row }) => {
        const pcs = row.original.priceChangePcs;

        return (
          <div className="flex gap-1 text-xs">
            <span className={getPcsClass(pcs["5m"])}>
              {formatPcsValue(pcs["5m"])}
            </span>
            <span className={getPcsClass(pcs["1h"])}>
              {formatPcsValue(pcs["1h"])}
            </span>
            <span className={getPcsClass(pcs["6h"])}>
              {formatPcsValue(pcs["6h"])}
            </span>
            <span className={getPcsClass(pcs["24h"])}>
              {formatPcsValue(pcs["24h"])}
            </span>
          </div>
        );
      },
      meta: { className: "p-2 text-right" },
    },
    {
      id: "age",
      header: "Age",
      cell: ({ row }) => {
        const created = row.original.tokenCreatedTimestamp;
        if (!created) return "-";
        const now = Date.now();
        const ageMs = now - new Date(created).getTime();
        const ageHrs = Math.floor(ageMs / 1000 / 60 / 60);
        return `${ageHrs}h`;
      },
      meta: { className: "p-2 text-right" },
    },
    {
      id: "buysSells",
      header: "Buys/Sells",
      cell: ({ row }) => {
        const tx = row.original.transactions;
        return (
          <span>
            {tx.buys}/{tx.sells}
          </span>
        );
      },
      meta: { className: "p-2 text-center" },
    },
    {
      id: "liquidity",
      header: "Liquidity",
      cell: ({ row }) => {
        const lq = row.original.liquidity;
        return (
          <span>
            {lq.current.toLocaleString()} ({lq.changePc}%)
          </span>
        );
      },
      meta: { className: "p-2 text-right" },
    },
    {
      id: "audit",
      header: "Audit",
      cell: ({ row }) => {
        const audit = row.original.audit;
        return (
          <div className="flex gap-1 text-xs">
            {audit.contractVerified && (
              <span className="text-green-600">✔️</span>
            )}
            {audit.mintable && (
              <span className="text-yellow-600">Mintable</span>
            )}
            {audit.freezable && (
              <span className="text-yellow-600">Freezable</span>
            )}
            {audit.honeypot && <span className="text-red-600">Honeypot</span>}
          </div>
        );
      },
      meta: { className: "p-2 text-center" },
    },
  ];

  // map column id/accessor to server-side rankBy value
  const columnIdToRankBy = (id: string): string | null => {
    switch (id) {
      case "volumeUsd":
      case "volume":
        return "volume";
      case "age":
        return "age";
      case "mcap":
        return "mcap";
      case "priceUsd":
        return "price24H"; // best-effort mapping
      case "buysSells":
      case "buys":
        return "buys";
      case "liquidity":
        return "liquidity";
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Фильтры */}
      <ScannerTableFilters
        chain={filters.chain}
        minVolume={filters.minVolume}
        maxAge={filters.maxAge}
        excludeHoneypots={filters.excludeHoneypots}
        minMcap={filters.minMcap}
        minLiq={filters.minLiq}
        maxLiq={filters.maxLiq}
        minBuys24H={filters.minBuys24H}
        minSells24H={filters.minSells24H}
        minTxns24H={filters.minTxns24H}
        isVerified={filters.isVerified}
        timeFrame={filters.timeFrame ?? null}
        setChain={(chain) =>
          setFilters({ ...filters, chain: chain as typeof filters.chain })
        }
        setMinVolume={(minVolume) => setFilters({ ...filters, minVolume })}
        setMaxAge={(maxAge) => setFilters({ ...filters, maxAge })}
        setExcludeHoneypots={(excludeHoneypots) =>
          setFilters({ ...filters, excludeHoneypots })
        }
        setMinMcap={(mcap) => setFilters({ ...filters, minMcap: mcap })}
        setMinLiq={(v) => setFilters({ ...filters, minLiq: v ?? null })}
        setMaxLiq={(v) => setFilters({ ...filters, maxLiq: v ?? null })}
        setMinBuys24H={(v) => setFilters({ ...filters, minBuys24H: v ?? null })}
        setMinSells24H={(v) => setFilters({ ...filters, minSells24H: v ?? null })}
        setMinTxns24H={(v) => setFilters({ ...filters, minTxns24H: v ?? null })}
        setIsVerified={(v) => setFilters({ ...filters, isVerified: v ?? null })}
        setTimeFrame={(v) => setFilters({ ...filters, timeFrame: v ?? null })}
      />
      {/* Таблицы */}
      <div className="flex gap-4">
        <div className="w-1/2">
          <ScannerTable
            columns={columns}
            data={trendingTokens}
            title="Trending Tokens"
            loading={trendingLoading}
            error={error}
            hasMore={trendingTokens.length < trendingTotalRows}
            onLoadMore={() => loadMoreTrendingTokens()}
            loadingMore={loadingMoreTrending}
            onServerSort={(sort) => {
              // if sort cleared, reset to defaults
              if (!sort) {
                setTrendingRankBy("volume");
                setTrendingOrderBy("desc");
                loadTrendingTokens({ rankBy: "volume", orderBy: "desc" });
                return;
              }
              const rankBy = (columnIdToRankBy(sort.id) ??
                "volume") as SerdeRankBy;
              const orderBy = (sort.desc ? "desc" : "asc") as OrderBy;
              setTrendingRankBy(rankBy);
              setTrendingOrderBy(orderBy);
              loadTrendingTokens({ rankBy, orderBy });
            }}
            sortable={true}
          />
        </div>
        <div className="w-1/2">
          <ScannerTable
            columns={columns}
            data={newTokens}
            title="New Tokens"
            loading={newLoading}
            error={error}
            hasMore={newTokens.length < newTotalRows}
            onLoadMore={() => loadMoreNewTokens()}
            loadingMore={loadingMoreNew}
            onServerSort={(sort) => {
              if (!sort) return;
              const rankBy = (columnIdToRankBy(sort.id) ??
                "age") as SerdeRankBy;
              const orderBy = (sort.desc ? "desc" : "asc") as OrderBy;
              loadNewTokens({ rankBy, orderBy });
            }}
            sortable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ScannerTables;
