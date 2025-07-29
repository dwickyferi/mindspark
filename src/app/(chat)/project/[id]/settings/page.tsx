"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { selectProjectByIdAction } from "@/app/api/chat/actions";
import { ProjectMembersManager } from "@/components/project-members-manager";
import { ProjectSystemMessagePopup } from "@/components/project-system-message-popup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Users, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Project } from "app-types/chat";
import { toast } from "sonner";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Fetch project data
  const {
    data: project,
    error,
    mutate: refetchProject,
  } = useSWR(projectId ? `/api/projects/${projectId}` : null, async () => {
    const result = await selectProjectByIdAction(projectId);
    return result;
  });

  const handleDeleteProject = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      toast.success("Project deleted successfully");
      // Redirect to projects list or home
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-red-600">
          Failed to load project. Please try again.
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/project/${projectId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Project Settings
          </h1>
          <p className="text-muted-foreground">
            Manage settings for <strong>{project.name}</strong>
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Basic information about your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <div className="mt-1 p-3 border rounded-md bg-muted">
                  {project.name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Project ID</label>
                <div className="mt-1 p-3 border rounded-md bg-muted font-mono text-sm">
                  {project.id}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Created</label>
                <div className="mt-1 p-3 border rounded-md bg-muted">
                  {new Date(project.createdAt).toLocaleDateString()} at{" "}
                  {new Date(project.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                System Instructions
              </CardTitle>
              <CardDescription>
                Configure how the AI should behave in this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Current Instructions
                  </label>
                  <div className="mt-2 p-3 border rounded-md bg-muted min-h-[100px]">
                    {project.instructions?.systemPrompt ? (
                      <p className="whitespace-pre-wrap text-sm">
                        {project.instructions.systemPrompt}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No system instructions configured
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedProject(project)}
                  variant="outline"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Instructions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Settings */}
        <TabsContent value="members">
          <ProjectMembersManager />
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h3 className="font-medium text-red-800 mb-2">
                  Delete Project
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete a project, there is no going back. This will
                  permanently delete the project, all its conversations,
                  documents, and remove all member access.
                </p>
                <Button variant="destructive" onClick={handleDeleteProject}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete This Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Message Popup */}
      <ProjectSystemMessagePopup
        isOpen={!!selectedProject}
        onOpenChange={() => setSelectedProject(null)}
        projectId={projectId}
        beforeSystemMessage={selectedProject?.instructions?.systemPrompt}
        onSave={() => {
          refetchProject();
          setSelectedProject(null);
        }}
      />
    </div>
  );
}
