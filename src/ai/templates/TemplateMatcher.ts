/**
 * src/ai/templates/TemplateMatcher.ts
 *
 * Template Matcher — Advanced keyword matching and template scoring.
 *
 * Provides:
 * - Keyword extraction from requirements
 * - Scoring logic for template matches
 * - Fuzzy matching support (future)
 * - Match confidence calculation
 */

export interface MatchScore {
  exactMatches: number;
  partialMatches: number;
  totalScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class TemplateMatcher {
  /**
   * Extract keywords from requirement text.
   * Filters common words and returns meaningful terms.
   */
  static extractKeywords(requirement: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'is', 'are', 'to', 'of', 'in', 'for',
      'with', 'by', 'from', 'as', 'on', 'at', 'create', 'run', 'test', 'test case',
      'test plan', 'workflow', 'process', 'user', 'agent', 'system',
    ]);

    const words = requirement
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !commonWords.has(w));

    return [...new Set(words)];
  }

  /**
   * Calculate match confidence based on keyword overlap.
   */
  static calculateConfidence(
    matchedCount: number,
    totalTemplateKeywords: number,
    requirementKeywords: number
  ): { score: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
    // Score based on percentage of template keywords matched
    const templateCoverage = matchedCount / totalTemplateKeywords;

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    let score: number;

    if (templateCoverage >= 0.7) {
      confidence = 'HIGH';
      score = 0.9;
    } else if (templateCoverage >= 0.4) {
      confidence = 'MEDIUM';
      score = 0.6;
    } else {
      confidence = 'LOW';
      score = 0.3;
    }

    return { score, confidence };
  }

  /**
   * Check for exact keyword match (word boundary).
   */
  static isExactMatch(keyword: string, text: string): boolean {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Check for partial keyword match (substring).
   */
  static isPartialMatch(keyword: string, text: string): boolean {
    return text.toLowerCase().includes(keyword.toLowerCase());
  }

  /**
   * Score a requirement against a list of template keywords.
   */
  static scoreMatch(requirement: string, templateKeywords: string[]): MatchScore {
    const requirementLower = requirement.toLowerCase();
    let exactMatches = 0;
    let partialMatches = 0;

    for (const keyword of templateKeywords) {
      if (this.isExactMatch(keyword, requirementLower)) {
        exactMatches += 1;
      } else if (this.isPartialMatch(keyword, requirementLower)) {
        partialMatches += 1;
      }
    }

    // Weight exact matches more heavily
    const totalScore = (exactMatches * 2 + partialMatches) / (templateKeywords.length * 2);
    const { confidence } = this.calculateConfidence(
      exactMatches + partialMatches,
      templateKeywords.length,
      this.extractKeywords(requirement).length
    );

    return {
      exactMatches,
      partialMatches,
      totalScore: Math.min(1, totalScore),
      confidence,
    };
  }

  /**
   * Get match explanation (for logging/debugging).
   */
  static getMatchExplanation(
    templateName: string,
    matchScore: MatchScore,
    matchedKeywords: string[]
  ): string {
    return (
      `Template "${templateName}" (${matchScore.confidence} confidence, ${(matchScore.totalScore * 100).toFixed(1)}% match) ` +
      `| Exact: ${matchScore.exactMatches}, Partial: ${matchScore.partialMatches} ` +
      `| Keywords: ${matchedKeywords.join(', ')}`
    );
  }
}
