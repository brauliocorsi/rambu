import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  useProfile, 
  useUpdateProfile, 
  useUploadAvatar,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useProfile";
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
  Moon,
  Sun,
  Monitor,
  Volume2,
  LogOut,
  Save,
  Loader2,
} from "lucide-react";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: notifPrefs } = useNotificationPreferences();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
      </div>
    </div>
  );
}
