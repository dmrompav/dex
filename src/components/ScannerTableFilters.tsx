import React from "react";
import type { SupportedChainName } from "../api/types";

export interface ScannerTableFiltersProps {
  chain: SupportedChainName;
  minVolume: number;
  maxAge: number;
  excludeHoneypots: boolean;
  onChange: (filters: Partial<ScannerTableFiltersProps>) => void;
}

const ScannerTableFilters: React.FC<ScannerTableFiltersProps> = ({
  chain,
  minVolume,
  maxAge,
  excludeHoneypots,
  onChange,
}) => {
  return (
    <div className="flex gap-4 items-center mb-2">
      <select
        value={chain}
        onChange={(e) =>
          onChange({ chain: e.target.value as SupportedChainName })
        }
        className="border rounded px-2 py-1"
      >
        <option value="ETH">ETH</option>
        <option value="SOL">SOL</option>
        <option value="BASE">BASE</option>
        <option value="BSC">BSC</option>
      </select>
      <input
        type="number"
        min={0}
        value={minVolume}
        onChange={(e) => onChange({ minVolume: Number(e.target.value) })}
        placeholder="Min Volume"
        className="border rounded px-2 py-1 w-32"
      />
      <input
        type="number"
        min={0}
        value={maxAge}
        onChange={(e) => onChange({ maxAge: Number(e.target.value) })}
        placeholder="Max Age (sec)"
        className="border rounded px-2 py-1 w-32"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={excludeHoneypots}
          onChange={(e) => onChange({ excludeHoneypots: e.target.checked })}
        />
        Exclude Honeypots
      </label>
    </div>
  );
};

export default ScannerTableFilters;
