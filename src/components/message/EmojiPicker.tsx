import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Search, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Emoji categories with common emojis
const EMOJI_CATEGORIES = {
  recent: { name: 'Recentes', icon: Clock, emojis: [] as string[] },
  smileys: {
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
      '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
      '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
      '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
      '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
    ],
  },
  gestures: {
    name: 'Gestos',
    icon: () => <span className="text-sm">👋</span>,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
      '👄', '💋', '🩸',
    ],
  },
  animals: {
    name: 'Animais',
    icon: () => <span className="text-sm">🐶</span>,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
      '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢',
      '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡',
    ],
  },
  food: {
    name: 'Comida',
    icon: () => <span className="text-sm">🍕</span>,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
      '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔',
      '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
    ],
  },
  activities: {
    name: 'Atividades',
    icon: () => <span className="text-sm">⚽</span>,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
      '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
      '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗',
      '🚴', '🚵', '🎖️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎪', '🎭',
    ],
  },
  objects: {
    name: 'Objetos',
    icon: () => <span className="text-sm">💡</span>,
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️',
      '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️',
      '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️',
      '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌',
      '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷',
      '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨',
    ],
  },
  symbols: {
    name: 'Símbolos',
    icon: () => <span className="text-sm">❤️</span>,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
      '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔥', '✨', '⭐',
    ],
  },
};

const STORAGE_KEY = 'emoji-recent';
const MAX_RECENT = 20;

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmojiPicker({ onSelect, trigger, open: openProp, onOpenChange }: EmojiPickerProps) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenState(v);
    onOpenChange?.(v);
  };
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent emoji
  const addToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSelect = (emoji: string) => {
    addToRecent(emoji);
    onSelect(emoji);
    setOpen(false);
    setSearch('');
  };

  // Get all emojis for search
  const allEmojis = useMemo(() => {
    const emojis: { emoji: string; category: string }[] = [];
    Object.entries(EMOJI_CATEGORIES).forEach(([key, cat]) => {
      if (key !== 'recent') {
        cat.emojis.forEach(emoji => {
          emojis.push({ emoji, category: key });
        });
      }
    });
    return emojis;
  }, []);

  // Filter emojis by search
  const filteredEmojis = useMemo(() => {
    if (!search) return null;
    return allEmojis.filter(({ emoji }) => 
      emoji.includes(search)
    );
  }, [search, allEmojis]);

  const categories = useMemo(() => ({
    ...EMOJI_CATEGORIES,
    recent: { ...EMOJI_CATEGORIES.recent, emojis: recentEmojis },
  }), [recentEmojis]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] p-0 rounded-xl" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar emoji..."
              className="pl-9 rounded-lg h-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
            {Object.entries(categories).map(([key, cat]) => {
              if (key === 'recent' && recentEmojis.length === 0) return null;
              const IconComponent = cat.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={cn(
                    'p-2 rounded-lg transition-colors shrink-0',
                    activeCategory === key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary'
                  )}
                  title={cat.name}
                >
                  {typeof IconComponent === 'function' && IconComponent.prototype?.render 
                    ? <IconComponent className="h-4 w-4" />
                    : typeof IconComponent === 'function'
                      ? IconComponent({})
                      : null
                  }
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji Grid */}
        <ScrollArea className="h-[200px]">
          <div className="p-2">
            {search ? (
              // Search results
              filteredEmojis && filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map(({ emoji }, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(emoji)}
                      className="p-1.5 text-xl hover:bg-secondary rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum emoji encontrado
                </p>
              )
            ) : (
              // Category emojis
              <>
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  {categories[activeCategory as keyof typeof categories]?.name}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  <AnimatePresence mode="wait">
                    {categories[activeCategory as keyof typeof categories]?.emojis.map((emoji, i) => (
                      <motion.button
                        key={emoji}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.01 }}
                        onClick={() => handleSelect(emoji)}
                        className="p-1.5 text-xl hover:bg-secondary rounded-lg transition-colors"
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
