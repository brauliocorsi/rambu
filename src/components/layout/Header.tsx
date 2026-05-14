import { Menu, Search, Settings, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusMode } from "@/hooks/useFocusMode";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ 
  title, 
  showSearch = true, 
  onMenuClick, 
  onSettingsClick,
  onSearchClick,
}: HeaderProps) {
  const { focusMode, toggleFocusMode } = useFocusMode();
  return (
    <header className="sticky top-0 z-40 glass safe-top">
      <div className="flex items-center justify-between px-3 h-14">
        <div className="flex items-center gap-2">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="rounded-lg h-9 w-9 active:scale-95 transition-transform">
              <Menu className="h-[18px] w-[18px]" />
            </Button>
          )}
          <h1 className="text-[17px] font-semibold tracking-tight truncate max-w-[220px]">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-lg h-9 w-9 active:scale-95 transition-transform", focusMode && "text-primary bg-primary/10")}
            onClick={toggleFocusMode}
            title={focusMode ? "Sair do modo foco" : "Modo foco"}
          >
            <Focus className="h-[18px] w-[18px]" />
          </Button>
          {showSearch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-lg h-9 w-9 active:scale-95 transition-transform"
              onClick={onSearchClick}
            >
              <Search className="h-[18px] w-[18px]" />
            </Button>
          )}
          {onSettingsClick && (
            <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-lg h-9 w-9 active:scale-95 transition-transform">
              <Settings className="h-[18px] w-[18px]" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
