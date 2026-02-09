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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Circle, Moon, Clock, MinusCircle, MessageSquare, Bell, BellOff, AtSign, Calendar } from 'lucide-react';
import { useUserStatus, UserStatus, AwayNotificationLevel } from '@/hooks/useUserStatus';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: UserStatus; label: string; icon: typeof Circle; color: string }[] = [
  { value: 'online', label: 'Online', icon: Circle, color: 'text-green-500 fill-green-500' },
  { value: 'away', label: 'Ausente', icon: Moon, color: 'text-yellow-500 fill-yellow-500' },
  { value: 'busy', label: 'Não Perturbe', icon: MinusCircle, color: 'text-red-500' },
  { value: 'offline', label: 'Invisível', icon: Circle, color: 'text-gray-400 fill-gray-400' },
];

const AWAY_DURATION_PRESETS = [
  { label: '30 minutos', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '2 horas', minutes: 120 },
  { label: '4 horas', minutes: 240 },
  { label: 'Até amanhã', minutes: 'tomorrow' as const },
  { label: 'Personalizado', minutes: 'custom' as const },
];

export const StatusSelector = () => {
  const { 
    currentStatus, 
    setStatus, 
    setCustomStatus, 
    clearCustomStatus, 
    enableDND, 
    disableDND, 
    isDNDActive,
    setAdvancedAwayMode,
    clearAwayMode,
  } = useUserStatus();
  
  const [customStatusDialog, setCustomStatusDialog] = useState(false);
  const [dndDialog, setDndDialog] = useState(false);
  const [awayModeDialog, setAwayModeDialog] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [dndDuration, setDndDuration] = useState('1');
  
  // Advanced away mode state
  const [awayDuration, setAwayDuration] = useState<number | 'tomorrow' | 'custom'>('custom');
  const [awayNotificationLevel, setAwayNotificationLevel] = useState<AwayNotificationLevel>('mentions');
  const [awayAutoReply, setAwayAutoReply] = useState('');
  const [awayCustomHours, setAwayCustomHours] = useState('');

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

  const handleSetAwayMode = () => {
    let scheduledEnd: Date | undefined;
    
    if (awayDuration === 'tomorrow') {
      scheduledEnd = new Date();
      scheduledEnd.setDate(scheduledEnd.getDate() + 1);
      scheduledEnd.setHours(9, 0, 0, 0);
    } else if (awayDuration === 'custom' && awayCustomHours) {
      const hours = parseInt(awayCustomHours);
      if (hours > 0) {
        scheduledEnd = new Date();
        scheduledEnd.setHours(scheduledEnd.getHours() + hours);
      }
    } else if (typeof awayDuration === 'number') {
      scheduledEnd = new Date();
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + awayDuration);
    }

    setAdvancedAwayMode({
      autoReply: awayAutoReply || undefined,
      notificationLevel: awayNotificationLevel,
      scheduledStart: new Date(),
      scheduledEnd,
    });

    setAwayModeDialog(false);
    setAwayAutoReply('');
    setAwayCustomHours('');
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

          <DropdownMenuItem onClick={() => setAwayModeDialog(true)} className="gap-2">
            <Moon className="h-4 w-4" />
            Modo ausente avançado
          </DropdownMenuItem>

          {currentStatus?.status === 'away' && (
            <DropdownMenuItem onClick={clearAwayMode} className="gap-2 text-muted-foreground">
              Desativar modo ausente
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

      {/* Advanced Away Mode Dialog */}
      <Dialog open={awayModeDialog} onOpenChange={setAwayModeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Modo Ausente Avançado
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="duration" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="duration">Duração</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="duration" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Por quanto tempo?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AWAY_DURATION_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={awayDuration === preset.minutes ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setAwayDuration(preset.minutes)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                
                {awayDuration === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min="1"
                      value={awayCustomHours}
                      onChange={(e) => setAwayCustomHours(e.target.value)}
                      placeholder="Horas"
                      className="w-24"
                    />
                    <span className="text-muted-foreground">horas</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Notificações enquanto ausente</Label>
                <Select
                  value={awayNotificationLevel}
                  onValueChange={(v: AwayNotificationLevel) => setAwayNotificationLevel(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>Todas as notificações</span>
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
                        <span>Nenhuma notificação</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resposta automática (opcional)</Label>
                <Textarea
                  value={awayAutoReply}
                  onChange={(e) => setAwayAutoReply(e.target.value)}
                  placeholder="Estou ausente no momento. Retorno em breve!"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será exibida quando alguém tentar te enviar uma DM
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAwayModeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetAwayMode}>
              Ativar modo ausente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
