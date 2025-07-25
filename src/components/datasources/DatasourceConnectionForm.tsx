"use client";

import { useState } from "react";
import {
  Database,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type {
  DatabaseConfig,
  PostgreSQLConfig,
  ConnectionTestResult,
} from "@/types/database";

interface DatasourceConnectionFormProps {
  onConnectionSuccess: (
    config: DatabaseConfig,
    testResult: ConnectionTestResult,
  ) => void;
  onSave?: (config: DatabaseConfig, testResult: ConnectionTestResult) => void;
  className?: string;
  initialConfig?: DatabaseConfig;
  isEditing?: boolean;
}

const DatasourceConnectionForm: React.FC<DatasourceConnectionFormProps> = ({
  onConnectionSuccess,
  onSave,
  className = "",
  initialConfig,
  isEditing = false,
}) => {
  const [activeTab, setActiveTab] = useState("postgresql");
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] =
    useState<ConnectionTestResult | null>(null);

  // Initialize PostgreSQL config from props or defaults
  const getInitialPostgreSQLConfig = (): PostgreSQLConfig => {
    if (initialConfig?.type === "postgresql") {
      return initialConfig as PostgreSQLConfig;
    }
    return {
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "",
      username: "",
      password: "",
      ssl: false,
      schema: "public",
    };
  };

  // PostgreSQL form state
  const [postgresqlConfig, setPostgreSQLConfig] = useState<PostgreSQLConfig>(
    getInitialPostgreSQLConfig(),
  );

  const updatePostgreSQLConfig = (
    field: keyof PostgreSQLConfig,
    value: any,
  ) => {
    setPostgreSQLConfig((prev) => ({ ...prev, [field]: value }));
    setConnectionTestResult(null); // Clear previous test results
  };

  const testConnection = async (config: DatabaseConfig) => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await fetch("/api/datasources/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();
      setConnectionTestResult(result);

      // Don't automatically call onConnectionSuccess here
      // Let user manually save after testing
    } catch (error) {
      setConnectionTestResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    const config = getCurrentConfig();
    if (config && connectionTestResult?.success) {
      if (onSave) {
        onSave(config, connectionTestResult);
      } else {
        onConnectionSuccess(config, connectionTestResult);
      }
    }
  };

  const handleTestConnection = () => {
    const config = getCurrentConfig();
    if (config) {
      testConnection(config);
    }
  };

  const getCurrentConfig = (): DatabaseConfig | null => {
    switch (activeTab) {
      case "postgresql":
        if (
          !postgresqlConfig.host ||
          !postgresqlConfig.database ||
          !postgresqlConfig.username ||
          !postgresqlConfig.password
        ) {
          return null;
        }
        return postgresqlConfig;
      default:
        return null;
    }
  };

  const isFormValid = getCurrentConfig() !== null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {isEditing ? "Edit Database Connection" : "Database Connection"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your database connection settings."
            : "Configure your database connection to start generating charts from your data."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="postgresql" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              PostgreSQL
            </TabsTrigger>
            {/* Future database types can be added here */}
          </TabsList>

          <TabsContent value="postgresql" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pg-host">Host *</Label>
                <Input
                  id="pg-host"
                  placeholder="localhost"
                  value={postgresqlConfig.host}
                  onChange={(e) =>
                    updatePostgreSQLConfig("host", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-port">Port *</Label>
                <Input
                  id="pg-port"
                  type="number"
                  placeholder="5432"
                  value={postgresqlConfig.port}
                  onChange={(e) =>
                    updatePostgreSQLConfig(
                      "port",
                      parseInt(e.target.value) || 5432,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-database">Database Name *</Label>
              <Input
                id="pg-database"
                placeholder="my_database"
                value={postgresqlConfig.database}
                onChange={(e) =>
                  updatePostgreSQLConfig("database", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pg-username">Username *</Label>
                <Input
                  id="pg-username"
                  placeholder="postgres"
                  value={postgresqlConfig.username}
                  onChange={(e) =>
                    updatePostgreSQLConfig("username", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="pg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={postgresqlConfig.password}
                    onChange={(e) =>
                      updatePostgreSQLConfig("password", e.target.value)
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-schema">Schema (Optional)</Label>
              <Input
                id="pg-schema"
                placeholder="public"
                value={postgresqlConfig.schema}
                onChange={(e) =>
                  updatePostgreSQLConfig("schema", e.target.value)
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="pg-ssl"
                checked={postgresqlConfig.ssl}
                onCheckedChange={(checked) =>
                  updatePostgreSQLConfig("ssl", checked)
                }
              />
              <Label htmlFor="pg-ssl">Enable SSL Connection</Label>
            </div>
          </TabsContent>
        </Tabs>

        {/* Connection Test Section */}
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Connection Test</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={!isFormValid || isTestingConnection}
                size="sm"
                variant="outline"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!connectionTestResult?.success}
                size="sm"
              >
                {isEditing ? "Update" : "Save"}
              </Button>
            </div>
          </div>

          {/* Connection Test Result */}
          {connectionTestResult && (
            <div
              className={`p-4 rounded-lg border ${
                connectionTestResult.success
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {connectionTestResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        connectionTestResult.success
                          ? "text-green-800"
                          : "text-red-800 "
                      }`}
                    >
                      {connectionTestResult.success
                        ? "Connection successful"
                        : "Connection failed"}
                    </span>

                    {connectionTestResult.responseTime && (
                      <Badge
                        variant="outline"
                        className="text-xs border border-green-800"
                      >
                        {connectionTestResult.responseTime}ms
                      </Badge>
                    )}
                  </div>

                  {connectionTestResult.error && (
                    <p className="text-sm text-red-700 ">
                      {connectionTestResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isFormValid && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please fill in all required fields to test the connection.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatasourceConnectionForm;
