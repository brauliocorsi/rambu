import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Circle, Moon, Clock, MinusCircle, MessageSquare } from 'lucide-react';
import { useUserStatus, UserStatus } from '@/hooks/useUserStatus';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: UserStatus; label: string; icon: typeof Circle; color: string }[] = [
  { value: 'online', label: 'Online', icon: Circle, color: 'text-green-500 fill-green-500' },
  { value: 'away', label: 'Ausente', icon: Moon, color: 'text-yellow-500 fill-yellow-500' },
  { value: 'busy', label: 'Não Perturbe', icon: MinusCircle, color: 'text-red-500' },
  { value: 'offline', label: 'Invisível', icon: Circle, color: 'text-gray-400 fill-gray-400' },
];

export const StatusSelector = () => {
  const { currentStatus, setStatus, setCustomStatus, clearCustomStatus, enableDND, disableDND, isDNDActive } = useUserStatus();
  const [customStatusDialog, setCustomStatusDialog] = useState(false);
  const [dndDialog, setDndDialog] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [dndDuration, setDndDuration] = useState('1');

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === currentStatus?.status) || STATUS_OPTIONS[0];

  const handleSetCustomStatus = () => {
    if (customText.trim()) {
      setCustomStatus(customText.trim(), customEmoji || undefined);
    }
    setCustomStatusDialog(false);
    setCustomText('');
    setCustomEmoji('');
  };

  const handleEnableDND = () => {
    const hours = parseInt(dndDuration);
    if (hours > 0) {
      const until = new Date();
      until.setHours(until.getHours() + hours);
      enableDND(until);
    } else {
      enableDND();
    }
    setDndDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <currentStatusOption.icon className={cn('h-3 w-3', currentStatusOption.color)} />
            <span className="text-sm">
              {currentStatus?.status_emoji && `${currentStatus.status_emoji} `}
              {currentStatus?.status_text || currentStatusOption.label}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Definir status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setStatus(option.value)}
              className="gap-2"
            >
              <option.icon className={cn('h-4 w-4', option.color)} />
              {option.label}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setCustomStatusDialog(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Definir status personalizado
          </DropdownMenuItem>
          
          {currentStatus?.status_text && (
            <DropdownMenuItem onClick={clearCustomStatus} className="gap-2 text-muted-foreground">
              Limpar status personalizado
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {isDNDActive ? (
            <DropdownMenuItem onClick={disableDND} className="gap-2">
              <Clock className="h-4 w-4" />
              Desativar Não Perturbe
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setDndDialog(true)} className="gap-2">
              <Clock className="h-4 w-4" />
              Pausar notificações
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Status Dialog */}
      <Dialog open={customStatusDialog} onOpenChange={setCustomStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir status personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emoji (opcional)</Label>
              <Input
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="😊"
                maxLength={2}
                className="w-20"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Em reunião..."
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetCustomStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DND Dialog */}
      <Dialog open={dndDialog} onOpenChange={setDndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar notificações</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Duração</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={dndDuration}
                  onChange={(e) => setDndDuration(e.target.value)}
                  className="w-20"
                />
                <span className="flex items-center text-muted-foreground">horas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deixe 0 para pausar indefinidamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDndDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnableDND}>
              Pausar notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
