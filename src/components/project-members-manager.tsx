"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { authClient } from "auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Trash2,
} from "lucide-react";
import { ProjectMember, ProjectRole } from "app-types/project-member";
import { fetcher } from "lib/utils";
import useSWR from "swr";

interface InviteMemberForm {
  email: string;
  role: "admin" | "member";
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

export function ProjectMembersManager() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: session } = authClient.useSession();

  const [inviteForm, setInviteForm] = useState<InviteMemberForm>({
    email: "",
    role: "member",
  });
  const [isInviting, setIsInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(
    null,
  );
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRoleChangeDialogOpen, setIsRoleChangeDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<ProjectRole>("member");

  // Fetch project members
  const {
    data: members,
    error,
    mutate: refetchMembers,
  } = useSWR<ProjectMember[]>(
    projectId ? `/api/projects/${projectId}/members` : null,
    fetcher,
  );

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/invite-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();

      toast.success("Invitation sent successfully!", {
        description: `${inviteForm.email} has been invited as ${inviteForm.role}`,
        action: {
          label: "Copy Link",
          onClick: () => {
            navigator.clipboard.writeText(result.invitation.inviteLink);
            toast.success("Invite link copied to clipboard");
          },
        },
      });

      setInviteForm({ email: "", role: "member" });
      refetchMembers();
    } catch (error) {
      toast.error("Failed to send invitation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/change-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success("Role updated successfully");
      refetchMembers();
      setIsRoleChangeDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/remove-member`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success("Member removed successfully");
      refetchMembers();
      setIsRemoveDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRoleIcon = (role: ProjectRole) => {
    const IconComponent = roleIcons[role];
    return <IconComponent className="h-4 w-4" />;
  };

  const canChangeRole = (
    member: ProjectMember,
    currentUserRole?: ProjectRole,
  ) => {
    if (member.role === "owner") return false;
    if (!currentUserRole) return false;
    return currentUserRole === "owner" || currentUserRole === "admin";
  };

  const canRemoveMember = (
    member: ProjectMember,
    currentUserRole?: ProjectRole,
  ) => {
    if (member.role === "owner") return false;
    if (!currentUserRole) return false;
    if (member.role === "admin" && currentUserRole !== "owner") return false;
    return currentUserRole === "owner" || currentUserRole === "admin";
  };

  // Find current user's role
  const currentUserRole = members?.find(
    (m) => m.user?.email === session?.user?.email,
  )?.role;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load members. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Member Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Member
          </CardTitle>
          <CardDescription>
            Invite new members to collaborate on this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="email" className="mb-2">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="role" className="mb-2">
                  Role
                </Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: "admin" | "member") =>
                    setInviteForm({ ...inviteForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Member
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Members</CardTitle>
          <CardDescription>
            Manage who has access to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!members ? (
            <div className="text-center py-8">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.image} />
                          <AvatarFallback>
                            {member.user?.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.user?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.user?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={roleColors[member.role]}
                        className="gap-1"
                      >
                        {getRoleIcon(member.role)}
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canChangeRole(member, currentUserRole) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member);
                                  setNewRole(
                                    member.role === "admin"
                                      ? "member"
                                      : "admin",
                                  );
                                  setIsRoleChangeDialogOpen(true);
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                            )}
                            {canRemoveMember(member, currentUserRole) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member);
                                  setIsRemoveDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog
        open={isRoleChangeDialogOpen}
        onOpenChange={setIsRoleChangeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to change {selectedMember?.user?.name}
              &apos;s role to <strong>{newRole}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleChangeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleChangeRole}>Change Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.user?.name} from
              this project? They will lose access to all project resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
