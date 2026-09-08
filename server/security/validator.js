import { URL } from 'node:url';

/**
 * Enterprise Security Validation & Sanitization Module
 * Protects against SSRF, XSS, SQLi patterns, and Buffer/Length Bypass.
 */

// Private & reserved IP patterns for SSRF prevention
const PRIVATE_IP_RANGES = [
  /^127\./,                         // Loopback
  /^10\./,                          // 10.0.0.0/8 Private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 Private
  /^192\.168\./,                    // 192.168.0.0/16 Private
  /^169\.254\./,                    // 169.254.0.0/16 Link-Local / Cloud Metadata (AWS/GCP/Azure)
  /^0\./,                           // Current network
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 Unique local
  /^fe80:/i,                        // IPv6 Link-local
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
]);

/**
 * Validates external URLs to strictly prevent Server-Side Request Forgery (SSRF).
 * Blocks cloud metadata endpoints, internal RFC1918 IPs, loopbacks, and non-HTTP protocols.
 */
export function validateExternalUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, reason: 'URL must be a non-empty string.' };
  }

  const trimmed = urlString.trim();
  if (trimmed.length > 2048) {
    return { isValid: false, reason: 'URL exceeds maximum allowable length (2048 chars).' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, reason: 'Invalid URL format.' };
  }

  // Enforce HTTP / HTTPS protocol only (prevents file://, gopher://, dict://, javascript:)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, reason: `Protocol "${parsed.protocol}" is not permitted. Only HTTP and HTTPS are allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { isValid: false, reason: 'Access to internal or cloud metadata hostnames is forbidden.' };
  }

  // Check private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { isValid: false, reason: 'Access to loopback, private, or link-local IP addresses is strictly forbidden.' };
    }
  }

  return { isValid: true, sanitizedUrl: parsed.href };
}

/**
 * Strips dangerous HTML, script tags, event handlers, and data/javascript URIs to prevent XSS.
 */
export function sanitizeText(input, maxLength = 1000) {
  if (input == null) return '';
  const str = String(input);
  const truncated = str.slice(0, maxLength);

  return truncated
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '') // Event handlers like onerror="...", onload="..."
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Checks for common SQL injection manipulation patterns (UNION SELECT, sleep/benchmark, stacked queries).
 * Used as defense-in-depth on query parameters.
 */
export function containsSqliPattern(input) {
  if (!input || typeof input !== 'string') return false;
  const sqliRegex = /(\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|update\s+.*\s+set|exec(\s|\+)+(s|x)p\w*|waitfor\s+delay|benchmark\s*\(|sleep\s*\()\b)|(--|\/\*|\*\/|;\s*drop\b)/i;
  return sqliRegex.test(input);
}
