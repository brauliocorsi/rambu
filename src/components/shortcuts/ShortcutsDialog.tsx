import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { APP_SHORTCUTS, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShortcutsDialog = ({ open, onOpenChange }: ShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3">
            {APP_SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm text-foreground">
                  {shortcut.description}
                </span>
                <kbd className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>Dica: A maioria dos atalhos funciona em qualquer parte da aplicação.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
