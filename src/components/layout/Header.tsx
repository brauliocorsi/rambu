import { Menu, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="rounded-xl h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold truncate max-w-[200px]">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-1">
          {showSearch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-8 w-8"
              onClick={onSearchClick}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          {onSettingsClick && (
            <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-xl h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
