import React, { useEffect } from "react";
import { useScannerTablesStore } from "../stores/scannerTablesStore";

const ScannerTables: React.FC = () => {
  // Получаем данные и фильтры из стора
  const { trendingTokens, newTokens, loading, error, filters, setFilters, loadTokens } =
    useScannerTablesStore();

  // Загружаем токены при маунте и изменении фильтров
  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.chain, filters.minVolume, filters.maxAge, filters.excludeHoneypots]);

  // TODO: Реализация фильтров, таблиц, загрузки, ошибок, WebSocket и API

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Фильтры */}
      <div className="flex gap-4 items-center">
        {/* Пример фильтра по chain */}
        <select
          value={filters.chain}
          onChange={(e) => setFilters({ chain: e.target.value as import("../api/types").SupportedChainName })}
          className="border rounded px-2 py-1"
        >
          <option value="ETH">ETH</option>
          <option value="SOL">SOL</option>
          <option value="BASE">BASE</option>
          <option value="BSC">BSC</option>
        </select>
        {/* Остальные фильтры... */}
      </div>
      {/* Таблицы */}
      <div className="flex gap-4">
        <div className="w-1/2">
          <h2 className="font-bold mb-2">Trending Tokens</h2>
          <div className="border rounded bg-white min-h-[400px]">
            {trendingTokens.length === 0 && !loading && !error && (
              <div className="p-4 text-gray-400">Нет данных</div>
            )}
            {trendingTokens.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Token</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Volume</th>
                    <th className="p-2 text-right">Mcap</th>
                  </tr>
                </thead>
                <tbody>
                  {trendingTokens.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-2">{t.tokenName} <span className="text-xs text-gray-500">({t.tokenSymbol})</span></td>
                      <td className="p-2 text-right">{t.priceUsd.toFixed(4)}</td>
                      <td className="p-2 text-right">{t.volumeUsd.toLocaleString()}</td>
                      <td className="p-2 text-right">{t.mcap.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="w-1/2">
          <h2 className="font-bold mb-2">New Tokens</h2>
          <div className="border rounded bg-white min-h-[400px]">
            {newTokens.length === 0 && !loading && !error && (
              <div className="p-4 text-gray-400">Нет данных</div>
            )}
            {newTokens.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Token</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Volume</th>
                    <th className="p-2 text-right">Mcap</th>
                  </tr>
                </thead>
                <tbody>
                  {newTokens.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-2">{t.tokenName} <span className="text-xs text-gray-500">({t.tokenSymbol})</span></td>
                      <td className="p-2 text-right">{t.priceUsd.toFixed(4)}</td>
                      <td className="p-2 text-right">{t.volumeUsd.toLocaleString()}</td>
                      <td className="p-2 text-right">{t.mcap.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {/* Loading/Error/Empty states */}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default ScannerTables;
