import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AvatarWithStatus } from '@/components/user/OnlineIndicator';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

  // Fetch channel members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      // For public channels, get all workspace members
      // For private channels, get channel_members
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
        const { data, error } = await supabase
          .from('channel_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              display_name,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq('channel_id', channelId);

        if (error) throw error;
        return (data || []).map((m: any) => ({
          id: m.profiles?.id,
          display_name: m.profiles?.display_name,
          avatar_url: m.profiles?.avatar_url,
          status: m.profiles?.status,
          last_seen: m.profiles?.last_seen,
        }));
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

  useEffect(() => {
    if (channel) {
      setMuralContent(channel.mural_content || '');
      setDescription(channel.description || '');
    }
  }, [channel]);

  const isAdmin = channel?.created_by === user?.id;

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            {channelName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about" className="gap-2">
              <Info className="h-4 w-4" />
              Sobre
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
                {isAdmin && !isEditingDescription && (
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
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Tipo: {channel?.is_private ? 'Privado' : 'Público'}</p>
                <p>Criado em: {new Date(channel?.created_at || '').toLocaleDateString('pt-BR')}</p>
                <p>Membros: {members.length}</p>
              </div>
            </div>

            {channel?.is_private && !isAdmin && (
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

          {/* Mural Tab */}
          <TabsContent value="mural" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Mural do Canal</h4>
              {isAdmin && !isEditingMural && (
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
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {loadingMembers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro encontrado
                  </p>
                ) : (
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
                          <span className="text-xs text-primary">Admin</span>
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
  );
}
