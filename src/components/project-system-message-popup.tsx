"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "ui/dialog";

import { Button } from "ui/button";
import { Loader, Sparkles } from "lucide-react";
import { Textarea } from "ui/textarea";
import { useEffect, useState } from "react";
import { safe } from "ts-safe";
import {
  updateProjectAction,
  generateSystemInstructionAction,
} from "@/app/api/chat/actions";
import { toast } from "sonner";
import { handleErrorWithToast } from "ui/shared-toast";
import { useTranslations } from "next-intl";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

interface ProjectSystemMessagePopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (systemPrompt: string) => void;
  projectId: string;
  beforeSystemMessage?: string;
}

export function ProjectSystemMessagePopup({
  isOpen,
  onOpenChange,
  onSave,
  projectId,
  beforeSystemMessage,
}: ProjectSystemMessagePopupProps) {
  const t = useTranslations();
  const [systemPrompt, setSystemPrompt] = useState(beforeSystemMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmType, setConfirmType] = useState<"replace" | "enhance">(
    "replace",
  );

  const [chatModel] = appStore(useShallow((state) => [state.chatModel]));

  const handleSave = async () => {
    safe(() => setIsLoading(true))
      .map(() =>
        updateProjectAction(projectId, { instructions: { systemPrompt } }),
      )
      .watch(() => setIsLoading(false))
      .ifOk(() => onSave(systemPrompt))
      .ifOk(() => toast.success(t("Chat.Project.projectInstructionsUpdated")))
      .ifOk(() => onOpenChange(false))
      .ifFail(handleErrorWithToast);
  };

  const handleGeneratePrompt = async () => {
    const hasContent = systemPrompt.trim().length > 0;
    if (hasContent) {
      setConfirmType("enhance");
      setShowConfirmDialog(true);
    } else {
      await generatePrompt();
    }
  };

  const generatePrompt = async () => {
    setIsGenerating(true);
    safe(() =>
      generateSystemInstructionAction({
        model: chatModel,
        existingContent: confirmType === "enhance" ? systemPrompt : undefined,
      }),
    )
      .watch(() => setIsGenerating(false))
      .ifOk((generatedPrompt) => {
        setSystemPrompt(generatedPrompt);
        toast.success(t("Chat.Project.promptGeneratedSuccessfully"));
      })
      .ifFail(() => {
        toast.error(t("Chat.Project.failedToGeneratePrompt"));
      });
  };

  const handleConfirmGenerate = async () => {
    setShowConfirmDialog(false);
    await generatePrompt();
  };

  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(beforeSystemMessage || "");
    }
  }, [isOpen, beforeSystemMessage]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card w-full sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("Chat.Project.projectInstructions")}</DialogTitle>
          <DialogDescription asChild>
            <div className="py-4">
              <p className="font-semibold mb-2">
                {t("Chat.Project.howCanTheChatBotBestHelpYouWithThisProject")}
              </p>
              {t(
                "Chat.Project.youCanAskTheChatBotToFocusOnASpecificTopicOrToRespondInAParticularToneOrFormat",
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePrompt}
                  disabled={isGenerating || isLoading}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {isGenerating
                    ? t("Chat.Project.generatingPrompt")
                    : t("Chat.Project.generatePrompt")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("Chat.Project.autoGenerateHelpfulSystemInstruction")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            autoFocus
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="e.g. You are a Korean travel guide ChatBot. Respond only in Korean, include precise times for every itinerary item, and present transportation, budget, and dining recommendations succinctly in a table format."
            className="resize-none min-h-[200px] max-h-[400px] w-full"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="ghost">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isLoading || !systemPrompt.trim()}
            onClick={handleSave}
            variant={"secondary"}
          >
            {isLoading && <Loader className="size-4 animate-spin" />}
            {t("Common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card w-full sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("Chat.Project.generatePrompt")}</DialogTitle>
            <DialogDescription>
              {confirmType === "enhance"
                ? t("Chat.Project.enhanceExistingContent")
                : t("Chat.Project.replaceExistingContent")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t("Common.cancel")}</Button>
            </DialogClose>
            <Button onClick={handleConfirmGenerate} variant="secondary">
              {t("Common.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
