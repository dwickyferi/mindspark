'use client';

import { useEffect, useState } from 'react';
import { useDataStream } from './data-stream-provider';
import { ResearchProcess } from './research-process';
import type { CustomUIDataTypes } from '@/lib/types';

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
    learningCount?: number;
    duration?: number;
  };
}

interface ResearchProgressStreamProps {
  messageId: string;
  onComplete?: (steps: ResearchStep[]) => void;
}

export function ResearchProgressStream({ messageId, onComplete }: ResearchProgressStreamProps) {
  const { dataStream } = useDataStream();
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!dataStream) return;

    // Process data stream for research steps
    const processDataStream = () => {
      const researchStepParts = dataStream.filter(
        (part) => part.type === 'data-researchStep'
      );

      if (researchStepParts.length === 0) return;

      const steps: ResearchStep[] = [];
      let currentStartTime = startTime;

      researchStepParts.forEach((part) => {
        const stepData = part.data as CustomUIDataTypes['researchStep'];
        
        if (!currentStartTime) {
          currentStartTime = Date.now();
          setStartTime(currentStartTime);
        }

        // Convert the step data to ResearchStep
        const step: ResearchStep = {
          id: stepData.id,
          type: stepData.type,
          title: stepData.title,
          description: stepData.description,
          status: stepData.status,
          details: stepData.details,
          progress: stepData.progress,
          timestamp: stepData.timestamp ? new Date(stepData.timestamp) : new Date(),
          metadata: stepData.metadata,
        };

        // Update existing step or add new one
        const existingIndex = steps.findIndex(s => s.id === step.id);
        if (existingIndex >= 0) {
          steps[existingIndex] = step;
        } else {
          steps.push(step);
        }
      });

      setResearchSteps(steps);

      // Check if research is completed
      const completed = steps.length > 0 && steps.every(step => 
        step.status === 'completed' || step.status === 'failed'
      );

      if (completed && !isCompleted) {
        setIsCompleted(true);
        onComplete?.(steps);
      }
    };

    processDataStream();
  }, [dataStream, startTime, isCompleted, onComplete]);

  if (researchSteps.length === 0) {
    return null;
  }

  const totalDuration = isCompleted && startTime ? 
    Math.max(...researchSteps.map(step => step.timestamp.getTime())) - startTime :
    undefined;

  return (
    <ResearchProcess
      steps={researchSteps}
      isCompleted={isCompleted}
      totalDuration={totalDuration}
    />
  );
}
