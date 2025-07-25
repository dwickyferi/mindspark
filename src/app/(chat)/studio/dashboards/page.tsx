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
  Layers,
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
  Users,
  Activity,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import Link from "next/link";

interface Dashboard {
  id: string;
  title: string;
  description?: string;
  chartCount: number;
  isPinned: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  thumbnail?: string;
  visibility: "private" | "shared" | "public";
  collaborators: number;
}

// Mock data for demonstration
const mockDashboards: Dashboard[] = [
  {
    id: "1",
    title: "Sales Executive Dashboard",
    description: "Comprehensive overview of sales performance metrics and KPIs",
    chartCount: 8,
    isPinned: true,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 3600000),
    tags: ["sales", "executive", "kpi"],
    visibility: "shared",
    collaborators: 3,
  },
  {
    id: "2",
    title: "Marketing Analytics",
    description: "Campaign performance and user acquisition metrics",
    chartCount: 12,
    isPinned: false,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 7200000),
    tags: ["marketing", "campaigns", "analytics"],
    visibility: "public",
    collaborators: 5,
  },
  {
    id: "3",
    title: "Operations Monitor",
    description: "Real-time operational metrics and system health",
    chartCount: 6,
    isPinned: false,
    isPublished: false,
    createdAt: new Date(Date.now() - 86400000 * 7),
    updatedAt: new Date(Date.now() - 86400000),
    tags: ["operations", "monitoring", "realtime"],
    visibility: "private",
    collaborators: 2,
  },
  {
    id: "4",
    title: "Financial Reporting",
    description: "Monthly and quarterly financial performance dashboard",
    chartCount: 10,
    isPinned: true,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 1),
    updatedAt: new Date(Date.now() - 1800000),
    tags: ["finance", "reporting", "quarterly"],
    visibility: "shared",
    collaborators: 4,
  },
  {
    id: "5",
    title: "Customer Insights",
    description: "Customer behavior analysis and satisfaction metrics",
    chartCount: 7,
    isPinned: false,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date(Date.now() - 14400000),
    tags: ["customer", "insights", "behavior"],
    visibility: "public",
    collaborators: 6,
  },
];

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>(mockDashboards);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "pinned" | "published" | "private"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredDashboards = dashboards.filter((dashboard) => {
    const matchesSearch =
      dashboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dashboard.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      dashboard.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "pinned" && dashboard.isPinned) ||
      (selectedFilter === "published" && dashboard.isPublished) ||
      (selectedFilter === "private" && dashboard.visibility === "private");

    return matchesSearch && matchesFilter;
  });

  const togglePin = (dashboardId: string) => {
    setDashboards((prev) =>
      prev.map((dashboard) =>
        dashboard.id === dashboardId
          ? { ...dashboard, isPinned: !dashboard.isPinned }
          : dashboard,
      ),
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getVisibilityBadge = (visibility: string) => {
    const variants = {
      private: "secondary",
      shared: "default",
      public: "outline",
    } as const;
    return variants[visibility as keyof typeof variants] || "secondary";
  };

  const DashboardCard = ({ dashboard }: { dashboard: Dashboard }) => (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-lg truncate">
                {dashboard.title}
              </CardTitle>
              {dashboard.isPinned && (
                <Pin className="h-4 w-4 text-blue-600 fill-current" />
              )}
              {dashboard.isPublished && (
                <Activity className="h-4 w-4 text-green-600" />
              )}
            </div>
            <CardDescription className="text-sm text-gray-500 line-clamp-2">
              {dashboard.description}
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
                View Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => togglePin(dashboard.id)}>
                <Pin className="h-4 w-4 mr-2" />
                {dashboard.isPinned ? "Unpin" : "Pin"}
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
          {/* Dashboard Preview */}
          <div className="h-32 bg-gradient-to-br from-purple-50 to-blue-100 rounded-md flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1 p-2">
              <div className="h-6 bg-white/70 rounded"></div>
              <div className="h-6 bg-white/50 rounded"></div>
              <div className="h-6 bg-white/50 rounded"></div>
              <div className="h-6 bg-white/70 rounded"></div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Charts:</span>
              <span className="font-medium">{dashboard.chartCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Visibility:</span>
              <Badge
                variant={getVisibilityBadge(dashboard.visibility)}
                className="text-xs capitalize"
              >
                {dashboard.visibility}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <Badge
                variant={dashboard.isPublished ? "default" : "secondary"}
                className="text-xs"
              >
                {dashboard.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            {dashboard.collaborators > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Collaborators:</span>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">{dashboard.collaborators}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {dashboard.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dashboard.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {dashboard.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{dashboard.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(dashboard.createdAt)}</span>
            </div>
            <span>Updated {formatDate(dashboard.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DashboardListItem = ({ dashboard }: { dashboard: Dashboard }) => (
    <Card className="group hover:shadow-sm transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
            <div className="grid grid-cols-2 gap-0.5 p-1">
              <div className="h-2 bg-white/70 rounded"></div>
              <div className="h-2 bg-white/50 rounded"></div>
              <div className="h-2 bg-white/50 rounded"></div>
              <div className="h-2 bg-white/70 rounded"></div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold truncate">
                {dashboard.title}
              </h3>
              {dashboard.isPinned && (
                <Pin className="h-4 w-4 text-blue-600 fill-current" />
              )}
              {dashboard.isPublished && (
                <Activity className="h-4 w-4 text-green-600" />
              )}
              <Badge
                variant={getVisibilityBadge(dashboard.visibility)}
                className="text-xs capitalize"
              >
                {dashboard.visibility}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {dashboard.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{dashboard.chartCount} charts</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{dashboard.collaborators}</span>
              </div>
              <span>•</span>
              <span>Updated {formatDate(dashboard.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {dashboard.tags.slice(0, 2).map((tag, index) => (
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
                  View Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => togglePin(dashboard.id)}>
                  <Pin className="h-4 w-4 mr-2" />
                  {dashboard.isPinned ? "Unpin" : "Pin"}
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-2">
            Create and manage interactive dashboards for data visualization
          </p>
        </div>
        <Link href="/studio">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Dashboard
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search dashboards..."
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
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {filteredDashboards.length} dashboard
            {filteredDashboards.length !== 1 ? "s" : ""}
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

      {/* Dashboards Display */}
      {filteredDashboards.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No dashboards found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "No dashboards match your search criteria."
              : "Get started by creating your first dashboard."}
          </p>
          {!searchQuery && (
            <Link href="/studio">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Dashboard
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDashboards.map((dashboard) => (
                <DashboardCard key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDashboards.map((dashboard) => (
                <DashboardListItem key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
