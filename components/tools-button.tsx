'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { PlusIcon, SparklesIcon, TerminalIcon, GlobeIcon, MessageIcon, ChartIcon } from './icons';
import { Target } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'built-in' | 'github' | 'external';
}

interface ToolsButtonProps {
  onToolSelect: (tool: Tool) => void;
  disabled?: boolean;
  className?: string;
}

const builtInTools: Tool[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    icon: <GlobeIcon size={14} />,
    category: 'built-in',
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    description: 'Conduct comprehensive research analysis',
    icon: <Target size={14} />,
    category: 'built-in',
  },
  {
    id: 'charts',
    name: 'Charts',
    description: 'Create interactive charts and visualizations',
    icon: <ChartIcon size={14} />,
    category: 'built-in',
  }
];

const mcpTools: Tool[] = [
  {
    id: 'code-execution',
    name: 'Code Execution',
    description: 'Execute code snippets',
    icon: <TerminalIcon size={14} />,
    category: 'built-in',
  },
  {
    id: 'text-generator',
    name: 'Text Generator',
    description: 'Generate text content',
    icon: <MessageIcon size={14} />,
    category: 'built-in',
  },
];

export function ToolsButton({ onToolSelect, disabled = false, className }: ToolsButtonProps) {
  const [open, setOpen] = useState(false);

  const handleToolSelect = (tool: Tool) => {
    onToolSelect(tool);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-full p-2 h-fit hover:bg-input ${className}`}
          disabled={disabled}
        >
          <SparklesIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start" side="top">
        <DropdownMenuLabel className="flex items-center gap-2">
          <SparklesIcon size={14} />
          Tools
        </DropdownMenuLabel>
        <p className="text-xs text-muted-foreground w-full px-2 pb-2">
          Select tools to enhance your conversation
        </p>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Built-in Tools
          </DropdownMenuLabel>
          {builtInTools.map((tool) => (
            <DropdownMenuItem
              key={tool.id}
              className="cursor-pointer flex items-center gap-2 py-2"
              onClick={() => handleToolSelect(tool)}
            >
              {tool.icon}
              <div className="flex flex-col">
                <span className="font-medium">{tool.name}</span>
                <span className="text-xs text-muted-foreground">{tool.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            MCP Tools
          </DropdownMenuLabel>
            {mcpTools.map((tool) => (
                <DropdownMenuItem
                key={tool.id}
                className="cursor-pointer flex items-center gap-2 py-2"
                onClick={() => handleToolSelect(tool)}
                >
                {tool.icon}
                <div className="flex flex-col">
                    <span className="font-medium">{tool.name}</span>
                    <span className="text-xs text-muted-foreground">{tool.description}</span>
                </div>
                </DropdownMenuItem>
            ))}
          
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2 py-2">
          <PlusIcon size={14} />
          <div className="flex flex-col">
            <span className="font-medium">Add Custom Tool</span>
            <span className="text-xs text-muted-foreground">Connect external tools</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
