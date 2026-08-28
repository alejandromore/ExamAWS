import { escapeHtml } from "./helpers.js";

/**
 * Homologates and renders tag badges into styled HTML chips.
 */
export function renderTagBadges(tags = []) {
  if (!tags || !tags.length) return "";
  
  const badgesHtml = tags.map(tag => {
    let label = tag;
    let badgeClass = "badge-tag default";
    
    if (tag.startsWith("difficulty:")) {
      const level = tag.replace("difficulty:", "").toLowerCase();
      if (level === "basic") {
        label = "🌱 Dificultad: Básica";
        badgeClass = "badge-tag difficulty-basic";
      } else if (level === "intermediate") {
        label = "⚡ Dificultad: Intermedia";
        badgeClass = "badge-tag difficulty-intermediate";
      } else if (level === "advanced") {
        label = "🔥 Dificultad: Avanzada";
        badgeClass = "badge-tag difficulty-advanced";
      } else {
        label = `Dificultad: ${level}`;
        badgeClass = "badge-tag difficulty-basic";
      }
    } else if (tag.startsWith("module:")) {
      const mod = tag.replace("module:", "").toUpperCase();
      label = `📚 Módulo ${mod}`;
      badgeClass = "badge-tag module";
    } else if (tag.startsWith("clause:")) {
      label = `📑 Cláusula ${tag.replace("clause:", "")}`;
      badgeClass = "badge-tag clause";
    } else if (["iso42001", "iso19011", "iso22989", "iso23894", "iso38507"].includes(tag.toLowerCase())) {
      label = `📕 ${tag.replace(/iso/i, "ISO ")}`;
      badgeClass = "badge-tag standard";
    } else if (["annexa", "annexb", "annexc", "annexd"].includes(tag.toLowerCase())) {
      label = `📎 Anexo ${tag.slice(-1).toUpperCase()}`;
      badgeClass = "badge-tag clause";
    } else if (tag.toLowerCase() === "aigpc") {
      label = "🏛️ Esquema AIGPC";
      badgeClass = "badge-tag standard";
    } else if (tag.toLowerCase() === "jemjaf") {
      label = "🌐 Banco Jemjaf";
      badgeClass = "badge-tag jemjaf";
    } else {
      // General tags
      const formatted = tag
        .replaceAll("-", " ")
        .replace(/\b\w/g, char => char.toUpperCase());
      label = `🏷️ ${formatted}`;
      badgeClass = "badge-tag general";
    }
    
    return `<span class="${badgeClass}">${escapeHtml(label)}</span>`;
  }).join(" ");

  return `<div class="tag-container"><span class="tag-title">Etiquetas:</span> ${badgesHtml}</div>`;
}
