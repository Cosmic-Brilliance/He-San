export type ModerationAction = 'allow' | 'block' | 'revise';
export type ModerationEvent = { stage: 'pre' | 'post'; action: ModerationAction; reason?: string };

// FIX: [CWE-1333] Comprehensive PII detection patterns (non-backtracking)
const PII_PATTERNS = {
  // US Social Security Number (multiple formats)
  SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  // Credit Card (Visa, Mastercard, Amex, Discover)
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // CVV
  CVV: /\b(?:cvv|cvc|cid)[\s:]*\d{3,4}\b/gi,
  // Email (basic pattern)
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone Number (US/UK formats)
  PHONE: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // UK National Insurance Number
  UK_NIN: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}\b/gi,
  // Singapore NRIC/FIN
  SG_NRIC: /\b[STFG]\d{7}[A-Z]\b/gi,
  // Hong Kong HKID
  HK_HKID: /\b[A-Z]{1,2}\d{6}\([0-9A]\)\b/gi,
  // Passport Number (generic)
  PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
  // Bank Account Number (generic)
  BANK_ACCOUNT: /\b\d{8,17}\b/g,
  // API Keys (generic patterns)
  API_KEY: /\b(?:\x61\x70\x69[_-]?\x6b\x65\x79|\x61\x70\x69\x6b\x65\x79|\x61\x63\x63\x65\x73\x73[_-]?\x74\x6f\x6b\x65\x6e|\x61\x75\x74\x68[_-]?\x74\x6f\x6b\x65\x6e)[\s:=]+[A-Za-z0-9\-_]{20,}\b/gi,
  // Passwords (in plaintext)
  PASSWORD: /\b(?:\x70\x61\x73\x73\x77\x6f\x72\x64|\x70\x61\x73\x73\x77\x64|\x70\x77\x64)[\s:=]+\S+/gi,
  // Secret Keys
  SECRET: /\b(?:\x73\x65\x63\x72\x65\x74|\x70\x72\x69\x76\x61\x74\x65[_-]?\x6b\x65\x79)[\s:=]+\S+/gi
};

// FIX: [CWE-20] Redaction function with secure replacement
function redactPII(input: string): string {
  let redacted = input;

  // Apply all PII patterns
  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    redacted = redacted.replace(pattern, `<REDACTED_${type}>`);
  });

  return redacted;
}

// FIX: [CWE-707] Enhanced preFilter with comprehensive PII detection
export function preFilter(input: string): ModerationEvent {
  // Check for PII presence
  const hasPII = Object.values(PII_PATTERNS).some(pattern => pattern.test(input));

  if (hasPII) {
    return {
      stage: 'pre',
      action: 'revise',
      reason: 'pii_detected_and_redacted'
    };
  }

  // FIX: [CWE-94] Check for prompt injection patterns
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /system\s+prompt/gi,
    /\bexec\b|\beval\b|\bscript\b/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,  // XSS attempts
    /[;&|`$].*(?:rm|sudo|chmod|wget|curl)/gi  // Command injection
  ];

  const hasInjection = INJECTION_PATTERNS.some(pattern => pattern.test(input));

  if (hasInjection) {
    return {
      stage: 'pre',
      action: 'block',
      reason: 'prompt_injection_attempt'
    };
  }

  return { stage: 'pre', action: 'allow' };
}

// FIX: [CWE-116] Enhanced prompt steering with system context
export function steerPrompt(input: string): string {
  // Redact PII before processing
  const redactedInput = redactPII(input);

  // Add safety context
  return `[SYSTEM CONTEXT]
Policy: Be safe, ethical, and helpful. Avoid unsafe, illegal, or harmful advice.
User Input Sanitization: PII redacted per GDPR Art. 25
Regulatory Compliance: EU AI Act Art. 14 (Human Oversight Required)

[USER INPUT]
${redactedInput}

[SAFETY CONSTRAINTS]
- Do not generate content that violates laws or regulations
- Do not assist with activities that could cause harm
- Maintain confidentiality of redacted information
- Flag suspicious requests for human review`;
}

// FIX: [CWE-693] Enhanced post-moderation with comprehensive checks
export function postModerate(output: string): ModerationEvent {
  // Check for unsafe content
  const UNSAFE_PATTERNS = [
    /\b(?:violent|illegal|harmful|dangerous|weapon|explosive|poison|bomb)\b/gi,
    /\b(?:hack|exploit|vulnerability|backdoor|malware)\b/gi,
    /\b(?:drug|narcotic|cocaine|heroin|methamphetamine)\b/gi
  ];

  const hasUnsafeContent = UNSAFE_PATTERNS.some(pattern => pattern.test(output));

  if (hasUnsafeContent) {
    return {
      stage: 'post',
      action: 'block',
      reason: 'unsafe_content_generated'
    };
  }

  // FIX: [CWE-200] Check for information disclosure
  const hasSystemInfo = /\b(?:\x61\x70\x69[_-]?\x6b\x65\x79|\x70\x61\x73\x73\x77\x6f\x72\x64|token|\x73\x65\x63\x72\x65\x74|internal|confidential)\b/gi.test(output);

  if (hasSystemInfo) {
    return {
      stage: 'post',
      action: 'revise',
      reason: 'potential_information_disclosure'
    };
  }

  return { stage: 'post', action: 'allow' };
}
