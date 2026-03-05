import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Share,
  Plus,
  MoreVertical,
  Download,
  Bell,
  Zap,
  Wifi,
  Smartphone,
  Monitor,
  ExternalLink,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DeviceType = "ios" | "android" | "desktop";

function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const iosSteps = [
  {
    icon: ExternalLink,
    title: "Abra no Safari",
    description:
      'Abra o Rambu no Safari. As instruções não funcionam no Chrome ou Firefox do iOS.',
  },
  {
    icon: Share,
    title: "Toque em Compartilhar",
    description:
      "Toque no ícone de compartilhar (quadrado com seta para cima) na barra inferior do Safari.",
  },
  {
    icon: Plus,
    title: '"Adicionar à Tela de Início"',
    description:
      'Role para baixo no menu e toque em "Adicionar à Tela de Início".',
  },
  {
    icon: Download,
    title: 'Toque em "Adicionar"',
    description:
      'Confirme tocando em "Adicionar" no canto superior direito.',
  },
  {
    icon: Smartphone,
    title: "Pronto!",
    description:
      "O Rambu aparecerá como um app na sua tela inicial. Abra por ali para receber notificações.",
  },
];

const androidSteps = [
  {
    icon: ExternalLink,
    title: "Abra no Chrome",
    description: "Abra o Rambu no Google Chrome.",
  },
  {
    icon: MoreVertical,
    title: "Menu de três pontos",
    description:
      "Toque no ícone de três pontos (⋮) no canto superior direito do Chrome.",
  },
  {
    icon: Download,
    title: '"Instalar app" ou "Adicionar à tela inicial"',
    description:
      'Toque em "Instalar app" ou "Adicionar à tela inicial" no menu.',
  },
  {
    icon: Plus,
    title: "Confirme",
    description: 'Toque em "Adicionar" ou "Instalar" para confirmar.',
  },
  {
    icon: Smartphone,
    title: "Pronto!",
    description:
      "O Rambu aparecerá como um app na sua tela inicial com ícone próprio.",
  },
];

const benefits = [
  {
    icon: Bell,
    title: "Notificações push",
    description: "Receba notificações mesmo com o app fechado.",
  },
  {
    icon: Zap,
    title: "Acesso rápido",
    description: "Abra direto pela tela inicial, sem abrir o navegador.",
  },
  {
    icon: Maximize,
    title: "Tela cheia",
    description: "Experiência imersiva sem barra de endereço.",
  },
  {
    icon: Wifi,
    title: "Funciona offline",
    description: "Acesse mensagens mesmo sem conexão.",
  },
];

function StepCard({
  step,
  index,
  delay,
}: {
  step: (typeof iosSteps)[0];
  index: number;
  delay: number;
}) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="border-border/60">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
            {index + 1}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">
                {step.title}
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function InstallPWA() {
  const navigate = useNavigate();
  const device = useMemo(detectDevice, []);
  const defaultTab = device === "android" ? "android" : "ios";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-foreground">Rambu</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Rambu
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-foreground">
            Instale o Rambu
          </h1>
          <p className="text-muted-foreground text-sm">
            Instale como app no seu celular para ter a melhor experiência.
          </p>
        </motion.div>

        {/* Desktop notice */}
        {device === "desktop" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-4">
                <Monitor className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-foreground space-y-1">
                  <p className="font-medium">Você está no desktop</p>
                  <p className="text-muted-foreground">
                    No computador, basta usar o navegador normalmente. No Chrome,
                    clique no ícone de instalação (⊕) na barra de endereço para
                    instalar como app.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs iOS / Android */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="ios" className="flex-1 gap-1.5">
              <Smartphone className="h-4 w-4" />
              iPhone / iPad
            </TabsTrigger>
            <TabsTrigger value="android" className="flex-1 gap-1.5">
              <Smartphone className="h-4 w-4" />
              Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="space-y-3 mt-4">
            {iosSteps.map((step, i) => (
              <StepCard key={i} step={step} index={i} delay={i * 0.08} />
            ))}
          </TabsContent>

          <TabsContent value="android" className="space-y-3 mt-4">
            {androidSteps.map((step, i) => (
              <StepCard key={i} step={step} index={i} delay={i * 0.08} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Benefits */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Por que instalar?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.title} className="border-border/60">
                  <CardContent className="p-4 space-y-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="font-medium text-foreground text-sm">
                      {b.title}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {b.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
