import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/shadcn/table";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface ScannerTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title: string;
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
}

export function ScannerTable<T extends { id: string }>({
  columns,
  data,
  title,
  loading,
  error,
  emptyText = "Нет данных",
}: ScannerTableProps<T>) {
  return (
    <div className="w-full">
      <h2 className="font-bold mb-2">{title}</h2>
      <div className="border rounded bg-gray-900 min-h-[400px]">
        {data.length === 0 && !loading && !error && (
          <div className="p-4 text-gray-400">{emptyText}</div>
        )}
        {data.length > 0 && (
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="bg-gray-800">
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} className="border-b">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {loading && <div className="p-4 text-gray-400">Loading...</div>}
        {error && <div className="p-4 text-red-500">{error}</div>}
      </div>
    </div>
  );
}
