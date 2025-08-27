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

export interface ScannerTableFiltersProps {
  chain: string;
  minVolume: number;
  maxAge: number;
  excludeHoneypots: boolean;
  setChain: (chain: string) => void;
  setMinVolume: (volume: number) => void;
  setMaxAge: (age: number) => void;
  setExcludeHoneypots: (exclude: boolean) => void;
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
}: ScannerTableFiltersProps) => {
  // Локальное состояние для дебаунса
  const [localMinVolume, setLocalMinVolume] = useState(minVolume);
  const [localMaxAge, setLocalMaxAge] = useState(maxAge);

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
