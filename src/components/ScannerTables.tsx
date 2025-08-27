import { useEffect } from "react";
import { useScannerTablesStore } from "../stores/scannerTablesStore";
import { ScannerTableFilters } from "./ScannerTableFilters";
import { ScannerTable } from "./ScannerTable";
import type { TokenData } from "../api/types";
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
    loading,
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
  } = useScannerTablesStore();

  // Load tokens on filter change
  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.chain,
    filters.minVolume,
    filters.maxAge,
    filters.excludeHoneypots,
  ]);

  const columns: ColumnDef<TokenData, unknown>[] = [
    {
      accessorKey: "tokenName",
      header: "Token",
      cell: ({ row }) => (
        <>
          {row.original.tokenName}{" "}
          <span className="text-xs text-gray-500">
            ({row.original.tokenSymbol})
          </span>
        </>
      ),
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

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Фильтры */}
      <ScannerTableFilters
        chain={filters.chain}
        minVolume={filters.minVolume}
        maxAge={filters.maxAge}
        excludeHoneypots={filters.excludeHoneypots}
        setChain={(chain) =>
          setFilters({ ...filters, chain: chain as typeof filters.chain })
        }
        setMinVolume={(minVolume) => setFilters({ ...filters, minVolume })}
        setMaxAge={(maxAge) => setFilters({ ...filters, maxAge })}
        setExcludeHoneypots={(excludeHoneypots) =>
          setFilters({ ...filters, excludeHoneypots })
        }
      />
      {/* Таблицы */}
      <div className="flex gap-4">
        <div className="w-1/2">
          <ScannerTable
            columns={columns}
            data={trendingTokens}
            title="Trending Tokens"
            loading={loading}
            error={error}
            hasMore={trendingTokens.length < trendingTotalRows}
            onLoadMore={() => loadMoreTrendingTokens()}
            loadingMore={loadingMoreTrending}
          />
        </div>
        <div className="w-1/2">
          <ScannerTable
            columns={columns}
            data={newTokens}
            title="New Tokens"
            loading={loading}
            error={error}
            hasMore={newTokens.length < newTotalRows}
            onLoadMore={() => loadMoreNewTokens()}
            loadingMore={loadingMoreNew}
          />
        </div>
      </div>
    </div>
  );
};

export default ScannerTables;
