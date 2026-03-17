import { Bold, Italic, Code, Link2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix: string, placeholder?: string) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  hasContent: boolean;
  className?: string;
}

const tools = [
  { icon: Bold, prefix: "**", suffix: "**", placeholder: "negrito", label: "Negrito", shortcut: "Ctrl+B" },
  { icon: Italic, prefix: "*", suffix: "*", placeholder: "itálico", label: "Itálico", shortcut: "Ctrl+I" },
  { icon: Code, prefix: "`", suffix: "`", placeholder: "código", label: "Código", shortcut: "Ctrl+E" },
  { icon: Link2, prefix: "", suffix: "", placeholder: "https://", label: "Link", shortcut: "" },
];

export function MarkdownToolbar({ onInsert, showPreview, onTogglePreview, hasContent, className }: MarkdownToolbarProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {tools.map((tool) => (
        <Tooltip key={tool.label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-7 w-7 rounded-md"
              onClick={() => onInsert(tool.prefix, tool.suffix, tool.placeholder)}
            >
              <tool.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tool.label}{tool.shortcut && ` (${tool.shortcut})`}
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="h-4 w-px bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className={cn("h-7 w-7 rounded-md", showPreview && "bg-secondary text-primary")}
            onClick={onTogglePreview}
            disabled={!hasContent}
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {showPreview ? "Ocultar preview" : "Preview"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}