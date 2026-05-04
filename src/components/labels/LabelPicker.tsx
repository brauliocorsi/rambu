import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Check } from "lucide-react";
import { useLabels, useLabelAssignments, useAssignLabel, useUnassignLabel } from "@/hooks/useLabels";
import { cn } from "@/lib/utils";

interface Props {
  channelId?: string;
  dmId?: string;
  groupId?: string;
  className?: string;
}

export function LabelPicker({ channelId, dmId, groupId, className }: Props) {
  const { data: labels = [] } = useLabels();
  const { data: assignments = [] } = useLabelAssignments();
  const assign = useAssignLabel();
  const unassign = useUnassignLabel();

  const matchingAssignments = useMemo(() => {
    return assignments.filter(
      (a) =>
        (channelId && a.channel_id === channelId) ||
        (dmId && a.dm_id === dmId) ||
        (groupId && a.group_id === groupId)
    );
  }, [assignments, channelId, dmId, groupId]);

  const assignedLabelIds = new Set(matchingAssignments.map((a) => a.label_id));

  const toggle = (labelId: string) => {
    const existing = matchingAssignments.find((a) => a.label_id === labelId);
    if (existing) {
      unassign.mutate(existing.id);
    } else {
      assign.mutate({ labelId, channelId, dmId, groupId });
    }
  };

  const assignedLabels = labels.filter((l) => assignedLabelIds.has(l.id));

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {assignedLabels.map((label) => (
        <Badge
          key={label.id}
          style={{ backgroundColor: label.color, color: "white" }}
          className="rounded-md text-[10px] px-1.5 py-0"
        >
          {label.name}
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg">
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 rounded-xl p-2">
          {labels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Crie etiquetas em Configurações
            </p>
          ) : (
            <div className="space-y-1">
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => toggle(label.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-sm"
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-left truncate">{label.name}</span>
                  {assignedLabelIds.has(label.id) && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}