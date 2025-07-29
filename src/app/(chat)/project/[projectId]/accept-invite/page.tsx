"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Users,
  Crown,
  Shield,
  User,
} from "lucide-react";
import { ProjectRole } from "app-types/project-member";

interface InvitationDetails {
  id: string;
  projectName: string;
  inviterName: string;
  inviterEmail: string;
  role: ProjectRole;
  expiresAt: string;
  isExpired: boolean;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleColors = {
  owner: "destructive",
  admin: "default",
  member: "secondary",
} as const;

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const projectId = params.id as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !projectId) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    // Fetch invitation details
    fetchInvitationDetails();
  }, [token, projectId]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/invitation-details?token=${token}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const invitationData = await response.json();
      setInvitation(invitationData);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load invitation",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !projectId) return;

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/accept-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success("Invitation accepted!", {
        description: "You are now a member of this project.",
      });

      // Redirect to the project page
      router.push(`/project/${projectId}`);
    } catch (error) {
      toast.error("Failed to accept invitation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleIcon = (role: ProjectRole) => {
    const IconComponent = roleIcons[role];
    return <IconComponent className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div className="text-center mt-4">
              <p>Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <div className="text-center mt-4">
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-muted-foreground">
                {error || "This invitation link is invalid or has expired."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-orange-500" />
            </div>
            <div className="text-center mt-4">
              <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
              <p className="text-muted-foreground">
                This invitation expired on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}.
              </p>
              <p className="text-muted-foreground mt-2">
                Please contact the project owner for a new invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Project Invitation</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold text-lg mb-2">
              {invitation.projectName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>You'll join as</span>
              <Badge variant={roleColors[invitation.role]} className="gap-1">
                {getRoleIcon(invitation.role)}
                {invitation.role.charAt(0).toUpperCase() +
                  invitation.role.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Inviter Info */}
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Avatar>
              <AvatarFallback>
                {invitation.inviterName[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{invitation.inviterName}</p>
              <p className="text-sm text-muted-foreground">
                {invitation.inviterEmail}
              </p>
            </div>
          </div>

          {/* Expiration Info */}
          <div className="text-center text-sm text-muted-foreground">
            This invitation expires on{" "}
            {new Date(invitation.expiresAt).toLocaleDateString()} at{" "}
            {new Date(invitation.expiresAt).toLocaleTimeString()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/")}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAcceptInvitation}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
