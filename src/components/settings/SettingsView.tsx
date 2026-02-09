import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { 
  useProfile, 
  useUpdateProfile, 
  useUploadAvatar,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useProfile";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft,
  Camera,
  User,
  Bell,
  BellRing,
  Moon,
  Sun,
  Monitor,
  Volume2,
  LogOut,
  Save,
  Loader2,
  MessageSquare,
  Keyboard,
  AlignLeft,
  LayoutList,
  Rows3,
  Rows2,
  Rows4,
} from "lucide-react";
import { StatusSelector } from "@/components/user/StatusSelector";
import { QuickRepliesSettings } from "@/components/settings/QuickRepliesSettings";
import { ShortcutsDialog } from "@/components/shortcuts/ShortcutsDialog";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { preferences, setSlackMode, setDensity } = useLayoutPreferences();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: notifPrefs } = useNotificationPreferences();
  const { isSupported: pushSupported, permission: pushPermission, requestPermission: requestPushPermission } = useBrowserNotifications();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'quick-replies'>('profile');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setStatusText(profile.status_text || "");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar.mutate(file);
    }
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      display_name: displayName,
      bio,
      status_text: statusText,
    });
    setHasChanges(false);
  };

  const handleInputChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const displayNameValue = displayName || profile?.display_name || user?.email?.split("@")[0] || "Usuário";

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg">Configurações</h2>
        {hasChanges && (
          <Button
            size="sm"
            className="ml-auto rounded-xl"
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-border px-4">
        <button
          onClick={() => setActiveSection('profile')}
          className={`py-3 px-4 text-sm font-medium transition-colors relative ${
            activeSection === 'profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </span>
          {activeSection === 'profile' && (
            <motion.div layoutId="settings-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('quick-replies')}
          className={`py-3 px-4 text-sm font-medium transition-colors relative ${
            activeSection === 'quick-replies' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Respostas Rápidas
          </span>
          {activeSection === 'quick-replies' && (
            <motion.div layoutId="settings-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setShowShortcuts(true)}
          className="py-3 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeSection === 'quick-replies' ? (
          <QuickRepliesSettings />
        ) : (
          <>
        {/* Status Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Status</h3>
              <StatusSelector />
            </div>
          </Card>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Perfil</h3>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl gradient-primary text-white">
                    {displayNameValue.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no ícone para trocar a foto
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName || profile?.display_name || ""}
                onChange={(e) => handleInputChange(setDisplayName, e.target.value)}
                placeholder="Seu nome"
                className="rounded-xl"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio || profile?.bio || ""}
                onChange={(e) => handleInputChange(setBio, e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={statusText || profile?.status_text || ""}
                onChange={(e) => handleInputChange(setStatusText, e.target.value)}
                placeholder="O que você está fazendo?"
                className="rounded-xl"
              />
            </div>
          </Card>
        </motion.div>

        {/* Theme Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {resolvedTheme === "dark" ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <h3 className="font-semibold">Aparência</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="rounded-xl flex flex-col gap-1 h-auto py-3"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Claro</span>
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="rounded-xl flex flex-col gap-1 h-auto py-3"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Escuro</span>
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                className="rounded-xl flex flex-col gap-1 h-auto py-3"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs">Sistema</span>
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Layout Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <LayoutList className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Layout das Mensagens</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <AlignLeft className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Modo Slack</p>
                    <p className="text-sm text-muted-foreground">
                      Todas as mensagens alinhadas à esquerda com separadores por dia
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.slackMode}
                  onCheckedChange={setSlackMode}
                />
              </div>

              {/* Preview */}
              <div className="p-3 bg-secondary/50 rounded-xl">
                <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
                <div className="space-y-2">
                  {preferences.slackMode ? (
                    <>
                      <div className="text-xs text-center text-muted-foreground py-1 border-t border-b border-border">
                        Hoje
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20" />
                        <div>
                          <span className="text-xs font-medium">João</span>
                          <span className="text-xs text-muted-foreground ml-2">10:30</span>
                          <p className="text-xs">Olá!</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent/50" />
                        <div>
                          <span className="text-xs font-medium">Você</span>
                          <span className="text-xs text-muted-foreground ml-2">10:31</span>
                          <p className="text-xs">Oi!</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20" />
                        <div className="bg-secondary px-2 py-1 rounded-lg">
                          <p className="text-xs">Olá!</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 flex-row-reverse">
                        <div className="h-6 w-6 rounded-full bg-accent/50" />
                        <div className="bg-primary/20 px-2 py-1 rounded-lg">
                          <p className="text-xs">Oi!</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Density */}
              <div className="pt-4 border-t border-border">
                <p className="font-medium mb-3">Densidade das mensagens</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={preferences.density === "compact" ? "default" : "outline"}
                    className="rounded-xl flex flex-col gap-1 h-auto py-3"
                    onClick={() => setDensity("compact")}
                  >
                    <Rows4 className="h-5 w-5" />
                    <span className="text-xs">Compacto</span>
                  </Button>
                  <Button
                    variant={preferences.density === "normal" ? "default" : "outline"}
                    className="rounded-xl flex flex-col gap-1 h-auto py-3"
                    onClick={() => setDensity("normal")}
                  >
                    <Rows3 className="h-5 w-5" />
                    <span className="text-xs">Normal</span>
                  </Button>
                  <Button
                    variant={preferences.density === "comfortable" ? "default" : "outline"}
                    className="rounded-xl flex flex-col gap-1 h-auto py-3"
                    onClick={() => setDensity("comfortable")}
                  >
                    <Rows2 className="h-5 w-5" />
                    <span className="text-xs">Confortável</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {preferences.density === "compact" && "Menos espaçamento entre mensagens"}
                  {preferences.density === "normal" && "Espaçamento padrão"}
                  {preferences.density === "comfortable" && "Mais espaçamento para leitura"}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Notificações</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mensagens Diretas</p>
                  <p className="text-sm text-muted-foreground">Receber notificações de DMs</p>
                </div>
                <Switch
                  checked={notifPrefs?.dm_notifications ?? true}
                  onCheckedChange={(checked) => 
                    updateNotifPrefs.mutate({ dm_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Canais</p>
                  <p className="text-sm text-muted-foreground">Notificações de canais</p>
                </div>
                <Switch
                  checked={notifPrefs?.channel_notifications ?? true}
                  onCheckedChange={(checked) => 
                    updateNotifPrefs.mutate({ channel_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Menções</p>
                  <p className="text-sm text-muted-foreground">Quando alguém te menciona</p>
                </div>
                <Switch
                  checked={notifPrefs?.mention_notifications ?? true}
                  onCheckedChange={(checked) => 
                    updateNotifPrefs.mutate({ mention_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Som</p>
                  <p className="text-sm text-muted-foreground">Tocar som nas notificações</p>
                </div>
                <Switch
                  checked={notifPrefs?.sound_enabled ?? true}
                  onCheckedChange={(checked) => 
                    updateNotifPrefs.mutate({ sound_enabled: checked })
                  }
                />
              </div>

              {notifPrefs?.sound_enabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Volume</span>
                  </div>
                  <Slider
                    value={[notifPrefs?.sound_volume ?? 0.5]}
                    max={1}
                    step={0.1}
                    onValueCommit={(value) => 
                      updateNotifPrefs.mutate({ sound_volume: value[0] })
                    }
                    className="py-2"
                  />
                </div>
              )}

              {/* Push Notifications */}
              {pushSupported && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        Notificações Push
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pushPermission === "granted" 
                          ? "Ativas - você receberá alertas em outras abas"
                          : pushPermission === "denied"
                          ? "Bloqueadas pelo navegador"
                          : "Receba alertas mesmo em outras abas"}
                      </p>
                    </div>
                    {pushPermission === "granted" ? (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                        Ativadas
                      </span>
                    ) : pushPermission === "denied" ? (
                      <span className="text-xs text-destructive font-medium px-2 py-1 bg-destructive/10 rounded-full">
                        Bloqueadas
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={requestPushPermission}
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 rounded-2xl">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>

              <Button
                variant="destructive"
                className="w-full rounded-xl"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </Card>
        </motion.div>
        </>
        )}
      </div>

      {/* Shortcuts Dialog */}
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
