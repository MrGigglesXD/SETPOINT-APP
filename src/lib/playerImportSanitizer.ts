/**
 * Player import sanitization module.
 * 
 * Handles robust parsing of player names from mixed sources:
 * - Markdown documents
 * - Excel/CSV tables
 * - Notion exports
 * - WhatsApp messages
 * - Plain text lists
 */

/**
 * Reserved words that should never become player names.
 * These are common headers, table columns, and metadata keywords.
 */
const RESERVED_WORDS_NORMALIZED = new Set([
  // English
  "name",
  "names",
  "player",
  "players",
  "id",
  "level",
  "position",
  "posición",
  // Spanish
  "nombre",
  "nombres",
  "jugador",
  "jugadores",
  "nivel",
  "posición",
  // Common abbreviations
  "nro",
  "no",
  "col",
  "row",
]);

/**
 * Normalize a string for comparison: lowercase, remove accents, trim.
 */
function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Check if a line should be entirely skipped (not considered for import).
 * 
 * Returns true if the line is:
 * - Empty or whitespace-only
 * - A Markdown header (#, ##, etc.)
 * - A Markdown quote (>)
 * - A bullet list (-, *, +)
 * - A Markdown table separator (|---|, |----|, etc.)
 * - A Markdown table header (| Name | Level |)
 * - Only separators (---, ===, ___, ~~~)
 * - Contains only pipes and dashes (Markdown table row markers)
 * - Lines ending with colons (section headers like "Substitutes:")
 */
export function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();

  // Empty or whitespace only
  if (trimmed.length === 0) {
    return true;
  }

  const firstChar = trimmed[0];

  // Markdown headers
  if (firstChar === "#") {
    return true;
  }

  // Markdown quotes
  if (firstChar === ">") {
    return true;
  }

  // Skip bare separators such as "-", "*", "+", or lines made only of dashes/underscores.
  if (firstChar === "-" || firstChar === "*" || firstChar === "+") {
    const rest = trimmed.substring(1);
    if (rest.trim().length === 0) {
      return true; // bare bullet/separator line
    }
    if (/^[\s\-_=~]+$/.test(rest)) {
      return true; // separator line like "-----" or "* * *"
    }
    // Otherwise, keep bullet list items for parsing because they may contain valid names.
  }

  // Check for only separators: ===, ---, ___, ~~~
  if (/^[\s\-=_~|]+$/.test(trimmed)) {
    return true;
  }

  // Markdown table row: starts and ends with |
  // But we need to be smart about it - skip if it looks like a table header or separator
  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    // Extract the content between pipes
    const content = trimmed.slice(1, -1);

    // If it's all dashes and pipes, it's a separator row
    if (/^[\s\-:|]+$/.test(content)) {
      return true;
    }

    // If it contains a reserved word as the primary content, it's a header
    const cells = content.split("|").map((c) => c.trim());
    const hasOnlyReservedWords = cells.every((cell) => {
      if (!cell) return true; // empty cell is OK
      return RESERVED_WORDS_NORMALIZED.has(normalizeForComparison(cell));
    });

    if (hasOnlyReservedWords && cells.some((c) => c)) {
      // All non-empty cells are reserved words → skip
      return true;
    }
  }

  // Lines ending with colon (likely section headers like "Substitutes:" or "Level 4:")
  if (trimmed.endsWith(":") && !trimmed.includes("|")) {
    const beforeColon = trimmed.slice(0, -1).trim();
    // If it's not a pure number, it's likely a section header
    if (!/^\d+$/.test(beforeColon)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitize a player name by removing formatting, table markers, bullets, etc.
 * 
 * Performs:
 * 1. Trim whitespace
 * 2. Remove table pipes (|)
 * 3. Remove Markdown formatting (* ** _ __)
 * 4. Remove bullet markers (-, *, +)
 * 5. Remove numbered list prefixes (1. 2) 3- etc.)
 * 6. Collapse multiple spaces
 * 7. Trim again
 * 
 * Returns cleaned name, or empty string if it becomes invalid.
 */
export function sanitizePlayerName(raw: string): string {
  let cleaned = raw.trim();

  // Remove table pipes
  cleaned = cleaned.replace(/\|/g, " ");

  // Remove Markdown bold/italic: **, __, *, _
  cleaned = cleaned.replace(/\*\*|__|\*|_/g, "");

  // Remove bullet markers at the start: -, *, +, followed by space
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/, "");

  // Remove numbered list prefixes: "1.", "2)", "3-", etc.
  cleaned = cleaned.replace(/^\d+[.):-]\s*/, "");

  // Collapse multiple spaces into one
  cleaned = cleaned.replace(/\s+/g, " ");

  // Trim again
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Check if a string is a plausible human name.
 * 
 * A valid name:
 * - Is not empty
 * - Is not longer than 40 characters
 * - Is not a reserved word (header, metadata keyword, etc.)
 * - Contains at least one letter (to avoid pure numbers, etc.)
 * - Contains only: letters (including accented), spaces, hyphens, apostrophes
 * - At least 2 letters total (to avoid single-letter names or pure punctuation)
 */
export function isValidHumanName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 40) {
    return false;
  }

  // Reject if it looks like metadata/headers
  const normalized = normalizeForComparison(name);
  if (RESERVED_WORDS_NORMALIZED.has(normalized)) {
    return false;
  }

  // Must contain at least 2 letters to be a plausible human name
  const letterCount = (name.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 2) {
    return false;
  }

  // Only allow letters, digits, spaces, hyphens, and apostrophes.
  // Uses Unicode properties to support accented and international letters.
  const validCharsPattern = /^[\p{Letter}\d\s'-]+$/u;
  if (!validCharsPattern.test(name)) {
    return false;
  }

  return true;
}

/**
 * Parse a single line of text into a player name and optional level.
 * 
 * Returns { name, level } or null if the line cannot yield a valid player.
 * 
 * Format: "Name [Level]" where Level is 1-5.
 * If level is omitted, defaults to 3.
 */
export function parsePlayerLine(line: string): { name: string; level: number } | null {
  if (shouldSkipLine(line)) {
    return null;
  }

  const cleaned = sanitizePlayerName(line);
  if (!cleaned) {
    return null;
  }

  // Try to extract level from the end
  const parts = cleaned.split(/\s+/);
  let level = 3; // default
  let nameStr = cleaned;

  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    if (/^[1-5]$/.test(lastPart)) {
      level = parseInt(lastPart, 10);
      nameStr = parts.slice(0, -1).join(" ");
    }
  }

  if (!isValidHumanName(nameStr)) {
    return null;
  }

  return { name: nameStr, level };
}

/**
 * Parse raw import text into an array of valid player rows.
 * 
 * Filters out invalid lines automatically.
 * Skips markdown, tables, headers, reserved words, etc.
 */
export function parseImportText(raw: string): Array<{ name: string; level: number }> {
  return raw
    .split("\n")
    .map((line) => parsePlayerLine(line))
    .filter((result): result is { name: string; level: number } => result !== null);
}
