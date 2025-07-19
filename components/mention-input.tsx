'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPortal } from 'react-dom';
import { SparklesIcon, GlobeIcon, TerminalIcon, MessageIcon, CrossSmallIcon } from './icons';

interface MentionTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'built-in' | 'github' | 'external';
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect: (mention: MentionTool) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface MentionSuggestionProps {
  onSelectMention: (mention: MentionTool) => void;
  onClose: () => void;
  top: number;
  left: number;
}

const availableTools: MentionTool[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    icon: <GlobeIcon size={14} />,
    category: 'built-in',
  },
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
  {
    id: 'github-search',
    name: 'GitHub Search',
    description: 'Search GitHub repositories and code',
    icon: <SparklesIcon size={14} />,
    category: 'github',
  },
];

function MentionSuggestion({ onSelectMention, onClose, top, left }: MentionSuggestionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTools = availableTools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const builtInTools = filteredTools.filter(tool => tool.category === 'built-in');
  const githubTools = filteredTools.filter(tool => tool.category === 'github');

  return createPortal(
    <div
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg p-2 w-80 max-h-60 overflow-y-auto"
      style={{
        top,
        left,
      }}
    >
      <input
        type="text"
        placeholder="Search tools..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Backspace' && !searchTerm) {
            onClose();
          }
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        className="w-full p-2 text-sm border border-input rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
        autoFocus
      />
      
      {filteredTools.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-2">
          No tools found.
        </div>
      ) : (
        <div className="space-y-2">
          {builtInTools.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
                Built-in Tools
              </div>
              {builtInTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => onSelectMention(tool)}
                  className="cursor-pointer p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-2 w-full">
                    {tool.icon}
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-sm">{tool.name}</span>
                      <span className="text-xs text-muted-foreground">{tool.description}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {githubTools.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
                GitHub Tools
              </div>
              {githubTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => onSelectMention(tool)}
                  className="cursor-pointer p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-2 w-full">
                    {tool.icon}
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-sm">{tool.name}</span>
                      <span className="text-xs text-muted-foreground">{tool.description}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

export function MentionInput({ 
  value, 
  onChange, 
  onMentionSelect, 
  placeholder = "Type @ to mention tools...",
  disabled = false,
  className = ""
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for @ symbol
    const atIndex = newValue.lastIndexOf('@', cursorPosition - 1);
    if (atIndex !== -1) {
      const textAfterAt = newValue.substring(atIndex + 1, cursorPosition);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        // Calculate position for suggestion popup
        const textarea = textareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setSuggestionPosition({
            top: rect.top - 10,
            left: rect.left + 10,
          });
          setMentionStart(atIndex);
          setShowSuggestions(true);
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [onChange]);

  const handleMentionSelect = useCallback((mention: MentionTool) => {
    if (mentionStart === -1) return;
    
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(textareaRef.current?.selectionStart || mentionStart);
    
    const newValue = `${beforeMention}@${mention.name} ${afterMention}`;
    onChange(newValue);
    onMentionSelect(mention);
    setShowSuggestions(false);
    setMentionStart(-1);
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [value, onChange, onMentionSelect, mentionStart]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    }
  }, [showSuggestions]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted border border-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        rows={1}
      />
      
      {showSuggestions && (
        <MentionSuggestion
          onSelectMention={handleMentionSelect}
          onClose={() => setShowSuggestions(false)}
          top={suggestionPosition.top}
          left={suggestionPosition.left}
        />
      )}
    </div>
  );
}

export function MentionBadge({ 
  mention, 
  onRemove 
}: { 
  mention: MentionTool; 
  onRemove: () => void; 
}) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1">
      {mention.icon}
      <span className="text-xs">{mention.name}</span>
      <Button
        variant="ghost"
        size="sm"
        className="size-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
        onClick={onRemove}
      >
        <CrossSmallIcon size={10} />
      </Button>
    </Badge>
  );
}
