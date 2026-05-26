import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Helpers puros de agrupamento de mensagens por dia.
 * Compartilhados entre MessageList (canal) e ConversationMessageList
 * (uso futuro). Sem dependência de tipos específicos de mensagem —
 * exige apenas `id` e `created_at`.
 */

export interface DayGroupableMessage {
  id: string;
  created_at: string;
}

export interface MessageDayGroup<T extends DayGroupableMessage> {
  date: Date;
  messages: T[];
}

/** Rótulo amigável para separador de dia (pt-BR). */
export function formatDaySeparator(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/**
 * Agrupa mensagens consecutivas do mesmo dia, deduplicando por `id`
 * (evita warnings de chave duplicada quando o realtime entrega o
 * mesmo evento mais de uma vez).
 */
export function groupMessagesByDay<T extends DayGroupableMessage>(
  messages: T[],
): MessageDayGroup<T>[] {
  const groups: MessageDayGroup<T>[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);

    const messageDate = new Date(message.created_at);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date: messageDate, messages: [message] });
    }
  }

  return groups;
}