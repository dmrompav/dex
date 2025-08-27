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
}

export function ScannerTable<T extends { id: string }>({
  columns,
  data,
  title,
  loading,
  error,
  emptyText = "Нет данных",
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: ScannerTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  return (
    <div className="w-full">
      <h2 className="font-bold mb-2">{title}</h2>
  <div ref={parentRef} className="relative border rounded bg-white dark:bg-gray-900 min-h-[400px] max-h-[600px] overflow-y-auto">
        {data.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-400">{emptyText}</div>
        )}
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
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      style={{
                        cursor: header.column.getCanSort()
                          ? "pointer"
                          : undefined,
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}

              {/* bottom spacer */}
              {virtualRows.length > 0 && (
                <TableRow
                  style={{
                    height:
                      Math.max(0, totalSize - (virtualRows[virtualRows.length - 1].end)),
                  }}
                >
                  <TableCell colSpan={columns.length} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {loading && (
          <div className="p-4 text-gray-400 w-full h-full absolute top-0 left-0 flex items-center justify-center">
            <Loader className="animate-spin" />
          </div>
        )}
        {error && <div className="p-4 text-red-500">{error}</div>}
        {/* Load more control */}
        {hasMore && (
          <div className="p-2 flex justify-center border-t bg-gray-50 dark:bg-gray-800">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
