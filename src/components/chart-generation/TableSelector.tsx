"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Database, Table, Search, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
  columnCount?: number;
  description?: string;
}

interface TableSelectorProps {
  datasourceConfig: any;
  selectedTables: string[];
  onTablesChange: (selectedTables: string[]) => void;
  maxTables?: number;
  className?: string;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  datasourceConfig,
  selectedTables,
  onTablesChange,
  maxTables = 5,
  className = "",
}) => {
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (datasourceConfig) {
      fetchAvailableTables();
    }
  }, [datasourceConfig]);

  const fetchAvailableTables = async () => {
    if (!datasourceConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/datasources/schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: datasourceConfig }),
      });

      const result = await response.json();

      if (result.success && result.schema) {
        setAvailableTables(result.schema.tables || []);
      } else {
        setError(result.error || "Failed to fetch tables");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTables = availableTables.filter(
    (table) =>
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.schema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (table.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false),
  );

  const handleTableToggle = (tableName: string) => {
    const isSelected = selectedTables.includes(tableName);

    if (isSelected) {
      // Remove table
      onTablesChange(selectedTables.filter((t) => t !== tableName));
    } else {
      // Add table (check max limit)
      if (selectedTables.length < maxTables) {
        onTablesChange([...selectedTables, tableName]);
      }
    }
  };

  const handleSelectAll = () => {
    const visibleTableNames = filteredTables
      .slice(0, maxTables)
      .map((t) => t.name);
    onTablesChange(visibleTableNames);
  };

  const handleClearAll = () => {
    onTablesChange([]);
  };

  const selectedCount = selectedTables.length;
  const isMaxReached = selectedCount >= maxTables;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Tables
        </label>
        <Badge variant="secondary" className="text-xs">
          {selectedCount}/{maxTables}
        </Badge>
      </div>

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>
                {selectedCount === 0
                  ? "Select tables..."
                  : `${selectedCount} table${selectedCount === 1 ? "" : "s"} selected`}
              </span>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80 p-0">
          <div className="p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={
                  isLoading || filteredTables.length === 0 || isMaxReached
                }
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedCount === 0}
              >
                Clear All
              </Button>
            </div>

            <Separator />

            {/* Error State */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                Error: {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAvailableTables}
                  className="ml-2"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Loading tables...</span>
              </div>
            )}

            {/* Tables List */}
            {!isLoading && !error && (
              <>
                <ScrollArea className="h-72">
                  <div className="space-y-2">
                    {filteredTables.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No tables found
                      </div>
                    ) : (
                      filteredTables.map((table) => {
                        const isSelected = selectedTables.includes(table.name);
                        const isDisabled = !isSelected && isMaxReached;

                        return (
                          <div
                            key={`${table.schema}.${table.name}`}
                            className={`flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              isDisabled ? "opacity-50" : ""
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                handleTableToggle(table.name)
                              }
                              disabled={isDisabled}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Table className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">
                                  {table.name}
                                </span>
                                {table.schema !== "public" && (
                                  <Badge variant="outline" className="text-xs">
                                    {table.schema}
                                  </Badge>
                                )}
                              </div>

                              <div className="text-xs text-gray-500 mt-1">
                                {table.columnCount && (
                                  <span>{table.columnCount} columns</span>
                                )}
                                {table.rowCount && table.columnCount && (
                                  <span> • </span>
                                )}
                                {table.rowCount && (
                                  <span>
                                    {table.rowCount.toLocaleString()} rows
                                  </span>
                                )}
                                {table.description && (
                                  <div
                                    className="truncate mt-1"
                                    title={table.description}
                                  >
                                    {table.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Selection Info */}
                {selectedCount > 0 && (
                  <>
                    <Separator />
                    <div className="text-xs text-gray-500">
                      {isMaxReached && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Maximum {maxTables} tables selected.
                        </span>
                      )}
                      {!isMaxReached && (
                        <span>
                          Select up to {maxTables - selectedCount} more table
                          {maxTables - selectedCount === 1 ? "" : "s"}.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tables Summary */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTables.map((tableName) => (
            <Badge
              key={tableName}
              variant="secondary"
              className="text-xs flex items-center gap-1"
            >
              <Table className="h-3 w-3" />
              {tableName}
              <button
                onClick={() => handleTableToggle(tableName)}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableSelector;
