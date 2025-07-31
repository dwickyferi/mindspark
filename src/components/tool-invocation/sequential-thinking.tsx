import React from "react";
import { ToolInvocationUIPart } from "app-types/chat";
import JsonView from "ui/json-view";

interface SequentialThinkingToolInvocationProps {
  part: ToolInvocationUIPart["toolInvocation"];
}

export function SequentialThinkingToolInvocation({
  part,
}: SequentialThinkingToolInvocationProps) {
  // Simple fix: just ensure args is never undefined for JsonView
  const safeArgs = part.args || {
    status: "Initializing sequential thinking...",
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        Sequential Thinking Parameters
      </div>
      <JsonView data={safeArgs} />
    </div>
  );
}
