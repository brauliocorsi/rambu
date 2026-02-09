import { cn } from '@/lib/utils';
import { isUserOnline, getStatusColor } from '@/hooks/usePresence';

interface OnlineIndicatorProps {
  status: string | null;
  lastSeen: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const OnlineIndicator = ({
  status,
  lastSeen,
  size = 'sm',
  className,
  showTooltip = true,
}: OnlineIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusColor = getStatusColor(status, lastSeen);
  const isOnline = isUserOnline(lastSeen);

  const getStatusText = (): string => {
    if (status === 'busy' || status === 'dnd') return 'Não Perturbe';
    if (status === 'away') return 'Ausente';
    if (status === 'online' && isOnline) return 'Online';
    return 'Offline';
  };

  return (
    <div
      className={cn(
        'rounded-full border-2 border-background',
        sizeClasses[size],
        statusColor,
        className
      )}
      title={showTooltip ? getStatusText() : undefined}
    />
  );
};

// Wrapper component for avatars with online indicator
interface AvatarWithStatusProps {
  children: React.ReactNode;
  status: string | null;
  lastSeen: string | null;
  indicatorSize?: 'sm' | 'md' | 'lg';
}

export const AvatarWithStatus = ({
  children,
  status,
  lastSeen,
  indicatorSize = 'sm',
}: AvatarWithStatusProps) => {
  return (
    <div className="relative inline-block">
      {children}
      <OnlineIndicator
        status={status}
        lastSeen={lastSeen}
        size={indicatorSize}
        className="absolute bottom-0 right-0"
      />
    </div>
  );
};
