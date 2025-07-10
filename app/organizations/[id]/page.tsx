'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  UsersIcon,
  MailIcon,
  MoreVerticalIcon,
  TrashIcon,
  UserCheckIcon,
} from 'lucide-react';
import { toast } from '@/components/toast';

interface Member {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface OrganizationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const { id } = await params;
      setOrganizationId(id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  const fetchMembers = async () => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      } else {
        toast({
          type: 'error',
          description: 'Failed to fetch members',
        });
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        type: 'error',
        description: 'Failed to fetch members',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast({
        type: 'error',
        description: 'Email is required',
      });
      return;
    }

    if (!organizationId) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Invitation sent successfully',
        });
        setInviteEmail('');
        setInviteRole('member');
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

  const handleUpdateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!organizationId) return;
    
    setUpdatingMember(userId);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole,
          action: 'update_role',
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Member role updated successfully',
        });
        setMembers((prev) =>
          prev.map((member) =>
            member.userId === userId ? { ...member, role: newRole } : member
          )
        );
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to update member role',
        });
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        type: 'error',
        description: 'Failed to update member role',
      });
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organizationId) return;
    
    setUpdatingMember(userId);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'remove_member',
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Member removed successfully',
        });
        setMembers((prev) => prev.filter((member) => member.userId !== userId));
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to remove member',
        });
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        type: 'error',
        description: 'Failed to remove member',
      });
    } finally {
      setUpdatingMember(null);
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Organization Management</h1>
          <p className="text-gray-600 mt-1">
            Manage members and permissions for your organization
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/organizations')}>
          Back to Organizations
        </Button>
      </div>

      {/* Invite Member Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MailIcon className="h-5 w-5" />
            <span>Invite New Member</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteMember} className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div className="w-32">
              <Select
                value={inviteRole}
                onValueChange={(value: 'admin' | 'member') => setInviteRole(value)}
                disabled={inviting}
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
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UsersIcon className="h-5 w-5" />
            <span>Members ({members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <UserCheckIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <div className="font-medium">{member.email}</div>
                    <div className="text-sm text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  {member.role !== 'owner' && (
                    <div className="flex items-center space-x-2">
                      <Select
                        value={member.role}
                        onValueChange={(value: 'admin' | 'member') =>
                          handleUpdateMemberRole(member.userId, value)
                        }
                        disabled={updatingMember === member.userId}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingMember === member.userId}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.email} from the
                              organization?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.userId)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No members found. Invite someone to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
