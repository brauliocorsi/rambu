/**
 * Aplica a `accent_color` do workspace ativo como override dos tokens
 * Rambu (`--rambu-accent`, `--primary`, `--ring`, `--sidebar-primary`,
 * `--sidebar-ring`). Converte o hex (#rrggbb) para HSL para casar com
 * o formato dos tokens já usados via `hsl(var(--token))`.
 *
 * Quando o workspace não tem `accent_color`, restaura os defaults
 * do tema (ember). Não persiste estado — só escreve no documento.
 */

function hexToHslTriplet(hex: string): string | null {
  const m = hex.trim().match(/^#?([a-f\d]{6}|[a-f\d]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hh = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const DEFAULT_ACCENT = "14 79% 57%"; // ember light
const DEFAULT_ACCENT_DARK = "14 82% 60%";

export function applyWorkspaceAccent(accentHex: string | null | undefined) {
  const root = document.documentElement;
  const triplet = accentHex ? hexToHslTriplet(accentHex) : null;
  const isDark = root.classList.contains("dark");
  const value = triplet ?? (isDark ? DEFAULT_ACCENT_DARK : DEFAULT_ACCENT);
  root.style.setProperty("--rambu-accent", value);
  root.style.setProperty("--primary", value);
  root.style.setProperty("--ring", value);
  root.style.setProperty("--sidebar-primary", value);
  root.style.setProperty("--sidebar-ring", value);
  root.style.setProperty("--message-own", value);
}