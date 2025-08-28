import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/shadcn/table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Loader } from "lucide-react";
import * as React from "react";

type TableMeta = {
  className?: string;
};

interface ScannerTableProps<T extends { id: string }> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  title: string;
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  // Called when the header sorting changes. Passes first sort entry or null.
  onServerSort?: (sort: { id: string; desc: boolean } | null) => void;
  sortable?: boolean;
}

export function ScannerTable<T extends { id: string }>({
  columns,
  data,
  title,
  loading,
  error,
  emptyText = "No data",
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  onServerSort,
  sortable = true,
}: ScannerTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: sortable ? { sorting } : {},
    onSortingChange: sortable
      ? (updater) => {
          const newSorting =
            typeof updater === "function"
              ? (updater as (old: SortingState) => SortingState)(sorting)
              : (updater as SortingState);
          setSorting(newSorting);
          if (onServerSort) {
            const first = newSorting.length > 0 ? newSorting[0] : null;
            onServerSort(
              first ? { id: String(first.id), desc: !!first.desc } : null
            );
          }
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    debugTable: false,
  });

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // IntersectionObserver for infinite scroll
  React.useEffect(() => {
    if (!onLoadMore) return;
    const root = parentRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (hasMore && !loadingMore) {
              onLoadMore();
            }
          }
        });
      },
      { root, rootMargin: "200px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLoadMore, hasMore, loadingMore, parentRef.current]);

  return (
    <div className="w-full">
      <h2 className="font-bold mb-2">{title}</h2>
      <div
        ref={parentRef}
        className="relative border rounded bg-white dark:bg-gray-900 min-h-[400px] max-h-[600px] overflow-y-auto"
      >
        {data.length > 0 && (
          <Table className="w-full text-sm text-black dark:text-white">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-gray-100 dark:bg-gray-800"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        (header.column.columnDef.meta as TableMeta)?.className
                      }
                      onClick={
                        sortable && header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      style={{
                        cursor:
                          sortable && header.column.getCanSort()
                            ? "pointer"
                            : undefined,
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sortable && header.column.getCanSort() && (
                        <span>
                          {header.column.getIsSorted() === "asc"
                            ? " ▲"
                            : header.column.getIsSorted() === "desc"
                            ? " ▼"
                            : ""}
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {/* top spacer */}
              {virtualRows.length > 0 && (
                <TableRow style={{ height: virtualRows[0].start }}>
                  <TableCell colSpan={columns.length} />
                </TableRow>
              )}

              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <TableRow key={row.id} className="border-b">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (cell.column.columnDef.meta as TableMeta)?.className
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}

              {/* bottom spacer */}
              {virtualRows.length > 0 && (
                <TableRow
                  style={{
                    height: Math.max(
                      0,
                      totalSize - virtualRows[virtualRows.length - 1].end
                    ),
                  }}
                >
                  <TableCell colSpan={columns.length} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {loading && (
          <div className="p-4 text-gray-400 w-full h-full absolute top-0 left-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <Loader className="animate-spin" />
          </div>
        )}
        {error && (
          <div className="p-4 text-red-500 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded">
            {error}
          </div>
        )}
        {data.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-400 w-full h-full absolute top-0 left-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="p-4 text-gray-400">{emptyText}</div>
          </div>
        )}
        {/* Infinite-scroll sentinel: when it becomes visible inside parentRef, call onLoadMore */}
        <div
          ref={(el) => {
            // place sentinel inside scroll container; ref attached via effect observer
            sentinelRef.current = el;
          }}
          className="h-1"
        />
      </div>
    </div>
  );
}
