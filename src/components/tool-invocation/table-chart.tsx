"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JsonViewPopup } from "../json-view-popup";

// TableChart component props interface
export interface TableChartProps {
  // Chart title (required)
  title: string;
  // Chart data array (required)
  data: Array<Record<string, any>>;
  // Chart description (optional)
  description?: string;
  // Maximum number of rows to display (optional, defaults to 100)
  maxRows?: number;
}

export function TableChart(props: TableChartProps) {
  const { title, data, description, maxRows = 100 } = props;

  // Get column headers from the first data item
  const columns = React.useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Limit the number of rows displayed
  const displayData = React.useMemo(() => {
    return data.slice(0, maxRows);
  }, [data, maxRows]);

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value === "number") {
      // Format numbers with commas for readability
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Data Table - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {data.length > maxRows && (
          <CardDescription className="text-sm text-muted-foreground">
            Showing {maxRows} of {data.length} rows
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          {data.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="font-semibold">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column} className="font-mono text-sm">
                        {formatCellValue(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
