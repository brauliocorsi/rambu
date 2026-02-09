import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Users, 
  Hash, 
  Bell, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  X,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";

const steps = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Rambu! 🎉",
    description: "O Rambu é sua plataforma de comunicação em equipe. Vamos conhecer as principais funcionalidades!",
    color: "from-primary to-accent",
  },
  {
    icon: Users,
    title: "Workspaces",
    description: "Organize suas equipes em workspaces separados. Cada workspace tem seus próprios canais, membros e configurações.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Hash,
    title: "Canais",
    description: "Crie canais para organizar conversas por tema, projeto ou equipe. Canais podem ser públicos ou privados.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: MessageSquare,
    title: "Mensagens Diretas",
    description: "Converse em particular com colegas ou crie grupos para discussões menores.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Bell,
    title: "Notificações",
    description: "Receba alertas de menções, mensagens em DMs e atividade nos canais. Personalize suas preferências!",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Search,
    title: "Busca Avançada",
    description: "Encontre mensagens, arquivos e pessoas rapidamente com nossa busca poderosa com filtros.",
    color: "from-red-500 to-rose-500",
  },
];

export function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const { completeOnboarding, skipOnboarding } = useOnboarding();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors z-10"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6`}>
                <StepIcon className="h-10 w-10 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold mb-3">{step.title}</h2>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : "w-2 bg-muted hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <Button
              onClick={handleNext}
              className="rounded-xl gradient-primary text-white"
            >
              {currentStep === steps.length - 1 ? "Começar!" : "Próximo"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
