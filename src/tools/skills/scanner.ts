/**
 * Security scanner for skills content.
 *
 * Scans for prompt injection patterns, malicious code patterns,
 * obfuscation techniques, and validates content before skill activation.
 *
 * Uses a weighted heuristic scoring system:
 * - Each pattern has a weight (1 = weak signal, 2 = moderate, 3 = critical)
 * - Scan fails if any weight >= 3 pattern matches OR total score >= 4
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

/** Weighted pattern for heuristic scanning. */
interface ScanPattern {
  readonly pattern: RegExp;
  readonly message: string;
  /** 1 = weak signal, 2 = moderate, 3 = critical (instant fail). */
  readonly weight: number;
}

/** Prompt injection and obfuscation patterns to detect. */
export const INJECTION_PATTERNS: readonly ScanPattern[] = [
  // ─── Original prompt injection patterns (weight 3 = critical) ──────────────
  {
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    message: "Prompt injection: attempts to override previous instructions",
    weight: 3,
  },
  {
    pattern: /system\s+prompt\s+override/i,
    message: "Prompt injection: attempts system prompt override",
    weight: 3,
  },
  {
    pattern: /disregard\s+(all\s+)?(prior|previous|above)/i,
    message: "Prompt injection: attempts to disregard prior context",
    weight: 3,
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s/i,
    message: "Prompt injection: attempts to redefine agent identity",
    weight: 3,
  },
  {
    pattern:
      /reveal\s+(all\s+)?(your\s+)?(secrets|credentials|keys|passwords)/i,
    message: "Prompt injection: attempts to extract secrets",
    weight: 3,
  },
  {
    pattern: /forget\s+(all\s+)?(your\s+)?(rules|instructions|constraints)/i,
    message: "Prompt injection: attempts to clear constraints",
    weight: 3,
  },
  {
    pattern: /bypass\s+(security|policy|classification|restrictions)/i,
    message: "Prompt injection: attempts to bypass security controls",
    weight: 3,
  },
  {
    pattern: /sudo\s+mode|admin\s+mode|god\s+mode/i,
    message: "Prompt injection: attempts privilege escalation",
    weight: 3,
  },

  // ─── New obfuscation detection patterns ────────────────────────────────────
  {
    pattern: /atob\s*\(/i,
    message: "Scanner: base64 decode call (atob) detected",
    weight: 3,
  },
  {
    pattern: /[\u200B-\u200D\uFEFF\u2060]/,
    message: "Scanner: zero-width/invisible Unicode characters detected",
    weight: 3,
  },
  {
    pattern: /base64\s+-d|echo\s+\S+\s*\|\s*(?:bash|sh)/i,
    message: "Scanner: shell command encoding pattern detected",
    weight: 3,
  },
  {
    pattern: /rot(?:ate)?[\s-]?13/i,
    message: "Scanner: ROT13 encoding reference detected",
    weight: 2,
  },
  {
    pattern: /['"][^'"]{0,40}['"]\s*\+\s*['"][^'"]{0,40}['"]/,
    message: "Scanner: string concatenation pattern (possible split injection)",
    weight: 1,
  },
  {
    pattern: /[A-Za-z0-9+/]{40,}={0,2}/,
    message: "Scanner: long base64-encoded string detected",
    weight: 2,
  },
];

/** Score threshold for heuristic failure. */
const HEURISTIC_SCORE_THRESHOLD = 4;

/** Weight at or above which a single pattern triggers instant failure. */
const CRITICAL_WEIGHT_THRESHOLD = 3;

/**
 * Create a skill scanner that checks content for security issues.
 *
 * Uses weighted heuristic scoring: fails if any critical (weight >= 3)
 * pattern matches or if cumulative score reaches the threshold (>= 4).
 */
export function createSkillScanner(): SkillScanner {
  return {
    // deno-lint-ignore require-await
    async scan(content: string): Promise<ScanResult> {
      const warnings: string[] = [];
      let totalScore = 0;
      let hasCritical = false;

      for (const { pattern, message, weight } of INJECTION_PATTERNS) {
        if (pattern.test(content)) {
          warnings.push(message);
          totalScore += weight;
          if (weight >= CRITICAL_WEIGHT_THRESHOLD) {
            hasCritical = true;
          }
        }
      }

      return {
        ok: !hasCritical && totalScore < HEURISTIC_SCORE_THRESHOLD,
        warnings,
      };
    },
  };
}
