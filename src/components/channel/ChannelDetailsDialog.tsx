import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AvatarWithStatus } from '@/components/user/OnlineIndicator';
import { 
  useChannelNotificationPreference, 
  useUpdateChannelNotificationPreference,
  NotificationLevel,
} from '@/hooks/useChannelNotificationPreferences';
import {
  useChannelMembers,
  useCurrentChannelRole,
  useUpdateChannelMemberRole,
  useRemoveChannelMember,
  useAddChannelMember,
  getRoleLabel,
  getRoleBadgeVariant,
  ChannelRole,
} from '@/hooks/useChannelMembers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
} from '@/components/ui/alert-dialog';
import { 
  Hash, 
  Users, 
  Info, 
  Pin, 
  Edit2, 
  Save, 
  X,
  Loader2,
  UserPlus,
  LogOut,
  Bell,
  BellOff,
  AtSign,
  Crown,
  Shield,
  User,
  UserMinus,
  Settings,
  Lock,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface ChannelDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
}

export function ChannelDetailsDialog({ 
  open, 
  onClose, 
  channelId,
  channelName,
}: ChannelDetailsDialogProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();
  
  const [isEditingMural, setIsEditingMural] = useState(false);
  const [muralContent, setMuralContent] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // Fetch notification preference for this channel
  const { data: notificationPref } = useChannelNotificationPreference(channelId);
  const updateNotificationPref = useUpdateChannelNotificationPreference();

  // Fetch channel role hooks
  const { data: currentUserRole } = useCurrentChannelRole(channelId);
  const { data: channelMembers = [], isLoading: loadingChannelMembers } = useChannelMembers(channelId);
  const updateMemberRole = useUpdateChannelMemberRole();
  const removeMember = useRemoveChannelMember();
  const addMember = useAddChannelMember();

  // Fetch workspace members for adding to channel
  const { data: workspaceMembers = [] } = useWorkspaceMembers(currentWorkspace?.id || null);

  // Fetch channel details
  const { data: channel, isLoading: loadingChannel } = useQuery({
    queryKey: ['channel-details', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!channelId && open,
  });

  // Fetch channel members for public channels (all workspace members)
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      // For public channels, get all workspace members
      // For private channels, get channel_members with roles
      if (!channel?.is_private) {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(`
            user_id,
            role,
            profiles:user_id (
              id,
              display_name,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq('workspace_id', currentWorkspace?.id);

        if (error) throw error;
        return (data || []).map((m: any) => ({
          id: m.profiles?.id,
          display_name: m.profiles?.display_name,
          avatar_url: m.profiles?.avatar_url,
          status: m.profiles?.status,
          last_seen: m.profiles?.last_seen,
          role: m.role,
        }));
      } else {
        // Return empty - we'll use channelMembers for private channels
        return [];
      }
    },
    enabled: !!channelId && !!channel && open,
  });

  // Update mural mutation
  const updateMuralMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('channels')
        .update({
          mural_content: content,
          mural_updated_at: new Date().toISOString(),
          mural_updated_by: user?.id,
        })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-details', channelId] });
      setIsEditingMural(false);
      toast.success('Mural atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar mural');
    },
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async (desc: string) => {
      const { error } = await supabase
        .from('channels')
        .update({ description: desc })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-details', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setIsEditingDescription(false);
      toast.success('Descrição atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar descrição');
    },
  });

  // Leave channel mutation (for private channels)
  const leaveChannelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Você saiu do canal');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao sair do canal');
    },
  });

  // Toggle privacy mutation
  const togglePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      // If making private, first add creator as owner
      if (isPrivate && !channel?.is_private) {
        // Add current user as owner of the private channel
        await supabase
          .from('channel_members')
          .upsert({
            channel_id: channelId,
            user_id: user?.id,
            role: 'owner',
          }, { onConflict: 'channel_id,user_id' });
      }

      const { error } = await supabase
        .from('channels')
        .update({ is_private: isPrivate })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: (_, isPrivate) => {
      queryClient.invalidateQueries({ queryKey: ['channel-details', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      toast.success(isPrivate ? 'Canal agora é privado' : 'Canal agora é público');
    },
    onError: () => {
      toast.error('Erro ao alterar privacidade do canal');
    },
  });

  useEffect(() => {
    if (channel) {
      setMuralContent(channel.mural_content || '');
      setDescription(channel.description || '');
    }
  }, [channel]);

  // Check permissions
  const isCreator = channel?.created_by === user?.id;
  const isChannelAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isChannelOwner = currentUserRole === 'owner';
  const canManageMembers = isCreator || isChannelAdmin;
  const canChangeRoles = isCreator || isChannelOwner;

  // Get members not in channel for adding
  const membersNotInChannel = workspaceMembers.filter(
    (wm) => !channelMembers.some((cm) => cm.user_id === wm.user_id)
  );

  const getRoleIcon = (role: ChannelRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  if (loadingChannel) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              {channelName}
              {channel?.is_private && (
                <Badge variant="secondary" className="text-xs">Privado</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="about" className="gap-2">
                <Info className="h-4 w-4" />
                Sobre
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Alertas
              </TabsTrigger>
              <TabsTrigger value="mural" className="gap-2">
                <Pin className="h-4 w-4" />
                Mural
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Membros
              </TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Descrição</h4>
                  {(isCreator || isChannelAdmin) && !isEditingDescription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição para o canal..."
                      className="rounded-xl"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDescription(channel?.description || '');
                          setIsEditingDescription(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateDescriptionMutation.mutate(description)}
                        disabled={updateDescriptionMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {channel?.description || 'Nenhuma descrição'}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Informações</h4>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>Criado em: {new Date(channel?.created_at || '').toLocaleDateString('pt-BR')}</p>
                  <p>Membros: {channel?.is_private ? channelMembers.length : members.length}</p>
                  {currentUserRole && (
                    <p className="flex items-center gap-2">
                      Sua função: 
                      <Badge variant={getRoleBadgeVariant(currentUserRole)} className="gap-1">
                        {getRoleIcon(currentUserRole)}
                        {getRoleLabel(currentUserRole)}
                      </Badge>
                    </p>
                  )}
                </div>
              </div>

              {/* Privacy Toggle */}
              {(isCreator || isChannelOwner) && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {channel?.is_private ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {channel?.is_private ? 'Canal Privado' : 'Canal Público'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {channel?.is_private 
                            ? 'Apenas membros convidados podem ver e participar' 
                            : 'Todos do workspace podem ver e participar'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={channel?.is_private || false}
                      onCheckedChange={(checked) => togglePrivacyMutation.mutate(checked)}
                      disabled={togglePrivacyMutation.isPending}
                    />
                  </div>
                </>
              )}

              {channel?.is_private && !isChannelOwner && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    className="w-full rounded-xl"
                    onClick={() => leaveChannelMutation.mutate()}
                    disabled={leaveChannelMutation.isPending}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair do Canal
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Preferência de Notificação</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Configure quando você quer ser notificado sobre mensagens neste canal
                  </p>
                  <Select
                    value={notificationPref?.notification_level || 'all'}
                    onValueChange={(value: NotificationLevel) => {
                      updateNotificationPref.mutate({
                        channelId,
                        notificationLevel: value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <span>Todas as mensagens</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mentions">
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4" />
                          <span>Apenas menções</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <BellOff className="h-4 w-4" />
                          <span>Silenciado</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="bg-secondary/50 rounded-xl p-4">
                  <h5 className="text-sm font-medium mb-2">Descrição das opções:</h5>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <Bell className="h-3 w-3 mt-0.5 shrink-0" />
                      <span><strong>Todas:</strong> Você receberá notificações de todas as mensagens</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AtSign className="h-3 w-3 mt-0.5 shrink-0" />
                      <span><strong>Menções:</strong> Apenas quando for mencionado com @</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BellOff className="h-3 w-3 mt-0.5 shrink-0" />
                      <span><strong>Silenciado:</strong> Nenhuma notificação deste canal</span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Mural Tab */}
            <TabsContent value="mural" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Mural do Canal</h4>
                {(isCreator || isChannelAdmin) && !isEditingMural && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingMural(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isEditingMural ? (
                <div className="space-y-2">
                  <Textarea
                    value={muralContent}
                    onChange={(e) => setMuralContent(e.target.value)}
                    placeholder="Adicione informações importantes para fixar no canal..."
                    className="rounded-xl"
                    rows={6}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMuralContent(channel?.mural_content || '');
                        setIsEditingMural(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateMuralMutation.mutate(muralContent)}
                      disabled={updateMuralMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : channel?.mural_content ? (
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-sm whitespace-pre-wrap">{channel.mural_content}</p>
                  {channel.mural_updated_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Atualizado em {new Date(channel.mural_updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma informação fixada no mural
                </p>
              )}
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-4">
              {/* Add Member Button for Private Channels */}
              {channel?.is_private && canManageMembers && membersNotInChannel.length > 0 && (
                <div className="mb-4">
                  {showAddMember ? (
                    <div className="space-y-2 p-3 bg-secondary/50 rounded-xl">
                      <h5 className="text-sm font-medium">Adicionar membro</h5>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {membersNotInChannel.map((member) => (
                            <button
                              key={member.user_id}
                              onClick={() => {
                                addMember.mutate({
                                  channelId,
                                  userId: member.user_id,
                                  role: 'member',
                                });
                                setShowAddMember(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(member.profile?.display_name || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {member.profile?.display_name || 'Usuário'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddMember(false)}
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => setShowAddMember(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Membro
                    </Button>
                  )}
                </div>
              )}

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {(channel?.is_private ? loadingChannelMembers : loadingMembers) ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (channel?.is_private ? channelMembers : members).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum membro encontrado
                    </p>
                  ) : channel?.is_private ? (
                    // Private channel members with roles
                    channelMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 group"
                      >
                        <AvatarWithStatus
                          status={member.profile?.status || 'offline'}
                          lastSeen={member.profile?.last_seen}
                          indicatorSize="sm"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="gradient-primary text-white">
                              {(member.profile?.display_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </AvatarWithStatus>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.profile?.display_name || 'Usuário'}
                            {member.user_id === user?.id && (
                              <span className="text-xs text-muted-foreground ml-1">(você)</span>
                            )}
                          </p>
                          <Badge 
                            variant={getRoleBadgeVariant(member.role)} 
                            className="text-xs gap-1"
                          >
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                        
                        {/* Role Management */}
                        {canChangeRoles && member.user_id !== user?.id && member.role !== 'owner' && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Select
                              value={member.role}
                              onValueChange={(value: ChannelRole) => {
                                if (value !== 'owner') {
                                  updateMemberRole.mutate({
                                    memberId: member.id,
                                    channelId,
                                    newRole: value,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setMemberToRemove({
                                id: member.id,
                                name: member.profile?.display_name || 'Usuário',
                              })}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    // Public channel members (workspace members)
                    members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50"
                      >
                        <AvatarWithStatus
                          status={member.status}
                          lastSeen={member.last_seen}
                          indicatorSize="sm"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="gradient-primary text-white">
                              {(member.display_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </AvatarWithStatus>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.display_name || 'Usuário'}
                          </p>
                          {member.role === 'admin' && (
                            <span className="text-xs text-primary">Admin do Workspace</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{memberToRemove?.name}</strong> do canal?
              Esta ação pode ser desfeita adicionando o membro novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (memberToRemove) {
                  removeMember.mutate({
                    memberId: memberToRemove.id,
                    channelId,
                  });
                  setMemberToRemove(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
