"use client";

import { useState } from "react";
import { Send, Loader2, Sparkles, BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DatasourceConnectionForm from "@/components/datasources/DatasourceConnectionForm";
import TableSelector from "@/components/chart-generation/TableSelector";
import type { DatabaseConfig, ConnectionTestResult } from "@/types/database";
import type { TextToSQLResponse } from "@/lib/text-to-sql/service";

interface ChatGenerationInterfaceProps {
  className?: string;
}

const ChatGenerationInterface: React.FC<ChatGenerationInterfaceProps> = ({
  className = "",
}) => {
  // Connection state
  const [datasourceConfig, setDatasourceConfig] =
    useState<DatabaseConfig | null>(null);
  const [connectionResult, setConnectionResult] =
    useState<ConnectionTestResult | null>(null);

  // Query state
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "anthropic">(
    "openai",
  );
  const [aiModel, setAiModel] = useState("gpt-4");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<TextToSQLResponse | null>(null);

  const handleConnectionSuccess = (
    config: DatabaseConfig,
    testResult: ConnectionTestResult,
  ) => {
    setDatasourceConfig(config);
    setConnectionResult(testResult);
    // Reset selection when connection changes
    setSelectedTables([]);
    setGenerationResult(null);
  };

  const handleGenerateChart = async () => {
    if (!datasourceConfig || !userQuery.trim() || selectedTables.length === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch("/api/text-to-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userQuery,
          selectedTables,
          datasourceId: "temp", // This would normally be from saved datasource
          aiProvider,
          aiModel,
          datasourceConfig,
          maxRetries: 3,
        }),
      });

      const result = await response.json();
      setGenerationResult(result);
    } catch (error) {
      setGenerationResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate chart",
        retryCount: 0,
        executionTime: 0,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate =
    datasourceConfig &&
    userQuery.trim() &&
    selectedTables.length > 0 &&
    !isGenerating;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          MindSpark Studio
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate beautiful charts from your data using natural language
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-6">
          {/* Database Connection */}
          <DatasourceConnectionForm
            onConnectionSuccess={handleConnectionSuccess}
          />

          {/* Table Selection */}
          {datasourceConfig && connectionResult?.success && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Table Selection</CardTitle>
                <CardDescription>
                  Choose up to 5 tables for your chart generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TableSelector
                  datasourceConfig={datasourceConfig}
                  selectedTables={selectedTables}
                  onTablesChange={setSelectedTables}
                  maxTables={5}
                />
              </CardContent>
            </Card>
          )}

          {/* AI Configuration */}
          {datasourceConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Provider</label>
                  <Select
                    value={aiProvider}
                    onValueChange={(value: "openai" | "anthropic") =>
                      setAiProvider(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProvider === "openai" ? (
                        <>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-4-turbo">
                            GPT-4 Turbo
                          </SelectItem>
                          <SelectItem value="gpt-3.5-turbo">
                            GPT-3.5 Turbo
                          </SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="claude-3-opus-20240229">
                            Claude 3 Opus
                          </SelectItem>
                          <SelectItem value="claude-3-sonnet-20240229">
                            Claude 3 Sonnet
                          </SelectItem>
                          <SelectItem value="claude-3-haiku-20240307">
                            Claude 3 Haiku
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Panel - Chat Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Describe Your Chart</CardTitle>
              <CardDescription>
                Tell us what you want to visualize in natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Show me the monthly sales trends for the last year, grouped by product category..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="min-h-32 resize-none"
                disabled={!datasourceConfig || !connectionResult?.success}
              />

              {/* Example Queries */}
              {!userQuery && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Show me total sales by month",
                      "What are the top 10 customers by revenue?",
                      "Compare product categories performance",
                      "Show user growth over time",
                    ].map((example) => (
                      <Button
                        key={example}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setUserQuery(example)}
                        disabled={!datasourceConfig}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {selectedTables.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTables.length} table
                      {selectedTables.length === 1 ? "" : "s"} selected
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={handleGenerateChart}
                  disabled={!canGenerate}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Generate Chart
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {generationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {generationResult.success ? (
                    <>
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      Chart Generated Successfully
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-5 w-5 text-red-600" />
                      Generation Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {generationResult.success ? (
                  <div className="space-y-4">
                    {/* Success Content */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {generationResult.explanation}
                      </p>
                    </div>

                    {/* Generated SQL */}
                    {generationResult.sql && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Generated SQL:</h4>
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {generationResult.sql}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {generationResult.retryCount} retries
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {generationResult.executionTime}ms
                      </Badge>
                      {generationResult.queryComplexity && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            generationResult.queryComplexity.complexity ===
                            "high"
                              ? "text-red-600"
                              : generationResult.queryComplexity.complexity ===
                                  "medium"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {generationResult.queryComplexity.complexity}{" "}
                          complexity
                        </Badge>
                      )}
                    </div>

                    {/* Optimization Hints */}
                    {generationResult.optimizationHints &&
                      generationResult.optimizationHints.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            Optimization Hints:
                          </h4>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {generationResult.optimizationHints.map(
                              (hint, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-blue-500 mt-1">•</span>
                                  {hint}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Table Relationships */}
                    {generationResult.relationships &&
                      generationResult.relationships.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            Table Relationships:
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {generationResult.relationships.map(
                              (rel, index) => (
                                <div
                                  key={index}
                                  className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                                >
                                  {rel}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Error Content */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {generationResult.error}
                      </p>
                    </div>

                    {/* Failed SQL (if available) */}
                    {generationResult.sql && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">
                          Generated SQL (Failed):
                        </h4>
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {generationResult.sql}
                          </code>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {generationResult.retryCount} retries attempted
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {generationResult.executionTime}ms
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Messages */}
          {!datasourceConfig && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Database className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Connect to your database to get started
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {datasourceConfig && !connectionResult?.success && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Database className="h-12 w-12 text-yellow-400 mx-auto" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Test your database connection to continue
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {datasourceConfig &&
            connectionResult?.success &&
            selectedTables.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 text-blue-400 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select tables and describe your chart to generate
                      visualizations
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatGenerationInterface;
