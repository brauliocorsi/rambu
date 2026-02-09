import { createContext, useContext, useState, ReactNode } from "react";
import { Channel } from "@/hooks/useChannels";

interface ChannelContextType {
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel | null) => void;
}

const ChannelContext = createContext<ChannelContextType>({
  currentChannel: null,
  setCurrentChannel: () => {},
});

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  return (
    <ChannelContext.Provider value={{ currentChannel, setCurrentChannel }}>
      {children}
    </ChannelContext.Provider>
  );
}

export const useChannelContext = () => useContext(ChannelContext);
