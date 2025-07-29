"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Input } from "ui/input";
import {
  BarChart3,
  Search,
  Grid,
  List,
  Plus,
  Pin,
  Share2,
  Settings,
  Trash2,
  Eye,
  Download,
  Calendar,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import Link from "next/link";

interface Chart {
  id: string;
  title: string;
  description?: string;
  chartType: string;
  dataset: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  thumbnail?: string;
  dataMode: "static" | "realtime";
}

// Mock data for demonstration
const mockCharts: Chart[] = [
  {
    id: "1",
    title: "Sales Performance by Region",
    description: "Monthly sales data across different regions",
    chartType: "bar",
    dataset: "Production Database",
    isPinned: true,
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 3600000),
    tags: ["sales", "regional", "monthly"],
    dataMode: "static",
  },
  {
    id: "2",
    title: "User Growth Trend",
    description: "Daily active users over the past 30 days",
    chartType: "line",
    dataset: "Analytics Warehouse",
    isPinned: false,
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 7200000),
    tags: ["users", "growth", "daily"],
    dataMode: "realtime",
  },
  {
    id: "3",
    title: "Revenue Distribution",
    description: "Breakdown of revenue by product category",
    chartType: "pie",
    dataset: "Production Database",
    isPinned: false,
    createdAt: new Date(Date.now() - 86400000 * 7),
    updatedAt: new Date(Date.now() - 86400000),
    tags: ["revenue", "product", "distribution"],
    dataMode: "static",
  },
  {
    id: "4",
    title: "Server Performance Metrics",
    description: "Real-time server CPU and memory usage",
    chartType: "area",
    dataset: "Monitoring Database",
    isPinned: true,
    createdAt: new Date(Date.now() - 86400000 * 1),
    updatedAt: new Date(Date.now() - 1800000),
    tags: ["monitoring", "performance", "realtime"],
    dataMode: "realtime",
  },
  {
    id: "5",
    title: "Customer Data Export",
    description: "Raw customer data with detailed information",
    chartType: "table",
    dataset: "Customer Database",
    isPinned: false,
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 7200000),
    tags: ["customers", "export", "data"],
    dataMode: "static",
  },
];

export default function ChartsLibraryPage() {
  const [charts, setCharts] = useState<Chart[]>(mockCharts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "pinned" | "static" | "realtime"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredCharts = charts.filter((chart) => {
    const matchesSearch =
      chart.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chart.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chart.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "pinned" && chart.isPinned) ||
      (selectedFilter === "static" && chart.dataMode === "static") ||
      (selectedFilter === "realtime" && chart.dataMode === "realtime");

    return matchesSearch && matchesFilter;
  });

  const togglePin = (chartId: string) => {
    setCharts((prev) =>
      prev.map((chart) =>
        chart.id === chartId ? { ...chart, isPinned: !chart.isPinned } : chart,
      ),
    );
  };

  const getChartTypeIcon = (type: string) => {
    switch (type) {
      case "bar":
        return <BarChart3 className="h-4 w-4" />;
      case "line":
        return <BarChart3 className="h-4 w-4" />; // Would use LineChart icon if available
      case "pie":
        return <BarChart3 className="h-4 w-4" />; // Would use PieChart icon if available
      case "table":
        return <Grid className="h-4 w-4" />;
      case "area":
        return <BarChart3 className="h-4 w-4" />; // Would use AreaChart icon if available
      case "scatter":
        return <BarChart3 className="h-4 w-4" />; // Would use ScatterChart icon if available
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const ChartCard = ({ chart }: { chart: Chart }) => (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getChartTypeIcon(chart.chartType)}
              <CardTitle className="text-lg truncate">{chart.title}</CardTitle>
              {chart.isPinned && (
                <Pin className="h-4 w-4 text-blue-600 fill-current" />
              )}
            </div>
            <CardDescription className="text-sm text-gray-500 line-clamp-2">
              {chart.description}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Chart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => togglePin(chart.id)}>
                <Pin className="h-4 w-4 mr-2" />
                {chart.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Chart Preview */}
          <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-blue-400" />
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Dataset:</span>
              <span className="font-medium">{chart.dataset}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Type:</span>
              <Badge variant="outline" className="text-xs">
                {chart.chartType}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Mode:</span>
              <Badge
                variant={
                  chart.dataMode === "realtime" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {chart.dataMode}
              </Badge>
            </div>
          </div>

          {/* Tags */}
          {chart.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chart.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {chart.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{chart.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(chart.createdAt)}</span>
            </div>
            <span>Updated {formatDate(chart.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ChartListItem = ({ chart }: { chart: Chart }) => (
    <Card className="group hover:shadow-sm transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-md flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold truncate">{chart.title}</h3>
              {chart.isPinned && (
                <Pin className="h-4 w-4 text-blue-600 fill-current" />
              )}
              <Badge
                variant={
                  chart.dataMode === "realtime" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {chart.dataMode}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {chart.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{chart.dataset}</span>
              <span>•</span>
              <span>{chart.chartType} chart</span>
              <span>•</span>
              <span>Updated {formatDate(chart.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {chart.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Chart
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => togglePin(chart.id)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {chart.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart Library</h1>
          <p className="text-gray-600 mt-2">
            Manage and organize your charts and visualizations
          </p>
        </div>
        <Link href="/studio">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Chart
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search charts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>

          <Tabs
            value={selectedFilter}
            onValueChange={(value) => setSelectedFilter(value as any)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pinned">Pinned</TabsTrigger>
              <TabsTrigger value="static">Static</TabsTrigger>
              <TabsTrigger value="realtime">Real-time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {filteredCharts.length} chart
            {filteredCharts.length !== 1 ? "s" : ""}
          </Badge>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Charts Display */}
      {filteredCharts.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No charts found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "No charts match your search criteria."
              : "Get started by creating your first chart."}
          </p>
          {!searchQuery && (
            <Link href="/studio">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Chart
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCharts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCharts.map((chart) => (
                <ChartListItem key={chart.id} chart={chart} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
