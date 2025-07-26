"use client";
import { SidebarMenuButton, useSidebar } from "ui/sidebar";
import { Tooltip } from "ui/tooltip";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";

import { SidebarGroup } from "ui/sidebar";
import Link from "next/link";
import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { WriteIcon } from "ui/write-icon";
import {
  Waypoints,
  ChevronDown,
  Database,
  BarChart3,
  Layers,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";

export function AppSidebarMenus() {
  const router = useRouter();
  const t = useTranslations("Layout");
  const { setOpenMobile } = useSidebar();
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isMindsparkStudioOpen, setIsMindsparkStudioOpen] = useState(false);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem className="mb-1">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMobile(false);
                  router.push(`/`);
                  router.refresh();
                }}
              >
                <SidebarMenuButton className="flex font-semibold group/new-chat bg-input/20 border border-border/40">
                  <WriteIcon className="size-4" />
                  {t("newChat")}
                  <div className="flex items-center gap-1 text-xs font-medium ml-auto opacity-0 group-hover/new-chat:opacity-100 transition-opacity">
                    {getShortcutKeyList(Shortcuts.openNewChat).map((key) => (
                      <span
                        key={key}
                        className="border w-5 h-5 flex items-center justify-center bg-accent rounded"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <Link href="/mcp">
                <SidebarMenuButton className="font-semibold">
                  <MCPIcon className="size-4 fill-accent-foreground" />
                  {t("mcpConfiguration")}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>

        {/* Workflow Section */}
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="font-semibold"
                onClick={() => setIsWorkflowOpen(!isWorkflowOpen)}
              >
                <Waypoints className="size-4" />
                {t("workflow")}
                <ChevronDown
                  className={`size-4 ml-auto transition-transform ${
                    isWorkflowOpen ? "transform rotate-180" : ""
                  }`}
                />
              </SidebarMenuButton>
              {isWorkflowOpen && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/workflow">
                        <Waypoints className="size-4" />
                        Workflow Builder
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>

        {/* MindSpark Studio Section */}
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="font-semibold"
                onClick={() => setIsMindsparkStudioOpen(!isMindsparkStudioOpen)}
              >
                <LayoutDashboard className="size-4" />
                MindSpark Studio
                <ChevronDown
                  className={`size-4 ml-auto transition-transform ${
                    isMindsparkStudioOpen ? "transform rotate-180" : ""
                  }`}
                />
              </SidebarMenuButton>
              {isMindsparkStudioOpen && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/studio/datasets">
                        <Database className="size-4" />
                        MindSpark Datasets
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/studio">
                        <MessageSquare className="size-4" />
                        Text-to-SQL Chat
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/studio/charts">
                        <BarChart3 className="size-4" />
                        Chart Library
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/studio/dashboards">
                        <Layers className="size-4" />
                        Dashboards
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
