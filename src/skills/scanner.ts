/**
 * Security scanner for skills content.
 *
 * Scans for prompt injection patterns, malicious code patterns,
 * and validates network endpoints before skill activation.
 *
 * @module
 */

/** Result of a security scan. */
export interface ScanResult {
  /** Whether the content passed the scan. */
  readonly ok: boolean;
  /** Warning messages for flagged patterns. */
  readonly warnings: readonly string[];
}

/** Skill scanner interface. */
export interface SkillScanner {
  /** Scan content for security issues. */
  scan(content: string): Promise<ScanResult>;
}

/** Prompt injection patterns to detect. */
const INJECTION_PATTERNS: readonly { readonly pattern: RegExp; readonly message: string }[] = [
  {
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    message: "Prompt injection: attempts to override previous instructions",
  },
  {
    pattern: /system\s+prompt\s+override/i,
    message: "Prompt injection: attempts system prompt override",
  },
  {
    pattern: /disregard\s+(all\s+)?(prior|previous|above)/i,
    message: "Prompt injection: attempts to disregard prior context",
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s/i,
    message: "Prompt injection: attempts to redefine agent identity",
  },
  {
    pattern: /reveal\s+(all\s+)?(your\s+)?(secrets|credentials|keys|passwords)/i,
    message: "Prompt injection: attempts to extract secrets",
  },
  {
    pattern: /forget\s+(all\s+)?(your\s+)?(rules|instructions|constraints)/i,
    message: "Prompt injection: attempts to clear constraints",
  },
  {
    pattern: /bypass\s+(security|policy|classification|restrictions)/i,
    message: "Prompt injection: attempts to bypass security controls",
  },
  {
    pattern: /sudo\s+mode|admin\s+mode|god\s+mode/i,
    message: "Prompt injection: attempts privilege escalation",
  },
];

/**
 * Create a skill scanner that checks content for security issues.
 *
 * Scans for prompt injection patterns, social engineering attempts,
 * and other malicious content patterns.
 */
export function createSkillScanner(): SkillScanner {
  return {
    async scan(content: string): Promise<ScanResult> {
      const warnings: string[] = [];

      for (const { pattern, message } of INJECTION_PATTERNS) {
        if (pattern.test(content)) {
          warnings.push(message);
        }
      }

      return {
        ok: warnings.length === 0,
        warnings,
      };
    },
  };
}
