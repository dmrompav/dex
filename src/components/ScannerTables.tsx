import { useEffect } from "react";
import { useScannerTablesStore } from "../stores/scannerTablesStore";
import { ScannerTableFilters } from "./ScannerTableFilters";
import { ScannerTable } from "./ScannerTable";
import type { TokenData } from "../api/types";

const ScannerTables = () => {
  const {
    trendingTokens,
    newTokens,
    loading,
    error,
    filters,
    setFilters,
    loadTokens,
  } = useScannerTablesStore();

  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.chain,
    filters.minVolume,
    filters.maxAge,
    filters.excludeHoneypots,
  ]);

  // Описание колонок для таблицы
  const columns: {
    key: string;
    header: string;
    render: (t: TokenData) => React.ReactNode;
    className?: string;
  }[] = [
    {
      key: "token",
      header: "Token",
      render: (t) => (
        <>
          {t.tokenName}{" "}
          <span className="text-xs text-gray-500">({t.tokenSymbol})</span>
        </>
      ),
      className: "p-2 text-left",
    },
    {
      key: "priceUsd",
      header: "Price",
      render: (t) => (t.priceUsd ? t.priceUsd.toFixed(4) : "0.0000"),
      className: "p-2 text-right",
    },
    {
      key: "volumeUsd",
      header: "Volume",
      render: (t) =>
        isNaN(Number(t.volumeUsd)) ? "-" : Number(t.volumeUsd).toLocaleString(),
      className: "p-2 text-right",
    },
    {
      key: "mcap",
      header: "Mcap",
      render: (t) =>
        isNaN(Number(t.mcap)) ? "0" : Number(t.mcap).toLocaleString(),
      className: "p-2 text-right",
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
          />
        </div>
        <div className="w-1/2">
          <ScannerTable
            columns={columns}
            data={newTokens}
            title="New Tokens"
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default ScannerTables;
