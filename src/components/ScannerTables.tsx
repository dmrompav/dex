import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./shadcn/tabs";
import { useScannerTablesStore } from "../stores/scannerTablesStore";
import { ScannerTableFilters } from "./ScannerTableFilters";
import { ScannerTable } from "./ScannerTable";
import type { TokenData, SerdeRankBy, OrderBy } from "../api/types";
import type { ColumnDef } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";

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
  const virtualDexesKey = filters.virtualDexes
    ? JSON.stringify(filters.virtualDexes)
    : "";

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
      id: "sparkline",
      header: "",
      cell: ({ row }) => {
        const history = row.original.priceHistory ?? [row.original.priceUsd];
        const values = history.length > 0 ? history : [row.original.priceUsd];
        const w = 96;
        const h = 28;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        // Build path commands for line and area
        const coords = values.map((v, i) => {
          const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
          const y = h - ((v - min) / range) * h;
          return { x, y, v };
        });

        const lineD = coords
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
          )
          .join(" ");

        // area path: move to first, line through points, line to bottom-right, bottom-left, close
        const areaD =
          coords.length > 0
            ? `${coords
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
                )
                .join(" ")} L ${w} ${h} L 0 ${h} Z`
            : "";

        const first = values[0] ?? 0;
        const last = values[values.length - 1] ?? first;
        const trend = last - first;
        const stroke = trend >= 0 ? "#10b981" : "#ef4444"; // green / red
        const fill =
          trend >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";

        const pct = first > 0 ? ((last - first) / first) * 100 : 0;
        const title = `last: $${last.toFixed(6)} (${
          pct >= 0 ? "+" : ""
        }${pct.toFixed(2)}%)`;

        // If only one point, draw a small dot to indicate value exists
        if (coords.length === 1) {
          const p = coords[0];
          return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
              <title>{title}</title>
              <circle cx={p.x} cy={p.y} r={2} fill={stroke} />
              <line
                x1={p.x - 6}
                y1={p.y}
                x2={p.x + 6}
                y2={p.y}
                stroke={stroke}
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.6}
              />
            </svg>
          );
        }

        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <title>{title}</title>
            {areaD && <path d={areaD} fill={fill} stroke="none" />}
            {lineD && (
              <path
                d={lineD}
                fill="none"
                stroke={stroke}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        );
      },
      meta: { className: "p-2 text-right" },
    },
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
                <img
                  src={t.tokenImageUri}
                  alt={t.tokenSymbol}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold">
                  {t.tokenSymbol
                    ? String(t.tokenSymbol).slice(0, 2).toUpperCase()
                    : "?"}
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
                {t.audit.freezable && (
                  <span className="text-yellow-400">F</span>
                )}
                {t.audit.honeypot && <span className="text-red-500">H</span>}
                {/* social links */}
                {t.linkTwitter && (
                  <a
                    href={t.linkTwitter}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 ml-2"
                  >
                    T
                  </a>
                )}
                {t.linkTelegram && (
                  <a
                    href={t.linkTelegram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 ml-1"
                  >
                    TG
                  </a>
                )}
                {t.linkDiscord && (
                  <a
                    href={t.linkDiscord}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 ml-1"
                  >
                    D
                  </a>
                )}
                {t.linkWebsite && (
                  <a
                    href={t.linkWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 ml-1"
                  >
                    W
                  </a>
                )}
                {t.dexPaid && (
                  <span className="ml-2 text-sm text-green-500">paid</span>
                )}
                {typeof t.migrationPc === "number" && (
                  <span className="ml-2 text-xs text-gray-300">
                    mig {t.migrationPc}%
                  </span>
                )}
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

  // Helper to download a blob as a file
  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Export TokenData[] to CSV (simple, safe quoting)
  function exportTokensToCsv(filename: string, tokens: TokenData[]) {
    const headers = [
      "tokenName",
      "tokenSymbol",
      "tokenAddress",
      "pairAddress",
      "chain",
      "exchange",
      "priceUsd",
      "volumeUsd",
      "mcap",
      "tokenCreatedTimestamp",
      "liquidityCurrent",
      "liquidityChangePc",
      "buys",
      "sells",
      "priceHistory",
    ];

    const rows = tokens.map((t) => {
      const vals = [
        t.tokenName ?? "",
        t.tokenSymbol ?? "",
        t.tokenAddress ?? "",
        t.pairAddress ?? "",
        t.chain ?? "",
        t.exchange ?? "",
        typeof t.priceUsd === "number" ? String(t.priceUsd) : "",
        typeof t.volumeUsd === "number" ? String(t.volumeUsd) : "",
        typeof t.mcap === "number" ? String(t.mcap) : "",
        t.tokenCreatedTimestamp
          ? new Date(t.tokenCreatedTimestamp).toISOString()
          : "",
        typeof t.liquidity?.current === "number"
          ? String(t.liquidity.current)
          : "",
        typeof t.liquidity?.changePc === "number"
          ? String(t.liquidity.changePc)
          : "",
        typeof t.transactions?.buys === "number"
          ? String(t.transactions.buys)
          : "0",
        typeof t.transactions?.sells === "number"
          ? String(t.transactions.sells)
          : "0",
        Array.isArray(t.priceHistory) ? t.priceHistory.join("|") : "",
      ];
      // escape quotes
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(
      filename.endsWith(".csv") ? filename : `${filename}.csv`,
      blob
    );
  }

  // Export TokenData[] to JSON
  function exportTokensToJson(filename: string, tokens: TokenData[]) {
    const blob = new Blob([JSON.stringify(tokens, null, 2)], {
      type: "application/json",
    });
    downloadBlob(
      filename.endsWith(".json") ? filename : `${filename}.json`,
      blob
    );
  }

  // Mobile/tab view component used only on small screens
  type SortArg = { id: string; desc: boolean } | null;

  interface MobileTablesViewProps {
    trendingTokens: TokenData[];
    newTokens: TokenData[];
    trendingLoading: boolean;
    newLoading: boolean;
    error: string | null;
    trendingTotalRows: number;
    newTotalRows: number;
    loadingMoreTrending: boolean;
    loadingMoreNew: boolean;
    loadMoreTrendingTokens: () => void;
    loadMoreNewTokens: () => void;
    exportTokensToCsv: (filename: string, tokens: TokenData[]) => void;
    exportTokensToJson: (filename: string, tokens: TokenData[]) => void;
    columns: ColumnDef<TokenData, unknown>[];
    value: string;
    onValueChange: (v: string) => void;
    onTrendingSort: (s: SortArg) => void;
    onNewSort: (s: SortArg) => void;
  }

  function MobileTablesView(props: MobileTablesViewProps) {
    return (
      <Tabs
        value={props.value}
        onValueChange={props.onValueChange}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        <TabsContent value="trending">
          <div className="flex items-center justify-between mb-2">
            <div />
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  props.exportTokensToCsv(
                    "trending_tokens.csv",
                    props.trendingTokens
                  )
                }
              >
                CSV
              </button>
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  props.exportTokensToJson(
                    "trending_tokens.json",
                    props.trendingTokens
                  )
                }
              >
                JSON
              </button>
            </div>
          </div>
          <ScannerTable
            columns={props.columns}
            data={props.trendingTokens}
            title=""
            loading={props.trendingLoading}
            error={props.error}
            hasMore={props.trendingTokens.length < props.trendingTotalRows}
            onLoadMore={props.loadMoreTrendingTokens}
            loadingMore={props.loadingMoreTrending}
            onServerSort={props.onTrendingSort}
            sortable={true}
          />
        </TabsContent>

        <TabsContent value="new">
          <div className="flex items-center justify-between mb-2">
            <div />
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  props.exportTokensToCsv("new_tokens.csv", props.newTokens)
                }
              >
                CSV
              </button>
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  props.exportTokensToJson("new_tokens.json", props.newTokens)
                }
              >
                JSON
              </button>
            </div>
          </div>
          <ScannerTable
            columns={props.columns}
            data={props.newTokens}
            title=""
            loading={props.newLoading}
            error={props.error}
            hasMore={props.newTokens.length < props.newTotalRows}
            onLoadMore={props.loadMoreNewTokens}
            loadingMore={props.loadingMoreNew}
            onServerSort={props.onNewSort}
            sortable={false}
          />
        </TabsContent>
      </Tabs>
    );
  }

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // keep mobile tab selection at top-level so it doesn't reset on re-renders
  const [mobileTab, setMobileTab] = useState<string>("trending");

  return (
    <div className="flex flex-col gap-4 w-full grow-1">
      {/* Фильтры */}
      <div className="flex items-center justify-between gap-4">
        {/* Desktop / tablet inline filters */}
        <div className="hidden md:block w-full">
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
            setMinBuys24H={(v) =>
              setFilters({ ...filters, minBuys24H: v ?? null })
            }
            setMinSells24H={(v) =>
              setFilters({ ...filters, minSells24H: v ?? null })
            }
            setMinTxns24H={(v) =>
              setFilters({ ...filters, minTxns24H: v ?? null })
            }
            setIsVerified={(v) =>
              setFilters({ ...filters, isVerified: v ?? null })
            }
            setTimeFrame={(v) =>
              setFilters({ ...filters, timeFrame: v ?? null })
            }
          />
        </div>

        {/* Mobile / tablet: burger button opens slide-over with filters */}
        <div className="block md:hidden">
          <button
            className="!p-1 !px-2 rounded bg-gray-800 text-white flex gap-2 items-center"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Mobile slide-over for filters */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="ml-auto w-full sm:w-3/4 max-w-md bg-gray-900 p-4 h-full overflow-auto z-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button
                className="px-2 py-1 rounded bg-gray-700 text-white"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                Close
              </button>
            </div>
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
              setMinVolume={(minVolume) =>
                setFilters({ ...filters, minVolume })
              }
              setMaxAge={(maxAge) => setFilters({ ...filters, maxAge })}
              setExcludeHoneypots={(excludeHoneypots) =>
                setFilters({ ...filters, excludeHoneypots })
              }
              setMinMcap={(mcap) => setFilters({ ...filters, minMcap: mcap })}
              setMinLiq={(v) => setFilters({ ...filters, minLiq: v ?? null })}
              setMaxLiq={(v) => setFilters({ ...filters, maxLiq: v ?? null })}
              setMinBuys24H={(v) =>
                setFilters({ ...filters, minBuys24H: v ?? null })
              }
              setMinSells24H={(v) =>
                setFilters({ ...filters, minSells24H: v ?? null })
              }
              setMinTxns24H={(v) =>
                setFilters({ ...filters, minTxns24H: v ?? null })
              }
              setIsVerified={(v) =>
                setFilters({ ...filters, isVerified: v ?? null })
              }
              setTimeFrame={(v) =>
                setFilters({ ...filters, timeFrame: v ?? null })
              }
            />
          </div>
        </div>
      )}

      {/* Таблицы */}
      {/* Mobile / Tablet: show as tabs (single table view) */}
      <div className="block md:hidden">
        <MobileTablesView
          trendingTokens={trendingTokens}
          newTokens={newTokens}
          trendingLoading={trendingLoading}
          newLoading={newLoading}
          error={error}
          trendingTotalRows={trendingTotalRows}
          newTotalRows={newTotalRows}
          loadingMoreTrending={loadingMoreTrending}
          loadingMoreNew={loadingMoreNew}
          loadMoreTrendingTokens={loadMoreTrendingTokens}
          loadMoreNewTokens={loadMoreNewTokens}
          exportTokensToCsv={exportTokensToCsv}
          exportTokensToJson={exportTokensToJson}
          columns={columns}
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v)}
          onTrendingSort={(sort) => {
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
          onNewSort={(sort) => {
            if (!sort) return;
            const rankBy = (columnIdToRankBy(sort.id) ?? "age") as SerdeRankBy;
            const orderBy = (sort.desc ? "desc" : "asc") as OrderBy;
            loadNewTokens({ rankBy, orderBy });
          }}
        />
      </div>

      {/* Desktop / Large: two tables side-by-side */}
      <div className="hidden md:flex gap-4 w-full grow-1">
        <div className="w-1/2 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Trending Tokens</h2>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  exportTokensToCsv("trending_tokens.csv", trendingTokens)
                }
              >
                CSV
              </button>
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() =>
                  exportTokensToJson("trending_tokens.json", trendingTokens)
                }
              >
                JSON
              </button>
            </div>
          </div>
          <ScannerTable
            columns={columns}
            data={trendingTokens}
            title=""
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
        <div className="w-1/2 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">New Tokens</h2>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() => exportTokensToCsv("new_tokens.csv", newTokens)}
              >
                CSV
              </button>
              <button
                className="px-3 py-1 bg-gray-100 rounded text-sm"
                onClick={() => exportTokensToJson("new_tokens.json", newTokens)}
              >
                JSON
              </button>
            </div>
          </div>
          <ScannerTable
            columns={columns}
            data={newTokens}
            title=""
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
