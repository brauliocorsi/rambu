import { motion } from "framer-motion";
import { Menu, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
}

export function Header({ title, showSearch = true, onMenuClick, onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="rounded-xl">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <motion.h1 
            className="text-xl font-bold gradient-text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {title}
          </motion.h1>
        </div>
        
        <div className="flex items-center gap-2">
          {showSearch && (
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Search className="h-5 w-5" />
            </Button>
          )}
          {onSettingsClick && (
            <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-xl">
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
