/**
 * Security scanner for skills content.
 *
 * Scans for prompt injection patterns, malicious code patterns,
 * and validates network endpoints before skill activation.
 *
 * Uses a weighted scoring system: patterns have weights 1–3.
 * A skill fails if:
 *   - Any single pattern with weight ≥ 3 matched, OR
 *   - Total accumulated score ≥ 4 across multiple lower-weight signals
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

/** Minimum accumulated score across all patterns to fail. */
const SCORE_FAIL_THRESHOLD = 4;

/** Weight at or above which a single match causes immediate failure. */
const HIGH_WEIGHT_THRESHOLD = 3;

/** Weighted pattern definition for heuristic scoring. */
interface WeightedPattern {
  readonly pattern: RegExp;
  readonly message: string;
  /** Severity weight: 1 = weak signal, 2 = moderate, 3 = strong (instant fail). */
  readonly weight: number;
}

/** Prompt injection and obfuscation patterns for detection. */
const SCAN_PATTERNS: readonly WeightedPattern[] = [
  // ── Classic prompt injection phrases ──
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
    weight: 2,
  },
  {
    pattern: /reveal\s+(all\s+)?(your\s+)?(secrets|credentials|keys|passwords)/i,
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
  // ── Encoding / obfuscation patterns ──
  {
    pattern: /(?:[A-Za-z0-9+/]{40,}={0,2})/,
    message: "Obfuscation: long base64-encoded string detected (possible payload)",
    weight: 2,
  },
  {
    pattern: /\batob\s*\(/i,
    message: "Obfuscation: base64 decode call (atob) detected",
    weight: 3,
  },
  {
    pattern: /[\u200B-\u200D\uFEFF\u2060]/,
    message: "Obfuscation: zero-width or invisible Unicode characters detected",
    weight: 3,
  },
  {
    pattern: /rot(?:ate)?[\s-]?13/i,
    message: "Obfuscation: ROT13 encoding reference",
    weight: 2,
  },
  // ── Shell command injection patterns ──
  {
    pattern: /base64\s+-d|echo\s+\S+\s*\|\s*(?:ba?sh|sh\b)/i,
    message: "Shell injection: command execution via encoding",
    weight: 3,
  },
  // ── Suspicious string reassembly ──
  {
    pattern: /(?:["'][^"']*["']\s*\+\s*["'][^"']*["']){2,}/,
    message: "Obfuscation: repeated string concatenation (possible split injection)",
    weight: 1,
  },
];

/** Scan content and accumulate pattern weights into a score with warnings. */
function scoreContent(content: string): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;
  for (const { pattern, message, weight } of SCAN_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(message);
      score += weight;
    }
  }
  return { score, warnings };
}

/** Check whether any matched pattern in the content has weight ≥ HIGH_WEIGHT_THRESHOLD. */
function anyHighWeightMatch(content: string): boolean {
  return SCAN_PATTERNS.some(
    ({ pattern, weight }) =>
      weight >= HIGH_WEIGHT_THRESHOLD && pattern.test(content),
  );
}

/**
 * Create a skill scanner that checks content for security issues.
 *
 * Uses weighted pattern matching with a scoring system:
 * - Fails immediately if any single pattern with weight ≥ 3 matches
 * - Fails if total accumulated score across all patterns ≥ 4
 */
export function createSkillScanner(): SkillScanner {
  return {
    // deno-lint-ignore require-await
    async scan(content: string): Promise<ScanResult> {
      const { score, warnings } = scoreContent(content);
      const failed = anyHighWeightMatch(content) || score >= SCORE_FAIL_THRESHOLD;
      return {
        ok: !failed,
        warnings,
      };
    },
  };
}
