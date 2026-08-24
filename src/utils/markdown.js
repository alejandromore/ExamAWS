import { escapeHtml } from "./helpers.js";

/**
 * Parses markdown inline formatting safely:
 * - **bold** or __bold__ -> <strong>bold</strong>
 * - `code` -> <code>code</code>
 * - *italic* -> <em>italic</em>
 */
export function parseMarkdown(text) {
  if (!text) return "";
  
  // First escape raw HTML
  let escaped = escapeHtml(text);
  
  // Replace code blocks `code`
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // Replace bold **text** or __text__
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  
  // Replace italic *text* (single asterisk not inside bold)
  escaped = escaped.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3");
  
  return escaped;
}
