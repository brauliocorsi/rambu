import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceMembers, WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onFormatInsert?: (prefix: string, suffix: string) => void;
}

export interface MentionInputRef {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  ({ value, onChange, onKeyDown, onBlur, placeholder, className, disabled }, ref) => {
    const { currentWorkspace } = useWorkspaceContext();
    const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
    
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    // Auto-resize textarea
    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
      }
    };

    useEffect(() => {
      adjustHeight();
    }, [value]);

    // Filter members based on mention query + add @todos option
    const filteredMembers = members.filter((member) => {
      const name = member.profile?.display_name?.toLowerCase() || "";
      return name.includes(mentionQuery.toLowerCase());
    });

    // Add @todos option when query matches
    const showTodosOption = "todos".includes(mentionQuery.toLowerCase()) || mentionQuery === "";

    // Detect @ mentions while typing
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setCursorPosition(cursorPos);
      
      // Find if we're in a mention context
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionQuery("");
      }
      
      onChange(newValue);
    };

    const insertMention = (member: WorkspaceMember) => {
      const textBeforeCursor = value.slice(0, cursorPosition);
      const textAfterCursor = value.slice(cursorPosition);
      
      // Find the @ position
      const mentionStart = textBeforeCursor.lastIndexOf("@");
      const beforeMention = textBeforeCursor.slice(0, mentionStart);
      
      const displayName = member.profile?.display_name || "Usuário";
      const mentionText = `@[${displayName}](${member.user_id}) `;
      
      const newValue = beforeMention + mentionText + textAfterCursor;
      onChange(newValue);
      setShowSuggestions(false);
      setMentionQuery("");
      
      // Focus and set cursor after mention
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeMention.length + mentionText.length;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent) => {
      if (showSuggestions && filteredMembers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredMembers.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredMembers.length - 1
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredMembers[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }
      
      onKeyDown?.(e);
    };

    // Scroll selected item into view
    useEffect(() => {
      if (showSuggestions && suggestionsRef.current) {
        const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
        selectedElement?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex, showSuggestions]);

    return (
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownInternal}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={className}
          style={{ resize: 'none', overflow: 'hidden' }}
        />

        <AnimatePresence>
          {showSuggestions && (filteredMembers.length > 0 || showTodosOption) && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg z-50"
            >
              {/* @todos option */}
              {showTodosOption && (
                <button
                  type="button"
                  onClick={() => {
                    const textBeforeCursor = value.slice(0, cursorPosition);
                    const textAfterCursor = value.slice(cursorPosition);
                    const mentionStart = textBeforeCursor.lastIndexOf("@");
                    const beforeMention = textBeforeCursor.slice(0, mentionStart);
                    const mentionText = `@todos `;
                    const newValue = beforeMention + mentionText + textAfterCursor;
                    onChange(newValue);
                    setShowSuggestions(false);
                    setMentionQuery("");
                    setTimeout(() => {
                      textareaRef.current?.focus();
                      const newCursorPos = beforeMention.length + mentionText.length;
                      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
                    }, 0);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    selectedIndex === 0 && showTodosOption
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-secondary"
                  }`}
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">@</span>
                  </div>
                  <span className="text-sm font-medium">todos</span>
                  <span className="text-xs text-muted-foreground ml-auto">Mencionar todos</span>
                </button>
              )}

              {filteredMembers.map((member, index) => {
                const displayName = member.profile?.display_name || "Usuário";
                const adjustedIndex = showTodosOption ? index + 1 : index;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      adjustedIndex === selectedIndex 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-secondary"
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs gradient-primary text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                  </button>
                );
              })}
              <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border">
                ↑↓ para navegar • Enter para selecionar
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";
