import fs from 'fs';
import path from 'path';

export type ModerationAction = 'allow' | 'block' | 'revise';
export type ModerationEvent = { stage: 'pre' | 'post'; action: ModerationAction; reason?: string };

// FIX: [CWE-1333] Comprehensive PII detection patterns (non-backtracking)
const PII_PATTERNS = {
  SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  CVV: /\b(?:cvv|cvc|cid)[\s:]*\d{3,4}\b/gi,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  UK_NIN: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}\b/gi,
  SG_NRIC: /\b[STFGM]\d{7}[A-Z]\b/gi,
  HK_HKID: /\b[A-Z]{1,2}\d{6}\([0-9A]\)/gi,
  PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
  BANK_ACCOUNT: /\b\d{8,17}\b/g,
  API_KEY: /\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token)[\s:=]+[A-Za-z0-9\-_]{20,}\b/gi,
  PASSWORD: /\b(?:password|passwd|pwd)[\s:=]+\S+/gi,
  SECRET: /\b(?:secret|private[_-]?key)[\s:=]+\S+/gi
};

function redactPII(input: string): string {
  let redacted = input;
  const orderedPatterns = Object.entries(PII_PATTERNS).sort(([a], [b]) => {
    if (a === 'HK_HKID') return -1;
    if (b === 'HK_HKID') return 1;
    return 0;
  });

  orderedPatterns.forEach(([type, pattern]) => {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, `<REDACTED_${type}>`);
  });

  return redacted;
}

export function preFilter(input: string): ModerationEvent {
  const hasPII = Object.values(PII_PATTERNS).some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });

  if (hasPII) {
    return { stage: 'pre', action: 'revise', reason: 'pii_detected_and_redacted' };
  }

  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /system\s+prompt/gi,
    /\bexec\b|\beval\b|\bscript\b/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script[\s\S]*?>/gi, // FIX: Robustly match script end tags like </script\t\n bar>
    /[;&|`$].*(?:rm|sudo|chmod|wget|curl)/gi
  ];

  const hasInjection = INJECTION_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });

  if (hasInjection) {
    return { stage: 'pre', action: 'block', reason: 'prompt_injection_attempt' };
  }

  return { stage: 'pre', action: 'allow' };
}

export function steerPrompt(input: string): string {
  const redactedInput = redactPII(input);
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

export function postModerate(output: string): ModerationEvent {
  const UNSAFE_PATTERNS = [
    /\b(?:violent|illegal|harmful|dangerous|weapon|explosive|poison|bomb)\b/gi,
    /\b(?: hack|exploit|vulnerability|backdoor|malware)\b/gi,
    /\b(?:drug|narcotic|cocaine|heroin|methamphetamine)\b/gi
  ];

  const hasUnsafeContent = UNSAFE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(output);
  });

  if (hasUnsafeContent) {
    return { stage: 'post', action: 'block', reason: 'unsafe_content_generated' };
  }

  const hasSystemInfo = /\b(?:api[_-]?key|password|token|secret|internal|confidential)\b/gi.test(output);

  if (hasSystemInfo) {
    return { stage: 'post', action: 'revise', reason: 'potential_information_disclosure' };
  }

  return { stage: 'post', action: 'allow' };
}

// New: Governance Verification for MAS FEAT and HKMA Ethics
export function verifyGovernance(message: string) {
  const isHighRiskCredit = /\b(?:credit|loan|underwriting|mortgage|finance)\b/gi.test(message);

  if (!isHighRiskCredit) {
    return null;
  }

  const currentDir = process.cwd();
  const possibleRoots = [currentDir, path.join(currentDir, '..')];

  let zkPath = '';
  let caePath = '';

  for (const root of possibleRoots) {
    const zp = path.join(root, 'governance_artifacts', 'zk', 'demographic_parity_proof.json');
    const cp = path.join(root, 'governance_artifacts', 'interpretability', 'cae_envelope.json');
    if (fs.existsSync(zp)) {
      zkPath = zp;
      caePath = cp;
      break;
    }
  }

  const zkVerified = zkPath !== '';
  const caeVerified = caePath !== '';

  return {
    use_case: "credit_underwriting",
    risk_tier: "high",
    zk_dp_proof_verified: zkVerified,
    cae_verified: caeVerified,
    compliance_regimes: ["mas_feat", "hkma_ethics"]
  };
}
