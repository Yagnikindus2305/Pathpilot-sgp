// Catches placeholder numbers people type to get past validation without
// giving a real one — all-same-digit (9999999999) and sequential runs
// (1234567890, 9876543210). This can't prove the number is reachable (that
// needs real SMS OTP verification), it just filters out obvious junk.
const ASCENDING_DIGIT_CYCLE = '0123456789012345678901234567890123456789';
const DESCENDING_DIGIT_CYCLE = '9876543210987654321098765432109876543210';

function looksFake(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true;
  return ASCENDING_DIGIT_CYCLE.includes(digits) || DESCENDING_DIGIT_CYCLE.includes(digits);
}

// Strips everything but digits and caps at 10, so a phone <input>'s onChange
// can enforce "10 digits, not more" as the user types rather than only at submit.
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

export function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (looksFake(digits)) return false;
  return /^[6-9]\d{9}$/.test(digits);
}

export const PHONE_HELP_TEXT = 'Exactly 10 digits, a real Indian mobile number (not a placeholder like 9999999999)';

// Stricter than the browser's native type="email" check (which happily accepts
// things like "a@b" with no real TLD) — this is a format check only, not a
// deliverability check (proving an inbox is real needs an actual verification
// email, which Supabase's signup confirmation already handles). It exists to
// stop obviously-malformed input, including a fake single-letter TLD, from
// triggering an actual signup/OTP email send before Supabase even gets asked.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export const EMAIL_HELP_TEXT = 'Enter a valid email address (e.g. name@example.com).';
