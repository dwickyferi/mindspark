"use client";

import { useState, useEffect } from "react";
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
  Database,
  Plus,
  Search,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Server,
  Table,
} from "lucide-react";
import DatasourceConnectionForm from "@/components/datasources/DatasourceConnectionForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Alert, AlertDescription } from "ui/alert";
import { DatasourceAPI, type DatasourceListItem } from "@/lib/api/datasources";
import { toast } from "sonner";

export default function DatasetsPage() {
  const [datasources, setDatasources] = useState<DatasourceListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDatasource, setEditingDatasource] = useState<
    (DatasourceListItem & { connectionConfig?: any }) | null
  >(null);
  const [deletingDatasource, setDeletingDatasource] =
    useState<DatasourceListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(
    new Set(),
  );

  // Load datasources on component mount
  useEffect(() => {
    loadDatasources();
  }, []);

  const loadDatasources = async () => {
    setIsLoading(true);
    try {
      const response = await DatasourceAPI.listDatasources();
      if (response.success && response.data) {
        setDatasources(response.data);
      } else {
        toast.error(response.error || "Failed to load datasources");
      }
    } catch (error) {
      console.error("Error loading datasources:", error);
      toast.error("Failed to load datasources");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDatasources = datasources.filter(
    (ds) =>
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateDatasource = async (config: any, testResult: any) => {
    try {
      const response = await DatasourceAPI.createDatasource({
        name: config.database || "New Database", // Use database name as default
        config,
        description: "Database connection",
      });

      if (response.success && response.data) {
        setDatasources((prev) => [...prev, response.data!]);
        setIsCreateDialogOpen(false);
        toast.success("Datasource created successfully");
      } else {
        toast.error(response.error || "Failed to create datasource");
      }
    } catch (error) {
      console.error("Error creating datasource:", error);
      toast.error("Failed to create datasource");
    }
  };

  const handleTestConnection = async (datasource: DatasourceListItem) => {
    setTestingConnections((prev) => new Set(prev).add(datasource.id));

    // Optimistically update UI
    setDatasources((prev) =>
      prev.map((ds) =>
        ds.id === datasource.id ? { ...ds, status: "connecting" } : ds,
      ),
    );

    try {
      const response = await DatasourceAPI.testConnection(datasource.id);

      if (response.success && response.testResult) {
        // Update datasource with test result
        setDatasources((prev) =>
          prev.map((ds) =>
            ds.id === datasource.id
              ? {
                  ...ds,
                  status: response.testResult!.success ? "connected" : "error",
                  lastTested: new Date(),
                }
              : ds,
          ),
        );

        if (response.testResult.success) {
          toast.success(`Connection to ${datasource.name} successful`);
        } else {
          toast.error(`Connection failed: ${response.testResult.error}`);
        }
      } else {
        // Connection failed
        setDatasources((prev) =>
          prev.map((ds) =>
            ds.id === datasource.id
              ? { ...ds, status: "error", lastTested: new Date() }
              : ds,
          ),
        );
        toast.error(response.error || "Connection test failed");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setDatasources((prev) =>
        prev.map((ds) =>
          ds.id === datasource.id
            ? { ...ds, status: "error", lastTested: new Date() }
            : ds,
        ),
      );
      toast.error("Connection test failed");
    } finally {
      setTestingConnections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(datasource.id);
        return newSet;
      });
    }
  };

  const handleDeleteDatasource = async (datasource: DatasourceListItem) => {
    setDeletingDatasource(datasource);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDatasource = async () => {
    if (!deletingDatasource) return;

    try {
      const response = await DatasourceAPI.deleteDatasource(
        deletingDatasource.id,
      );
      if (response.success) {
        setDatasources((prev) =>
          prev.filter((ds) => ds.id !== deletingDatasource.id),
        );
        toast.success("Datasource deleted successfully");
      } else {
        toast.error(response.error || "Failed to delete datasource");
      }
    } catch (error) {
      console.error("Error deleting datasource:", error);
      toast.error("Failed to delete datasource");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingDatasource(null);
    }
  };

  const handleEditDatasource = async (datasource: DatasourceListItem) => {
    try {
      // Fetch the full datasource details including config
      const response = await DatasourceAPI.getDatasource(datasource.id);
      if (response.success && response.data) {
        setEditingDatasource(response.data);
        setIsEditDialogOpen(true);
      } else {
        toast.error(response.error || "Failed to load datasource details");
      }
    } catch (error) {
      console.error("Error loading datasource:", error);
      toast.error("Failed to load datasource details");
    }
  };

  const handleUpdateDatasource = async (config: any, testResult: any) => {
    if (!editingDatasource) return;

    try {
      const response = await DatasourceAPI.updateDatasource(
        editingDatasource.id,
        {
          name: config.database || editingDatasource.name,
          config,
          description: editingDatasource.description,
        },
      );

      if (response.success && response.data) {
        setDatasources((prev) =>
          prev.map((ds) =>
            ds.id === editingDatasource.id ? response.data! : ds,
          ),
        );
        setIsEditDialogOpen(false);
        setEditingDatasource(null);
        toast.success("Datasource updated successfully");
      } else {
        toast.error(response.error || "Failed to update datasource");
      }
    } catch (error) {
      console.error("Error updating datasource:", error);
      toast.error("Failed to update datasource");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "connecting":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDatabaseIcon = (type: string) => {
    switch (type) {
      case "postgresql":
        return <Database className="h-5 w-5 text-blue-600" />;
      case "mysql":
        return <Database className="h-5 w-5 text-orange-600" />;
      case "sqlite":
        return <Database className="h-5 w-5 text-gray-600" />;
      default:
        return <Server className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Datasets</h1>
          <p className="mt-2 dark:text-white">
            Manage your database connections and data sources for MindSpark
            Studio
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Dataset</DialogTitle>
            </DialogHeader>
            <DatasourceConnectionForm
              onConnectionSuccess={handleCreateDatasource}
              onSave={handleCreateDatasource}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dataset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dataset</DialogTitle>
          </DialogHeader>
          {editingDatasource && (
            <DatasourceConnectionForm
              onConnectionSuccess={handleUpdateDatasource}
              onSave={handleUpdateDatasource}
              initialConfig={editingDatasource.connectionConfig}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete &quot;{deletingDatasource?.name}
              &quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingDatasource(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDeleteDatasource}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredDatasources.length} dataset
          {filteredDatasources.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Datasets Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading datasets...
          </h3>
          <p className="text-gray-600">
            Please wait while we fetch your database connections.
          </p>
        </div>
      ) : filteredDatasources.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No datasets found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "No datasets match your search criteria."
              : "Get started by adding your first dataset."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Dataset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasources.map((datasource) => (
            <Card
              key={datasource.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getDatabaseIcon(datasource.type)}
                    <div>
                      <CardTitle className="text-lg">
                        {datasource.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500 capitalize">
                        {datasource.type}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(datasource.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {datasource.description && (
                    <p className="text-sm text-gray-600">
                      {datasource.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Table className="h-4 w-4" />
                      <span>{datasource.tablesCount || 0} tables</span>
                    </div>
                    <Badge
                      variant={
                        datasource.status === "connected"
                          ? "default"
                          : datasource.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {datasource.status === "connecting"
                        ? "Testing..."
                        : datasource.status}
                    </Badge>
                  </div>

                  {datasource.lastTested && (
                    <p className="text-xs text-gray-400">
                      Last tested: {datasource.lastTested.toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTestConnection(datasource)}
                      disabled={testingConnections.has(datasource.id)}
                    >
                      {testingConnections.has(datasource.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Test
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDatasource(datasource)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteDatasource(datasource)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Alert */}
      {datasources.some((ds) => ds.status === "error") && (
        <Alert className="mt-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Some datasets have connection issues. Click &quot;Test&quot; to
            check their status.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
