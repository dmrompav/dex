import { Input } from "../components/shadcn/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/shadcn/select";
import { Label } from "../components/shadcn/label";
import { Button } from "./shadcn/button";
import { useEffect, useState } from "react";
import type { TimeFrame } from "../api/types";

export interface ScannerTableFiltersProps {
  chain: string;
  minVolume: number;
  maxAge: number;
  excludeHoneypots: boolean;
  minMcap: number;
  minLiq?: number | null;
  maxLiq?: number | null;
  minBuys24H?: number | null;
  minSells24H?: number | null;
  minTxns24H?: number | null;
  isVerified?: boolean | null;
  timeFrame?: TimeFrame | null;
  setChain: (chain: string) => void;
  setMinVolume: (volume: number) => void;
  setMaxAge: (age: number) => void;
  setExcludeHoneypots: (exclude: boolean) => void;
  setMinMcap: (mcap: number) => void;
  setMinLiq?: (v: number | null) => void;
  setMaxLiq?: (v: number | null) => void;
  setMinBuys24H?: (v: number | null) => void;
  setMinSells24H?: (v: number | null) => void;
  setMinTxns24H?: (v: number | null) => void;
  setIsVerified?: (v: boolean | null) => void;
  setTimeFrame?: (v: TimeFrame | null) => void;
}

// Функция для очистки ведущих нулей и преобразования в число
const cleanNumberInput = (value: string): number => {
  // Убираем все нецифровые символы, кроме точки
  const numericOnly = value.replace(/[^\d.]/g, "");

  // Убираем ведущие нули, но оставляем один ноль если это единственная цифра
  const cleaned = numericOnly.replace(/^0+(?=\d)/, "");

  // Если после очистки пустая строка, возвращаем 0
  if (cleaned === "" || cleaned === ".") {
    return 0;
  }

  // Преобразуем в число
  const result = Number(cleaned);
  return isNaN(result) ? 0 : result;
};

export const ScannerTableFilters = ({
  chain,
  minVolume,
  maxAge,
  excludeHoneypots,
  setChain,
  setMinVolume,
  setMaxAge,
  setExcludeHoneypots,
  minMcap,
  minLiq,
  maxLiq,
  minBuys24H,
  minSells24H,
  minTxns24H,
  isVerified,
  timeFrame,
  setMinMcap,
  setMinLiq,
  setMaxLiq,
  setMinBuys24H,
  setMinSells24H,
  setMinTxns24H,
  setIsVerified,
  setTimeFrame,
}: ScannerTableFiltersProps) => {
  // Локальное состояние для дебаунса
  const [localMinVolume, setLocalMinVolume] = useState(minVolume);
  const [localMaxAge, setLocalMaxAge] = useState(maxAge);
  const [localMinMcap, setLocalMinMcap] = useState<number>(minMcap ?? 0);
  const [localMinLiq, setLocalMinLiq] = useState<number | "">(
    minLiq != null ? minLiq : ""
  );
  const [localMaxLiq, setLocalMaxLiq] = useState<number | "">(
    maxLiq != null ? maxLiq : ""
  );
  const [localMinBuys24H, setLocalMinBuys24H] = useState<number | "">(
    minBuys24H != null ? minBuys24H : ""
  );
  const [localMinSells24H, setLocalMinSells24H] = useState<number | "">(
    minSells24H != null ? minSells24H : ""
  );
  const [localMinTxns24H, setLocalMinTxns24H] = useState<number | "">(
    minTxns24H != null ? minTxns24H : ""
  );

  // Дебаунс для minVolume
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMinVolume !== minVolume) {
        setMinVolume(localMinVolume);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localMinVolume, minVolume, setMinVolume]);

  // Дебаунс для maxAge
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMaxAge !== maxAge) {
        setMaxAge(localMaxAge);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localMaxAge, maxAge, setMaxAge]);

  // Debounce for minMcap
  useEffect(() => {
    const t = setTimeout(() => {
      if (localMinMcap !== minMcap) {
        setMinMcap(localMinMcap);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [localMinMcap, minMcap, setMinMcap]);

  // Debounce for minLiq
  useEffect(() => {
    const t = setTimeout(() => {
      const val = localMinLiq === "" ? null : Number(localMinLiq);
      if (setMinLiq && val !== minLiq) setMinLiq(val);
    }, 300);
    return () => clearTimeout(t);
  }, [localMinLiq, minLiq, setMinLiq]);

  // Debounce for maxLiq
  useEffect(() => {
    const t = setTimeout(() => {
      const val = localMaxLiq === "" ? null : Number(localMaxLiq);
      if (setMaxLiq && val !== maxLiq) setMaxLiq(val);
    }, 300);
    return () => clearTimeout(t);
  }, [localMaxLiq, maxLiq, setMaxLiq]);

  // Debounce for minBuys24H
  useEffect(() => {
    const t = setTimeout(() => {
      const val = localMinBuys24H === "" ? null : Number(localMinBuys24H);
      if (setMinBuys24H && val !== minBuys24H) setMinBuys24H(val);
    }, 300);
    return () => clearTimeout(t);
  }, [localMinBuys24H, minBuys24H, setMinBuys24H]);

  // Debounce for minSells24H
  useEffect(() => {
    const t = setTimeout(() => {
      const val = localMinSells24H === "" ? null : Number(localMinSells24H);
      if (setMinSells24H && val !== minSells24H) setMinSells24H(val);
    }, 300);
    return () => clearTimeout(t);
  }, [localMinSells24H, minSells24H, setMinSells24H]);

  // Debounce for minTxns24H
  useEffect(() => {
    const t = setTimeout(() => {
      const val = localMinTxns24H === "" ? null : Number(localMinTxns24H);
      if (setMinTxns24H && val !== minTxns24H) setMinTxns24H(val);
    }, 300);
    return () => clearTimeout(t);
  }, [localMinTxns24H, minTxns24H, setMinTxns24H]);

  // Синхронизация локального состояния с пропсами
  useEffect(() => {
    setLocalMinVolume(minVolume);
  }, [minVolume]);

  useEffect(() => {
    setLocalMaxAge(maxAge);
  }, [maxAge]);

  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-gray-800 rounded-lg">
      <div className="flex flex-col gap-1">
        <Label htmlFor="chain">Chain</Label>
        <Select value={chain} onValueChange={setChain}>
          <SelectTrigger
            id="chain"
            className="w-[120px] border bg-gray-800 border-gray-800"
          >
            <SelectValue placeholder="Select chain" />
          </SelectTrigger>
          <SelectContent className="border bg-gray-900 border-gray-700">
            <SelectItem value="ETH">ETH</SelectItem>
            <SelectItem value="SOL">SOL</SelectItem>
            <SelectItem value="BASE">BASE</SelectItem>
            <SelectItem value="BSC">BSC</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minVolume">Min Volume</Label>
        <Input
          id="minVolume"
          type="text"
          inputMode="numeric"
          value={localMinVolume}
          onChange={(e) => setLocalMinVolume(cleanNumberInput(e.target.value))}
          onBlur={(e) => {
            // При потере фокуса форматируем значение и сразу применяем
            const value = cleanNumberInput(e.target.value);
            setLocalMinVolume(value);
            setMinVolume(value);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minMcap">Min Market Cap (USD)</Label>
        <Input
          id="minMcap"
          type="text"
          inputMode="numeric"
          value={String(localMinMcap)}
          onChange={(e) => setLocalMinMcap(cleanNumberInput(e.target.value))}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMinMcap(v);
            setMinMcap(v);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minLiq">Min Liquidity</Label>
        <Input
          id="minLiq"
          type="text"
          inputMode="numeric"
          value={localMinLiq !== "" ? String(localMinLiq) : ""}
          onChange={(e) => setLocalMinLiq(cleanNumberInput(e.target.value) || "")}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMinLiq(v || "");
            if (setMinLiq) setMinLiq(v || null);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="maxLiq">Max Liquidity</Label>
        <Input
          id="maxLiq"
          type="text"
          inputMode="numeric"
          value={localMaxLiq !== "" ? String(localMaxLiq) : ""}
          onChange={(e) => setLocalMaxLiq(cleanNumberInput(e.target.value) || "")}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMaxLiq(v || "");
            if (setMaxLiq) setMaxLiq(v || null);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minBuys24H">Min Buys (24H)</Label>
        <Input
          id="minBuys24H"
          type="text"
          inputMode="numeric"
          value={localMinBuys24H !== "" ? String(localMinBuys24H) : ""}
          onChange={(e) => setLocalMinBuys24H(cleanNumberInput(e.target.value) || "")}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMinBuys24H(v || "");
            if (setMinBuys24H) setMinBuys24H(v || null);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minSells24H">Min Sells (24H)</Label>
        <Input
          id="minSells24H"
          type="text"
          inputMode="numeric"
          value={localMinSells24H !== "" ? String(localMinSells24H) : ""}
          onChange={(e) => setLocalMinSells24H(cleanNumberInput(e.target.value) || "")}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMinSells24H(v || "");
            if (setMinSells24H) setMinSells24H(v || null);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="minTxns24H">Min Txns (24H)</Label>
        <Input
          id="minTxns24H"
          type="text"
          inputMode="numeric"
          value={localMinTxns24H !== "" ? String(localMinTxns24H) : ""}
          onChange={(e) => setLocalMinTxns24H(cleanNumberInput(e.target.value) || "")}
          onBlur={(e) => {
            const v = cleanNumberInput(e.target.value);
            setLocalMinTxns24H(v || "");
            if (setMinTxns24H) setMinTxns24H(v || null);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="isVerified">Verified</Label>
        <Select
          value={isVerified === null || isVerified === undefined ? "any" : isVerified ? "true" : "false"}
          onValueChange={(v) => setIsVerified && setIsVerified(v === "any" ? null : v === "true")}
        >
          <SelectTrigger id="isVerified" className="w-[120px] border bg-gray-800 border-gray-800">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent className="border bg-gray-900 border-gray-700">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="true">Verified</SelectItem>
            <SelectItem value="false">Not Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="timeFrame">Timeframe</Label>
  <Select value={timeFrame ?? "any"} onValueChange={(v)=>setTimeFrame && setTimeFrame(v === "any" ? null : (v as TimeFrame))}>
          <SelectTrigger id="timeFrame" className="w-[120px] border bg-gray-800 border-gray-800">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent className="border bg-gray-900 border-gray-700">
      <SelectItem value="any">Any</SelectItem>
            <SelectItem value="5M">5M</SelectItem>
            <SelectItem value="1H">1H</SelectItem>
            <SelectItem value="6H">6H</SelectItem>
            <SelectItem value="24H">24H</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="maxAge">Max Age (hrs)</Label>
        <Input
          id="maxAge"
          type="text"
          inputMode="numeric"
          value={localMaxAge}
          onChange={(e) => setLocalMaxAge(cleanNumberInput(e.target.value))}
          onBlur={(e) => {
            // При потере фокуса форматируем значение и сразу применяем
            const value = cleanNumberInput(e.target.value);
            setLocalMaxAge(value);
            setMaxAge(value);
          }}
        />
      </div>
      <Button onClick={() => setExcludeHoneypots(!excludeHoneypots)}>
        <span className="text-sm text-white">
          {excludeHoneypots ? "Exclude honeypots" : "Include honeypots"}
        </span>
      </Button>
    </div>
  );
};
