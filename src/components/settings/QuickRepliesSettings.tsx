import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const QuickRepliesSettings = () => {
  const { quickReplies, isLoading, createQuickReply, updateQuickReply, deleteQuickReply, isCreating } = useQuickReplies();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editShortcut, setEditShortcut] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleCreate = () => {
    if (newShortcut.trim() && newContent.trim()) {
      createQuickReply({ shortcut: newShortcut.trim(), content: newContent.trim() });
      setNewShortcut('');
      setNewContent('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (id: string, shortcut: string, content: string) => {
    setEditingId(id);
    setEditShortcut(shortcut);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editingId && editShortcut.trim() && editContent.trim()) {
      updateQuickReply({ id: editingId, shortcut: editShortcut.trim(), content: editContent.trim() });
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditShortcut('');
    setEditContent('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Respostas Rápidas</h3>
          <p className="text-sm text-muted-foreground">
            Crie atalhos para mensagens frequentes. Digite o atalho para inserir o texto automaticamente.
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Atalho</Label>
              <Input
                value={newShortcut}
                onChange={(e) => setNewShortcut(e.target.value)}
                placeholder="/obg"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use / no início (ex: /obg, /ola, /ajuda)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Obrigado pela sua mensagem! Vou analisar e retorno em breve."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewShortcut('');
                  setNewContent('');
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newShortcut.trim() || !newContent.trim() || isCreating}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {quickReplies.length === 0 && !isAdding ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma resposta rápida criada ainda.
          </p>
        ) : (
          quickReplies.map((qr) => (
            <Card key={qr.id}>
              <CardContent className="pt-4">
                {editingId === qr.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Atalho</Label>
                      <Input
                        value={editShortcut}
                        onChange={(e) => setEditShortcut(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conteúdo</Label>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {qr.shortcut}
                      </code>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {qr.content}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(qr.id, qr.shortcut, qr.content)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuickReply(qr.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {quickReplies.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {quickReplies.length}/20 respostas rápidas
        </p>
      )}
    </div>
  );
};
