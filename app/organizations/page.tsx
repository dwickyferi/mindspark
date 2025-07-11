'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BuildingIcon,
  UsersIcon,
  SettingsIcon,
  TrashIcon,
  PlusIcon,
  MailIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { toast } from '@/components/toast';

interface Organization {
  id: string;
  name: string;
  description?: string;
  role: string;
  memberCount: number;
  createdAt: string;
  ownerId: string;
}

interface PendingInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    description?: string;
  };
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Organization editing state
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Add member state
  const [addMemberOrgId, setAddMemberOrgId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  // Invitation handling state
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
    fetchPendingInvitations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else {
        toast({
          type: 'error',
          description: 'Failed to fetch organizations',
        });
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        type: 'error',
        description: 'Failed to fetch organizations',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch('/api/organizations/invitations');
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data);
      } else {
        console.error('Failed to fetch pending invitations');
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const handleDeleteOrganization = async (organizationId: string) => {
    setDeletingId(organizationId);
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Organization deleted successfully',
        });
        setOrganizations((prev) => prev.filter((org) => org.id !== organizationId));
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to delete organization',
        });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        type: 'error',
        description: 'Failed to delete organization',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditOrganization = (org: Organization) => {
    setEditingOrg(org);
    setEditName(org.name);
    setEditDescription(org.description || '');
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          action: 'update_details',
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Organization updated successfully',
        });
        setOrganizations((prev) =>
          prev.map((org) =>
            org.id === editingOrg.id
              ? { ...org, name: editName.trim(), description: editDescription.trim() }
              : org
          )
        );
        setEditingOrg(null);
        setEditName('');
        setEditDescription('');
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to update organization',
        });
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        type: 'error',
        description: 'Failed to update organization',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberOrgId || !memberEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/organizations/${addMemberOrgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: memberEmail.trim(),
          role: memberRole,
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Member invitation sent successfully',
        });
        setAddMemberOrgId(null);
        setMemberEmail('');
        setMemberRole('member');
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to send invitation',
        });
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        type: 'error',
        description: 'Failed to send invitation',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, token: string) => {
    setProcessingInvitation(invitationId);
    try {
      const response = await fetch('/api/organizations/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Invitation accepted successfully',
        });
        // Remove the invitation from pending list
        setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        // Refresh organizations list
        fetchOrganizations();
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to accept invitation',
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        type: 'error',
        description: 'Failed to accept invitation',
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    try {
      const response = await fetch(`/api/organizations/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Invitation declined',
        });
        // Remove the invitation from pending list
        setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to decline invitation',
        });
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        type: 'error',
        description: 'Failed to decline invitation',
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="text-gray-600 mt-1">
              Manage your organizations and team collaboration
            </p>
          </div>
          <Button onClick={() => router.push('/organizations/new')}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MailIcon className="h-5 w-5 mr-2" />
                Pending Invitations ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20"
                  >
                    <div className="flex items-center space-x-3">
                      <BuildingIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {invitation.organization.name}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Invited as {invitation.role} • 
                          {' '}Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                        {invitation.organization.description && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            {invitation.organization.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(invitation.id, invitation.token)}
                        disabled={processingInvitation === invitation.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        {processingInvitation === invitation.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        disabled={processingInvitation === invitation.id}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        <XIcon className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BuildingIcon className="h-6 w-6" />
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      {org.description && (
                        <p className="text-sm text-gray-600 mt-1">{org.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(org.role)}>
                      {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <UsersIcon className="h-4 w-4" />
                      <span>{org.memberCount} members</span>
                    </div>
                    <div>
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/organizations/${org.id}`)}
                    >
                      <SettingsIcon className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                    {org.role === 'owner' && (
                      <>
                        <Dialog 
                          open={editingOrg?.id === org.id} 
                          onOpenChange={(open: boolean) => {
                            if (!open) {
                              setEditingOrg(null);
                              setEditName('');
                              setEditDescription('');
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOrganization(org)}
                            >
                              <SettingsIcon className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Organization</DialogTitle>
                              <DialogDescription>
                                Update the organization name and description.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateOrganization} className="space-y-4">
                              <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                  id="name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Organization name"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Organization description (optional)"
                                  rows={3}
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOrg(null);
                                    setEditName('');
                                    setEditDescription('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={updating}>
                                  {updating ? 'Updating...' : 'Update'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Dialog 
                          open={addMemberOrgId === org.id} 
                          onOpenChange={(open: boolean) => {
                            if (!open) {
                              setAddMemberOrgId(null);
                              setMemberEmail('');
                              setMemberRole('member');
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAddMemberOrgId(org.id)}
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Member</DialogTitle>
                              <DialogDescription>
                                Send an invitation to add a new member to this organization.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddMember} className="space-y-4">
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={memberEmail}
                                  onChange={(e) => setMemberEmail(e.target.value)}
                                  placeholder="Enter email address"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="role">Role</Label>
                                <Select
                                  value={memberRole}
                                  onValueChange={(value: 'admin' | 'member') => setMemberRole(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setAddMemberOrgId(null);
                                    setMemberEmail('');
                                    setMemberRole('member');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={inviting}>
                                  {inviting ? 'Inviting...' : 'Send Invitation'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={deletingId === org.id}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                              <AlertDialogDescription>                              Are you sure you want to delete &quot;{org.name}&quot;? This action
                              cannot be undone and will remove all organization data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrganization(org.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {organizations.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <BuildingIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Organizations</h3>
                <p className="text-gray-600 mb-4">
                  Create your first organization to start collaborating with your team
                </p>
                <Button onClick={() => router.push('/organizations/new')}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
