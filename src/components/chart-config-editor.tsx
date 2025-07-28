import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Save, Upload } from "lucide-react";
import {
  DynamicChartConfig,
  SUPPORTED_CHART_TYPES,
  SupportedChartType,
  createDefaultConfig,
  CHART_COLORS,
  ChartComponent,
} from "@/types/chart-config";

interface ChartConfigEditorProps {
  config: DynamicChartConfig;
  chartId?: string;
  data: any[];
  onChange: (config: DynamicChartConfig) => void;
  onClose?: () => void;
}

export const ChartConfigEditor: React.FC<ChartConfigEditorProps> = ({
  config,
  chartId,
  data,
  onChange,
  onClose,
}) => {
  const [editedConfig, setEditedConfig] = useState<DynamicChartConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfigChange = useCallback(
    (newConfig: DynamicChartConfig) => {
      setEditedConfig(newConfig);
      onChange(newConfig);
    },
    [onChange],
  );

  const handleSaveConfig = async () => {
    if (!chartId) {
      console.warn("Cannot save config: no chart ID provided");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/studio/chart-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chartId,
          config: editedConfig,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      console.log("✅ Chart configuration saved successfully");
    } catch (error) {
      console.error("❌ Failed to save chart configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadConfig = async () => {
    if (!chartId) {
      console.warn("Cannot load config: no chart ID provided");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/studio/chart-config?chartId=${chartId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load configuration");
      }

      const result = await response.json();
      if (result.success && result.config) {
        handleConfigChange(result.config);
        console.log("✅ Chart configuration loaded successfully");
      } else {
        console.log("ℹ️ No saved configuration found for this chart");
      }
    } catch (error) {
      console.error("❌ Failed to load chart configuration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChartType = (chartType: string) => {
    const newConfig = createDefaultConfig(
      chartType as SupportedChartType,
      data,
    );
    newConfig.metadata = {
      ...editedConfig.metadata,
      ...newConfig.metadata,
      updatedAt: new Date().toISOString(),
    };
    handleConfigChange(newConfig);
  };

  const updateChartProps = (
    props: Partial<DynamicChartConfig["chartProps"]>,
  ) => {
    const newConfig = {
      ...editedConfig,
      chartProps: { ...editedConfig.chartProps, ...props },
      metadata: {
        ...editedConfig.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    handleConfigChange(newConfig);
  };

  const updateMargin = (side: string, value: number) => {
    const margin = editedConfig.chartProps.margin || {
      top: 20,
      right: 30,
      left: 20,
      bottom: 20,
    };
    updateChartProps({
      margin: { ...margin, [side]: value },
    });
  };

  const addComponent = (type: string) => {
    const newComponent: ChartComponent = { type, props: {} };

    // Add default props based on component type
    switch (type) {
      case "Line":
        newComponent.props = {
          type: "monotone",
          dataKey: "value",
          stroke:
            CHART_COLORS[
              editedConfig.components.filter((c) => c.type === "Line").length %
                CHART_COLORS.length
            ],
          strokeWidth: 2,
        };
        break;
      case "Bar":
        newComponent.props = {
          dataKey: "value",
          fill: CHART_COLORS[
            editedConfig.components.filter((c) => c.type === "Bar").length %
              CHART_COLORS.length
          ],
        };
        break;
      case "Area":
        newComponent.props = {
          type: "monotone",
          dataKey: "value",
          fill: CHART_COLORS[
            editedConfig.components.filter((c) => c.type === "Area").length %
              CHART_COLORS.length
          ],
          stroke:
            CHART_COLORS[
              editedConfig.components.filter((c) => c.type === "Area").length %
                CHART_COLORS.length
            ],
        };
        break;
      case "XAxis":
        newComponent.props = { dataKey: "name" };
        break;
    }

    const newConfig = {
      ...editedConfig,
      components: [...editedConfig.components, newComponent],
      metadata: {
        ...editedConfig.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    handleConfigChange(newConfig);
  };

  const updateComponent = (index: number, component: ChartComponent) => {
    const newComponents = [...editedConfig.components];
    newComponents[index] = component;
    const newConfig = {
      ...editedConfig,
      components: newComponents,
      metadata: {
        ...editedConfig.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    handleConfigChange(newConfig);
  };

  const removeComponent = (index: number) => {
    const newComponents = editedConfig.components.filter((_, i) => i !== index);
    const newConfig = {
      ...editedConfig,
      components: newComponents,
      metadata: {
        ...editedConfig.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    handleConfigChange(newConfig);
  };

  const resetToDefault = () => {
    const defaultConfig = createDefaultConfig(
      editedConfig.chartType as SupportedChartType,
      data,
    );
    defaultConfig.metadata = {
      ...editedConfig.metadata,
      ...defaultConfig.metadata,
      updatedAt: new Date().toISOString(),
    };
    handleConfigChange(defaultConfig);
  };

  const getSupportedComponents = () => {
    return (
      SUPPORTED_CHART_TYPES[editedConfig.chartType as SupportedChartType]
        ?.components || []
    );
  };

  const getAvailableDataKeys = () => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0] || {});
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Chart Configuration Editor</h2>
        <div className="flex gap-2">
          {chartId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadConfig}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isLoading ? "Loading..." : "Load Config"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveConfig}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Config"}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Type and Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chartType">Chart Type</Label>
              <Select
                value={editedConfig.chartType}
                onValueChange={updateChartType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_CHART_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={editedConfig.chartProps.width || ""}
                  onChange={(e) =>
                    updateChartProps({
                      width: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Auto"
                />
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={editedConfig.chartProps.height || ""}
                  onChange={(e) =>
                    updateChartProps({
                      height: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Auto"
                />
              </div>
            </div>

            <div>
              <Label>Margins</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["top", "right", "bottom", "left"].map((side) => (
                  <div key={side}>
                    <Label
                      htmlFor={`margin-${side}`}
                      className="text-xs capitalize"
                    >
                      {side}
                    </Label>
                    <Input
                      id={`margin-${side}`}
                      type="number"
                      value={
                        editedConfig.chartProps.margin?.[
                          side as keyof typeof editedConfig.chartProps.margin
                        ] || 0
                      }
                      onChange={(e) =>
                        updateMargin(side, parseInt(e.target.value) || 0)
                      }
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedConfig.metadata?.title || ""}
                onChange={(e) =>
                  handleConfigChange({
                    ...editedConfig,
                    metadata: {
                      ...editedConfig.metadata,
                      title: e.target.value,
                      updatedAt: new Date().toISOString(),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedConfig.metadata?.description || ""}
                onChange={(e) =>
                  handleConfigChange({
                    ...editedConfig,
                    metadata: {
                      ...editedConfig.metadata,
                      description: e.target.value,
                      updatedAt: new Date().toISOString(),
                    },
                  })
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <div>
                Created:{" "}
                {editedConfig.metadata?.createdAt
                  ? new Date(editedConfig.metadata.createdAt).toLocaleString()
                  : "Unknown"}
              </div>
              <div>
                Updated:{" "}
                {editedConfig.metadata?.updatedAt
                  ? new Date(editedConfig.metadata.updatedAt).toLocaleString()
                  : "Unknown"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Chart Components
            <Select onValueChange={addComponent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add Component" />
              </SelectTrigger>
              <SelectContent>
                {getSupportedComponents().map((component) => (
                  <SelectItem key={component} value={component}>
                    {component}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editedConfig.components.map((component, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{component.type}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeComponent(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Render component-specific property editors */}
                  {component.type === "Line" && (
                    <>
                      <div>
                        <Label className="text-xs">Data Key</Label>
                        <Select
                          value={component.props?.dataKey || ""}
                          onValueChange={(value) =>
                            updateComponent(index, {
                              ...component,
                              props: { ...component.props, dataKey: value },
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableDataKeys().map((key) => (
                              <SelectItem key={key} value={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Stroke Color</Label>
                        <Input
                          value={component.props?.stroke || ""}
                          onChange={(e) =>
                            updateComponent(index, {
                              ...component,
                              props: {
                                ...component.props,
                                stroke: e.target.value,
                              },
                            })
                          }
                          className="h-8"
                          placeholder="#8884d8"
                        />
                      </div>
                    </>
                  )}

                  {component.type === "Bar" && (
                    <>
                      <div>
                        <Label className="text-xs">Data Key</Label>
                        <Select
                          value={component.props?.dataKey || ""}
                          onValueChange={(value) =>
                            updateComponent(index, {
                              ...component,
                              props: { ...component.props, dataKey: value },
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableDataKeys().map((key) => (
                              <SelectItem key={key} value={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fill Color</Label>
                        <Input
                          value={component.props?.fill || ""}
                          onChange={(e) =>
                            updateComponent(index, {
                              ...component,
                              props: {
                                ...component.props,
                                fill: e.target.value,
                              },
                            })
                          }
                          className="h-8"
                          placeholder="#8884d8"
                        />
                      </div>
                    </>
                  )}

                  {component.type === "XAxis" && (
                    <div>
                      <Label className="text-xs">Data Key</Label>
                      <Select
                        value={component.props?.dataKey || ""}
                        onValueChange={(value) =>
                          updateComponent(index, {
                            ...component,
                            props: { ...component.props, dataKey: value },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableDataKeys().map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {editedConfig.components.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No components added. Use the dropdown above to add chart
                components.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartConfigEditor;
