/**
 * Tool name abbreviation system for generating ≤64 character names
 * Follows the pattern described in the developer guide
 */

import * as crypto from "crypto";

/**
 * Common words to remove during abbreviation
 */
const COMMON_WORDS_TO_REMOVE = [
  "controller",
  "service",
  "api",
  "endpoint",
  "resource",
  "manager",
  "handler",
  "processor",
  "provider",
  "factory",
  "builder",
  "helper",
  "utility",
  "util",
  "admin",
  // "user",
  "data",
  "info",
  "detail",
  "item",
  "list",
  "collection",
  "response",
  "request",
  "model",
  "entity",
  "object",
  "result",
  "value",
  "type",
  "class",
  "interface",
  "implementation",
  "impl",
  "abstract",
  "base",
  "default",
  "standard",
  "common",
  "shared",
  "public",
  "private",
  "internal",
  "external",
  "global",
  "local",
  "temp",
  "temporary",
  "cache",
  "buffer",
  "pool",
  "queue",
  "stack",
  "tree",
  "node",
  "leaf",
  "root",
  "branch",
  "client",
  "server",
  "proxy",
  "adapter",
  "wrapper",
  "decorator",
  "observer",
  "listener",
  "handler",
  "callback",
  "event",
  "action",
  "command",
  "query",
  "operation",
  "method",
  "function",
  "procedure",
  "process",
  "task",
  "job",
  "work",
  "execute",
  "run",
  "start",
  "stop",
  "pause",
  "resume",
  "cancel",
  "abort",
  "finish",
  "complete",
  "begin",
  "end",
  "init",
  "initialize",
  "setup",
  "configure",
  "config",
  "setting",
  "option",
  "parameter",
  "param",
  "argument",
  "arg",
  "input",
  "output",
  "in",
  "out",
];

/**
 * Standard word abbreviations
 */
const WORD_ABBREVIATIONS: Record<string, string> = {
  service: "svc",
  management: "mgmt",
  configuration: "config",
  information: "info",
  authentication: "auth",
  authorization: "authz",
  administration: "admin",
  administrator: "admin",
  application: "app",
  development: "dev",
  environment: "env",
  repository: "repo",
  database: "db",
  identifier: "id",
  parameter: "param",
  parameters: "params",
  argument: "arg",
  arguments: "args",
  response: "resp",
  request: "req",
  message: "msg",
  notification: "notif",
  organization: "org",
  business: "biz",
  reference: "ref",
  references: "refs",
  document: "doc",
  documents: "docs",
  specification: "spec",
  specifications: "specs",
  validation: "valid",
  verification: "verify",
  registration: "reg",
  subscription: "sub",
  publication: "pub",
  transaction: "txn",
  transactions: "txns",
  connection: "conn",
  connections: "conns",
  session: "sess",
  sessions: "sessions",
  statistics: "stats",
  analytics: "analytics",
  metadata: "meta",
  properties: "props",
  attributes: "attrs",
  extension: "ext",
  extensions: "exts",
  exception: "ex",
  exceptions: "exs",
  error: "err",
  errors: "errs",
  warning: "warn",
  warnings: "warns",
};

/**
 * Generate an abbreviated tool name that's ≤64 characters
 *
 * @param input - Original name/operationId/summary
 * @param disableAbbreviation - Skip abbreviation process
 * @param namespace - Optional namespace to prefix tools (not abbreviated)
 * @returns Abbreviated name in format [a-z0-9-]+
 */
export function generateToolName(
  input: string,
  disableAbbreviation: boolean = false,
  namespace?: string,
): string {
  if (!input) {
    throw new Error("Input string is required for tool name generation");
  }

  // Handle whitespace-only input gracefully
  if (input.trim() === "" || /^\s*$/.test(input)) {
    return "";
  }

  // Handle special case: if only special characters, return empty
  const hasAlphaNumeric = /[a-zA-Z0-9]/.test(input);
  if (!hasAlphaNumeric) {
    return "";
  }

  namespace = namespace?.trim();
  if (namespace?.length) {
    const sanitizedNamespace = sanitizeToolName(namespace);
    const abbreviatedName = generateToolName(
      input,
      disableAbbreviation,
      undefined,
    );
    return `${sanitizedNamespace}_${abbreviatedName}`;
  }

  // Step 1: Initial sanitization - replace non-alphanumeric with hyphens
  const name = sanitizeToolName(input);

  // Step 2.a: If abbreviation is disabled, just sanitize and return
  if (disableAbbreviation) {
    return name;
  }

  // Step 2.b: Split into words
  const words = splitIntoWords(name);

  // Step 3: Remove common words
  const filteredWords = words.filter(
    (word) => !COMMON_WORDS_TO_REMOVE.includes(word.toLowerCase()),
  );

  // Use filtered words if we have any, otherwise fall back to original
  const wordsToProcess = filteredWords.length > 0 ? filteredWords : words;

  // Step 4: Apply standard abbreviations
  const abbreviatedWords = wordsToProcess.map((word) => {
    const lower = word.toLowerCase();
    return WORD_ABBREVIATIONS[lower] || word;
  });

  // Step 5: Apply vowel removal for long words (>50 characters)
  const vowelRemovedWords = abbreviatedWords.map((word) => {
    if (word.length > 50 && !isCommonAbbreviation(word)) {
      return removeVowels(word);
    }
    return word;
  });

  // Step 6: Join and check length
  let result = vowelRemovedWords.join("-");

  // Step 7: If still too long or original was very long, add hash and truncate
  if (result.length > 64 || input.length > 100) {
    const hash = crypto
      .createHash("md5")
      .update(input)
      .digest("hex")
      .substring(0, 4);
    const maxNameLength = 64 - 5; // Reserve space for -hash

    if (result.length > maxNameLength) {
      result = result.substring(0, maxNameLength);
    }

    result += `-${hash}`;
  }

  return result.replace(/-/g, "_");
}

/**
 * Split a string into words based on various delimiters
 */
function splitIntoWords(input: string): string[] {
  return (
    input
      // Split on underscores and hyphens
      .split(/[ _-]+/)
      // Split on camelCase boundaries
      .flatMap((word) => word.split(/(?=[A-Z])/))
      // Split on number boundaries
      .flatMap((word) => word.split(/(?=\d)|(?<=\d)(?=[A-Za-z])/))
      // Filter empty strings and normalize
      .filter((word) => word.length > 0)
      .map((word) => word.toLowerCase())
  );
}

/**
 * Remove vowels from a word, keeping the first character and consonants
 */
function removeVowels(word: string): string {
  if (word.length <= 3) {
    return word;
  }

  const firstChar = word[0];
  const rest = word.slice(1).replace(/[aeiou]/g, "");

  return firstChar + rest;
}

/**
 * Check if a word is a common abbreviation that shouldn't have vowels removed
 */
function isCommonAbbreviation(word: string): boolean {
  const commonAbbrevs = [
    "api",
    "url",
    "uri",
    "http",
    "https",
    "xml",
    "json",
    "sql",
    "csv",
    "pdf",
  ];
  return commonAbbrevs.includes(word.toLowerCase());
}

/**
 * Sanitize a tool name to ensure it matches [a-z0-9-]+ pattern
 */
function sanitizeToolName(input: string): string {
  return (
    input
      // .toLowerCase()
      .replace(/(^a-z0-9-)/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * Validate that a tool name matches the required pattern
 */
export function isValidToolName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name) && name.length <= 64;
}
