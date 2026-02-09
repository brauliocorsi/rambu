import { useState, useEffect } from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useUpdateWorkspace, useDeleteWorkspace } from '@/hooks/useWorkspaces';
import { useLeaveWorkspace } from '@/hooks/useLeaveWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Camera, Loader2, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceSettingsDialog({ open, onClose }: WorkspaceSettingsDialogProps) {
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspaceContext();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const leaveWorkspaceMutation = useLeaveWorkspace();
  
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [description, setDescription] = useState(currentWorkspace?.description || '');
  const [iconUrl, setIconUrl] = useState(currentWorkspace?.icon_url || '');
  const [allowMemberChannels, setAllowMemberChannels] = useState(currentWorkspace?.allow_member_channels ?? true);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setDescription(currentWorkspace.description || '');
      setIconUrl(currentWorkspace.icon_url || '');
      setAllowMemberChannels(currentWorkspace.allow_member_channels ?? true);
    }
  }, [currentWorkspace]);

  const isOwner = currentWorkspace?.created_by === user?.id;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `workspace-${currentWorkspace.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      setIconUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!currentWorkspace || !name.trim()) return;

    updateWorkspaceMutation.mutate({
      id: currentWorkspace.id,
      name: name.trim(),
      description: description.trim() || null,
      icon_url: iconUrl || null,
      allow_member_channels: allowMemberChannels,
    }, {
      onSuccess: () => {
        toast.success('Workspace atualizado!');
        onClose();
      },
    });
  };

  const handleDelete = () => {
    if (!currentWorkspace) return;

    deleteWorkspaceMutation.mutate(currentWorkspace.id, {
      onSuccess: () => {
        setCurrentWorkspace(null);
        onClose();
      },
    });
  };

  const handleLeave = () => {
    if (!currentWorkspace) return;

    leaveWorkspaceMutation.mutate(currentWorkspace.id, {
      onSuccess: () => {
        // Select another workspace or null
        const remainingWorkspaces = workspaces.filter(w => w.id !== currentWorkspace.id);
        setCurrentWorkspace(remainingWorkspaces[0] || null);
        onClose();
      },
    });
  };

  if (!currentWorkspace) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações do Workspace</DialogTitle>
            <DialogDescription>
              {isOwner ? 'Edite as informações do workspace' : 'Visualize as informações do workspace'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Icon */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 rounded-xl">
                  <AvatarImage src={iconUrl || undefined} />
                  <AvatarFallback className="rounded-xl gradient-primary text-white text-2xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Workspace</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do workspace"
                className="rounded-xl"
                disabled={!isOwner}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do workspace"
                className="rounded-xl resize-none"
                rows={3}
                disabled={!isOwner}
              />
            </div>

            {/* Channel creation permission - Only for owner */}
            {isOwner && (
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-channels">Membros podem criar canais</Label>
                  <p className="text-xs text-muted-foreground">
                    Se desativado, apenas administradores podem criar canais
                  </p>
                </div>
                <Switch
                  id="allow-channels"
                  checked={allowMemberChannels}
                  onCheckedChange={setAllowMemberChannels}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isOwner ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowLeaveConfirm(true)}
                className="rounded-xl text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair do Workspace
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            {isOwner && (
              <Button
                onClick={handleSave}
                disabled={!name.trim() || updateWorkspaceMutation.isPending}
                className="rounded-xl"
              >
                {updateWorkspaceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente o workspace
              "{currentWorkspace.name}" e todos os seus canais e mensagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteWorkspaceMutation.isPending}
            >
              {deleteWorkspaceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Você deixará de ter acesso ao workspace "{currentWorkspace.name}" e todas as suas conversas.
              Você poderá ser convidado novamente por um administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaveWorkspaceMutation.isPending}
            >
              {leaveWorkspaceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sair'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
