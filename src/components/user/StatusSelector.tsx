import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  Circle, Moon, Clock, MinusCircle, MessageSquare, Bell, BellOff, 
  AtSign, Smile, Coffee, Briefcase, Plane, Home, Gamepad2, Dumbbell,
  GraduationCap, Utensils, X, EyeOff, Pencil
} from 'lucide-react';
import { useUserStatus, UserStatus, AwayNotificationLevel } from '@/hooks/useUserStatus';
import { cn } from '@/lib/utils';

// Main status options with better descriptions
const STATUS_OPTIONS: { value: UserStatus; label: string; description: string; icon: typeof Circle; color: string }[] = [
  { value: 'online', label: 'Online', description: 'Disponível para conversar', icon: Circle, color: 'text-success fill-success' },
  { value: 'away', label: 'Ausente', description: 'Estarei de volta em breve', icon: Moon, color: 'text-warning fill-warning' },
  { value: 'busy', label: 'Não Perturbe', description: 'Trabalhando focado', icon: MinusCircle, color: 'text-destructive' },
  { value: 'offline', label: 'Aparecer Offline', description: 'Invisível para outros', icon: EyeOff, color: 'text-muted-foreground' },
];

// Custom status presets with emojis
const CUSTOM_STATUS_PRESETS = [
  { emoji: '📅', text: 'Em reunião', icon: Briefcase },
  { emoji: '💻', text: 'Trabalhando remotamente', icon: Home },
  { emoji: '☕', text: 'Pausa para café', icon: Coffee },
  { emoji: '🍽️', text: 'Almoçando', icon: Utensils },
  { emoji: '✈️', text: 'Viajando', icon: Plane },
  { emoji: '🎮', text: 'Jogando', icon: Gamepad2 },
  { emoji: '🏋️', text: 'Na academia', icon: Dumbbell },
  { emoji: '📚', text: 'Estudando', icon: GraduationCap },
  { emoji: '🤒', text: 'Não estou bem', icon: Circle },
  { emoji: '🎉', text: 'Comemorando', icon: Smile },
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
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  
  // Advanced away mode state
  const [awayDuration, setAwayDuration] = useState<number | 'tomorrow' | 'custom'>('custom');
  const [awayNotificationLevel, setAwayNotificationLevel] = useState<AwayNotificationLevel>('mentions');
  const [awayAutoReply, setAwayAutoReply] = useState('');
  const [awayCustomHours, setAwayCustomHours] = useState('');

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === currentStatus?.status) || STATUS_OPTIONS[0];

  const handleSelectPreset = (preset: typeof CUSTOM_STATUS_PRESETS[0]) => {
    setCustomEmoji(preset.emoji);
    setCustomText(preset.text);
  };

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

  const handleStatusChange = (status: UserStatus) => {
    setStatus(status);
    setStatusPickerOpen(false);
  };

  return (
    <>
      <DropdownMenu open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 h-auto py-1.5">
            <currentStatusOption.icon className={cn('h-3 w-3', currentStatusOption.color)} />
            <span className="text-sm truncate max-w-[150px]">
              {currentStatus?.status_emoji && `${currentStatus.status_emoji} `}
              {currentStatus?.status_text || currentStatusOption.label}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Seu status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Main status options */}
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                "flex items-start gap-3 py-2.5 cursor-pointer",
                currentStatus?.status === option.value && "bg-primary/10"
              )}
            >
              <option.icon className={cn('h-4 w-4 mt-0.5', option.color)} />
              <div className="flex-1">
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Custom status display if set */}
          {currentStatus?.status_text && (
            <>
              <div className="px-2 py-2">
                <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>{currentStatus.status_emoji || '💬'}</span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {currentStatus.status_text}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCustomStatus();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Custom status option */}
          <DropdownMenuItem 
            onClick={() => {
              setCustomStatusDialog(true);
              setStatusPickerOpen(false);
            }} 
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            <span>Definir status personalizado</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />

          {/* Away mode */}
          <DropdownMenuItem 
            onClick={() => {
              setAwayModeDialog(true);
              setStatusPickerOpen(false);
            }} 
            className="gap-2"
          >
            <Moon className="h-4 w-4" />
            <span>Modo ausente avançado</span>
          </DropdownMenuItem>

          {currentStatus?.status === 'away' && currentStatus?.away_auto_reply && (
            <DropdownMenuItem onClick={clearAwayMode} className="gap-2 text-muted-foreground">
              <span>Desativar modo ausente</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* DND toggle */}
          {isDNDActive ? (
            <DropdownMenuItem onClick={disableDND} className="gap-2">
              <Bell className="h-4 w-4" />
              <span>Reativar notificações</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => {
                setDndDialog(true);
                setStatusPickerOpen(false);
              }} 
              className="gap-2"
            >
              <BellOff className="h-4 w-4" />
              <span>Pausar notificações</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Status Dialog */}
      <Dialog open={customStatusDialog} onOpenChange={setCustomStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Status personalizado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="space-y-2">
              <Label>Escolha um status rápido</Label>
              <div className="grid grid-cols-2 gap-2">
                {CUSTOM_STATUS_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant={customEmoji === preset.emoji && customText === preset.text ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2 h-auto py-2"
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <span>{preset.emoji}</span>
                    <span className="truncate text-xs">{preset.text}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou personalize</span>
              </div>
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder="😊"
                  maxLength={2}
                  className="w-16 text-center text-lg"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Seu status</Label>
                <Input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="O que você está fazendo?"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Preview */}
            {(customEmoji || customText) && (
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Pré-visualização:</p>
                <p className="font-medium">
                  {customEmoji || '💬'} {customText || 'Seu status aparecerá aqui'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetCustomStatus} disabled={!customText.trim()}>
              Salvar status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DND Dialog */}
      <Dialog open={dndDialog} onOpenChange={setDndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="h-5 w-5" />
              Pausar notificações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você não receberá notificações durante este período. Todas as mensagens ainda serão salvas.
            </p>
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
