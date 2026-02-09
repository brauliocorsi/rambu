import { UnreadFeed } from "@/components/unread/UnreadFeed";

interface UnreadViewProps {
  onSelectChannel?: (channelId: string) => void;
  onSelectDM?: (dmId: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

export function UnreadView({ onSelectChannel, onSelectDM, onSelectGroup }: UnreadViewProps) {
  return (
    <div className="h-full">
      <UnreadFeed
        onSelectChannel={onSelectChannel}
        onSelectDM={onSelectDM}
        onSelectGroup={onSelectGroup}
        className="h-full"
      />
    </div>
  );
}
