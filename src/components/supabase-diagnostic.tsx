/**
 * Supabase Connection Diagnostic Tool
 * This component systematically tests each layer of the Supabase connection
 * to identify why realtime is failing with "Channel error"
 */

"use client";

import { useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Badge } from "ui/badge";
import { ScrollArea } from "ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Wifi,
  Database,
  Globe,
} from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: "running" | "success" | "error" | "pending";
  message: string;
  details?: string;
  solution?: string;
}

export function SupabaseDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setDiagnostics((prev) => [...prev, result]);
  };

  const updateResult = (test: string, updates: Partial<DiagnosticResult>) => {
    setDiagnostics((prev) =>
      prev.map((result) =>
        result.test === test ? { ...result, ...updates } : result,
      ),
    );
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    // Test 1: Environment Variables
    addResult({
      test: "Environment Variables",
      status: "running",
      message: "Checking Supabase configuration...",
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      updateResult("Environment Variables", {
        status: "error",
        message: "Missing environment variables",
        details: `URL: ${supabaseUrl || "missing"}, Key: ${supabaseKey ? "set" : "missing"}`,
        solution:
          "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
      });
      setIsRunning(false);
      return;
    }

    updateResult("Environment Variables", {
      status: "success",
      message: "Environment variables configured",
      details: `URL: ${supabaseUrl}`,
    });

    // Test 2: HTTP Connectivity
    addResult({
      test: "HTTP Connectivity",
      status: "running",
      message: "Testing basic HTTP connection...",
    });

    try {
      const response = await fetch(supabaseUrl, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok || response.status === 404) {
        updateResult("HTTP Connectivity", {
          status: "success",
          message: "HTTP connection successful",
          details: `Status: ${response.status}`,
        });
      } else {
        updateResult("HTTP Connectivity", {
          status: "error",
          message: "HTTP connection failed",
          details: `Status: ${response.status} - ${response.statusText}`,
          solution:
            "Check if Supabase server is running on http://localhost:8000",
        });
        setIsRunning(false);
        return;
      }
    } catch (error) {
      updateResult("HTTP Connectivity", {
        status: "error",
        message: "Cannot reach Supabase server",
        details: `Error: ${error}`,
        solution: "Ensure Supabase is running locally. Try: npx supabase start",
      });
      setIsRunning(false);
      return;
    }

    // Test 3: Database Connection
    addResult({
      test: "Database Connection",
      status: "running",
      message: "Testing database access...",
    });

    try {
      const { supabase } = await import("@/lib/supabase");

      if (!supabase) {
        updateResult("Database Connection", {
          status: "error",
          message: "Supabase client not initialized",
          solution: "Check Supabase client configuration in @/lib/supabase",
        });
        setIsRunning(false);
        return;
      }

      // Test basic query
      const { error } = await supabase
        .from("notification")
        .select("count")
        .limit(1);

      if (error) {
        updateResult("Database Connection", {
          status: "error",
          message: "Database query failed",
          details: `Error: ${error.message}`,
          solution: error.message.includes("relation")
            ? "Run database migrations to create notification table"
            : "Check database connection and permissions",
        });
      } else {
        updateResult("Database Connection", {
          status: "success",
          message: "Database connection successful",
          details: "notification table accessible",
        });
      }
    } catch (error) {
      updateResult("Database Connection", {
        status: "error",
        message: "Database connection failed",
        details: `Error: ${error}`,
        solution: "Check database configuration and ensure tables exist",
      });
    }

    // Test 4: Realtime Service
    addResult({
      test: "Realtime Service",
      status: "running",
      message: "Testing realtime connection...",
    });

    try {
      const { supabase } = await import("@/lib/supabase");

      if (!supabase) {
        updateResult("Realtime Service", {
          status: "error",
          message: "Supabase client not available",
        });
        setIsRunning(false);
        return;
      }

      // Create a test channel to check realtime connectivity
      const testChannel = supabase
        .channel("diagnostic-test")
        .subscribe((status, error) => {
          console.log("Diagnostic realtime status:", status, error);

          if (status === "SUBSCRIBED") {
            updateResult("Realtime Service", {
              status: "success",
              message: "Realtime service working",
              details: "Successfully subscribed to test channel",
            });

            // Clean up test channel
            setTimeout(() => {
              supabase.removeChannel(testChannel);
            }, 1000);
          } else if (status === "CHANNEL_ERROR") {
            updateResult("Realtime Service", {
              status: "error",
              message: "Realtime service error",
              details: `Channel error: ${error?.message || "Unknown error"}`,
              solution:
                "Realtime may not be enabled. For local Supabase: check supabase/config.toml",
            });
          } else if (status === "TIMED_OUT") {
            updateResult("Realtime Service", {
              status: "error",
              message: "Realtime connection timeout",
              solution:
                "Check network connectivity and Supabase realtime service status",
            });
          }
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        const currentResult = diagnostics.find(
          (d) => d.test === "Realtime Service",
        );
        if (currentResult?.status === "running") {
          updateResult("Realtime Service", {
            status: "error",
            message: "Realtime connection timeout",
            details: "No response after 10 seconds",
            solution:
              "Realtime service may not be running. Check Supabase configuration.",
          });
        }
        setIsRunning(false);
      }, 10000);
    } catch (error) {
      updateResult("Realtime Service", {
        status: "error",
        message: "Realtime test failed",
        details: `Error: ${error}`,
        solution: "Check Supabase realtime configuration",
      });
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "running":
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      case "running":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Supabase Connection Diagnostics
          <Badge variant={isRunning ? "secondary" : "outline"}>
            {isRunning ? "Running..." : "Ready"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-3">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            {isRunning ? "Running Diagnostics..." : "Run Diagnostics"}
          </Button>
          <Button
            onClick={() => setDiagnostics([])}
            variant="outline"
            disabled={isRunning}
          >
            Clear Results
          </Button>
        </div>

        {/* Results */}
        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Diagnostic Results</h3>
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-4">
                {diagnostics.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <h4 className="font-medium">{result.test}</h4>
                    </div>
                    <p className="text-sm mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs opacity-80 mb-2">
                        {result.details}
                      </p>
                    )}
                    {result.solution && (
                      <div className="text-xs bg-white/50 p-2 rounded border-l-2 border-current">
                        <strong>Solution:</strong> {result.solution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Quick Fixes */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">
            Quick Fixes for Common Issues
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Local Supabase Not Running
              </h4>
              <code className="text-xs bg-muted p-2 rounded block mb-2">
                npx supabase start
              </code>
              <p className="text-xs text-muted-foreground">
                Starts local Supabase with all services including realtime
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Missing Database Tables
              </h4>
              <code className="text-xs bg-muted p-2 rounded block mb-2">
                npx supabase migration up
              </code>
              <p className="text-xs text-muted-foreground">
                Runs database migrations to create tables
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2">Environment Variables</h4>
              <code className="text-xs bg-muted p-2 rounded block mb-2">
                NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
                <br />
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
              </code>
              <p className="text-xs text-muted-foreground">
                Add to .env.local (check supabase status for correct values)
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2">Fallback to Polling</h4>
              <p className="text-xs text-muted-foreground mb-2">
                If realtime fails, remove Supabase env vars to use polling mode
              </p>
              <Badge variant="secondary" className="text-xs">
                15-second updates
              </Badge>
            </div>
          </div>
        </div>

        {/* Current Configuration */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded-lg">
          <div>
            <strong>Current URL:</strong>{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_URL || "not set"}
          </div>
          <div>
            <strong>Anon Key:</strong>{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? "configured"
              : "not set"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
