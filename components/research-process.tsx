'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Brain, 
  FileText, 
  Target, 
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface ResearchStep {
  id: string;
  type: 'strategy' | 'search' | 'analyze' | 'synthesize' | 'report';
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details?: string;
  progress?: number;
  timestamp: Date;
  metadata?: {
    queryCount?: number;
    sourceCount?: number;
    depth?: number;
    breadth?: number;
  };
}

interface ResearchProcessProps {
  steps: ResearchStep[];
  currentStep?: string;
  isCompleted?: boolean;
  totalDuration?: number;
  onToggleExpand?: () => void;
}

const getStepIcon = (type: ResearchStep['type'], status: ResearchStep['status']) => {
  const iconClass = "h-4 w-4";
  
  if (status === 'in-progress') {
    return <Loader2 className={`${iconClass} animate-spin`} />;
  }
  
  if (status === 'completed') {
    return <CheckCircle2 className={`${iconClass} text-green-500`} />;
  }
  
  switch (type) {
    case 'strategy':
      return <Target className={iconClass} />;
    case 'search':
      return <Search className={iconClass} />;
    case 'analyze':
      return <Brain className={iconClass} />;
    case 'synthesize':
      return <Lightbulb className={iconClass} />;
    case 'report':
      return <FileText className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
};

const getStepColor = (status: ResearchStep['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'in-progress':
      return 'bg-blue-50 border-blue-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export function ResearchProcess({ 
  steps, 
  currentStep, 
  isCompleted = false,
  totalDuration,
  onToggleExpand 
}: ResearchProcessProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const inProgressSteps = steps.filter(step => step.status === 'in-progress').length;
  const totalSteps = steps.length;

  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleExpand?.();
  };

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
              )}
              <CardTitle className="text-lg font-semibold">
                {isCompleted ? 'Research Complete' : 'Deep Research in Progress'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedSteps}/{totalSteps} steps
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round(overallProgress)}% complete
            </Badge>
            {totalDuration && (
              <Badge variant="outline" className="text-xs">
                {formatDuration(totalDuration)}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <motion.div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
          />
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border transition-all duration-200 ${getStepColor(step.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStepIcon(step.type, step.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {step.status === 'in-progress' 
                              ? `${formatDuration(currentTime - step.timestamp.getTime())}` 
                              : step.status === 'completed' 
                                ? '✓' 
                                : '⏳'
                            }
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.description}
                        </p>
                        
                        {step.details && (
                          <div className="mt-2 text-xs bg-white/50 p-2 rounded border">
                            {step.details}
                          </div>
                        )}
                        
                        {step.metadata && (
                          <div className="flex gap-2 mt-2">
                            {step.metadata.queryCount && (
                              <Badge variant="secondary" className="text-xs">
                                {step.metadata.queryCount} queries
                              </Badge>
                            )}
                            {step.metadata.sourceCount && (
                              <Badge variant="secondary" className="text-xs">
                                {step.metadata.sourceCount} sources
                              </Badge>
                            )}
                            {step.metadata.depth && (
                              <Badge variant="secondary" className="text-xs">
                                depth {step.metadata.depth}
                              </Badge>
                            )}
                            {step.metadata.breadth && (
                              <Badge variant="secondary" className="text-xs">
                                breadth {step.metadata.breadth}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {step.progress !== undefined && step.status === 'in-progress' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <motion.div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${step.progress}%` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${step.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {inProgressSteps > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-2"
                  >
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Research in progress...
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Hook for managing research process state
export function useResearchProcess() {
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  const addStep = (step: Omit<ResearchStep, 'id' | 'timestamp'>) => {
    const newStep: ResearchStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setSteps(prev => [...prev, newStep]);
    return newStep.id;
  };

  const updateStep = (id: string, updates: Partial<ResearchStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const completeStep = (id: string, details?: string) => {
    updateStep(id, { status: 'completed', details });
  };

  const failStep = (id: string, error: string) => {
    updateStep(id, { status: 'failed', details: error });
  };

  const setStepProgress = (id: string, progress: number) => {
    updateStep(id, { progress });
  };

  const complete = () => {
    setIsCompleted(true);
    setCurrentStep(undefined);
  };

  const reset = () => {
    setSteps([]);
    setCurrentStep(undefined);
    setIsCompleted(false);
  };

  const totalDuration = isCompleted ? Date.now() - startTime : undefined;

  return {
    steps,
    currentStep,
    isCompleted,
    totalDuration,
    addStep,
    updateStep,
    completeStep,
    failStep,
    setStepProgress,
    setCurrentStep,
    complete,
    reset,
  };
}
