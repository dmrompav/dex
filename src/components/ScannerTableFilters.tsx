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
  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-muted rounded-lg">
      <div className="flex flex-col gap-1">
        <Label htmlFor="chain">Chain</Label>
        <Select value={chain} onValueChange={setChain}>
          <SelectTrigger
            id="chain"
            className="w-[120px] bg-white text-black border border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700"
          >
            <SelectValue placeholder="Select chain" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black border border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700">
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
          type="number"
          value={minVolume}
          onChange={(e) => setMinVolume(Number(e.target.value))}
          min={0}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="maxAge">Max Age (hrs)</Label>
        <Input
          id="maxAge"
          type="number"
          value={maxAge}
          onChange={(e) => setMaxAge(Number(e.target.value))}
          min={0}
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
