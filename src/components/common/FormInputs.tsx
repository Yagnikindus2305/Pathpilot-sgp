import { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { checkPasswordStrength, parsePhoneValue, formatPhoneValue, sanitizePhoneDigits } from '@/lib/validation';
import { COUNTRY_DIAL_CODES } from '@/lib/countries';

export function BrandMark({ size = 32 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#1e2761" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
      <rect x="9" y="22" width="5" height="9" rx="1.5" fill="#aebcff" />
      <rect x="17" y="15" width="5" height="16" rx="1.5" fill="#fff" />
      <rect x="25" y="9" width="5" height="22" rx="1.5" fill="#fff" />
      <polyline points="11.5,19 19.5,13 27.5,7" stroke="#79e4b0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="11.5" cy="19" r="2" fill="#aebcff" />
      <circle cx="27.5" cy="7" r="2.6" fill="#79e4b0" />
    </svg>
  );
}

export function BrandLogo({ hero = false, light = false }: { hero?: boolean; light?: boolean }) {
  return (
    <div className={['brand', light && 'brand-light', hero && 'brand-hero'].filter(Boolean).join(' ')}>
      <BrandMark size={hero ? 44 : 30} />
      <div>
        <span className="brand-word">path<span>pilot</span></span>
        {hero && <div className="brand-tagline">TRACK &middot; GROW &middot; GET PLACED</div>}
      </div>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  showStrength = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? checkPasswordStrength(value) : null;

  return (
    <div className="password-field">
      <div className="password-input-wrap">
        <input
          required
          minLength={6}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'At least 6 characters'}
          className="modern-input"
        />
        <button
          type="button"
          className="password-toggle"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {showStrength && value && strength && (
        <div className="password-strength">
          <div className={`strength-bar strength-${strength.score}`}>
            <div style={{ width: `${(strength.score / 5) * 100}%` }} />
          </div>
          <div className="strength-header">
            <span className={`strength-label strength-${strength.score}`}>{strength.label}</span>
            <span className="strength-hint">{strength.score >= 4 ? 'Great password' : 'Add uppercase, numbers & symbols'}</span>
          </div>
          {strength.issues.length > 0 && (
            <ul className="strength-issues">
              {strength.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function PhoneInput({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const parsed = parsePhoneValue(value);
  return (
    <div className="phone-input-group modern-phone-group">
      <select
        value={parsed.iso2}
        onChange={(e) => onChange(formatPhoneValue(e.target.value, parsed.digits))}
        aria-label="Country code"
        className="phone-country-select"
      >
        {COUNTRY_DIAL_CODES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.name} (+{c.dialCode})
          </option>
        ))}
      </select>
      <input
        required={required}
        type="tel"
        inputMode="numeric"
        value={parsed.digits}
        onChange={(e) => onChange(formatPhoneValue(parsed.iso2, sanitizePhoneDigits(e.target.value)))}
        placeholder={parsed.iso2 === 'IN' ? '9876543210' : 'Phone number'}
        className="modern-input phone-number-input"
      />
    </div>
  );
}
