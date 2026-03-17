import { cn } from "@/lib/utils";
import { formatMentionsForDisplay } from "@/hooks/useMentions";

interface MessageContentProps {
  content: string;
  className?: string;
}

/**
 * Renders message content with basic Markdown-like formatting:
 * - **bold** → <strong>
 * - *italic* or _italic_ → <em>
 * - `code` → <code>
 * - ```code block``` → <pre><code>
 * - URLs → clickable links
 */
export function MessageContent({ content, className }: MessageContentProps) {
  // First process mentions
  const withMentions = formatMentionsForDisplay(content);
  
  // Parse into segments
  const segments = parseMessageContent(withMentions);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case "codeblock":
            return (
              <pre key={i} className="my-1 p-2 rounded-lg bg-secondary/80 overflow-x-auto">
                <code className="text-xs font-mono text-foreground">{segment.content}</code>
              </pre>
            );
          case "code":
            return (
              <code key={i} className="px-1 py-0.5 rounded bg-secondary/80 text-xs font-mono text-foreground">
                {segment.content}
              </code>
            );
          case "bold":
            return <strong key={i} className="font-bold">{segment.content}</strong>;
          case "italic":
            return <em key={i} className="italic">{segment.content}</em>;
          case "link":
            return (
              <a
                key={i}
                href={segment.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                {segment.content}
              </a>
            );
          case "mention":
            return (
              <span key={i} className="text-primary font-semibold">
                {segment.content}
              </span>
            );
          default:
            return <span key={i}>{segment.content}</span>;
        }
      })}
    </span>
  );
}

type SegmentType = "text" | "bold" | "italic" | "code" | "codeblock" | "link" | "mention";

interface Segment {
  type: SegmentType;
  content: string;
}

function parseMessageContent(text: string): Segment[] {
  const segments: Segment[] = [];
  
  // Combined regex for all patterns
  const regex = /```([\s\S]*?)```|`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|(@\w[\w\s]*?)(?=\s|$)|(https?:\/\/[^\s<]+)/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: "codeblock", content: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: "code", content: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "bold", content: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: "italic", content: match[4] });
    } else if (match[5] !== undefined) {
      segments.push({ type: "italic", content: match[5] });
    } else if (match[6] !== undefined) {
      segments.push({ type: "mention", content: match[6] });
    } else if (match[7] !== undefined) {
      segments.push({ type: "link", content: match[7] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}