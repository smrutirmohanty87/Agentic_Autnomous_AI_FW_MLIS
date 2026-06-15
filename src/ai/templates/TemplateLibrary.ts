/**
 * src/ai/templates/TemplateLibrary.ts
 *
 * Template Library — Stores and manages predefined business workflow templates.
 *
 * Templates reduce token usage by providing structure for known patterns:
 * - Commercial Quote
 * - Residential Quote
 * - Policy Cancellation
 * - Policy Endorsement
 * - Broker Search
 * - User Verification
 *
 * Flow:
 *   1. Load templates from artifacts/templates/
 *   2. Match requirement against template keywords
 *   3. Return Template HIT with template structure
 *   4. If no match: Template MISS (normal flow)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateStatus = 'HIT' | 'MISS';

export interface WorkflowStep {
  name: string;
  description: string;
  expectedDuration?: number;
}

export interface CommonLocator {
  key: string;
  selectors: string[];
  type: 'button' | 'input' | 'link' | 'heading' | 'text' | 'other';
}

export interface ValidationPoint {
  step: string;
  checkDescription: string;
  expectedCondition: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  workflowSteps: WorkflowStep[];
  commonLocators: CommonLocator[];
  validationPoints: ValidationPoint[];
  estimatedDurationMs: number;
  createdAt: string;
}

export interface TemplateMatchResult {
  status: TemplateStatus;
  template?: Template;
  matchedKeywords?: string[];
  matchScore?: number;
}

// ---------------------------------------------------------------------------
// Template Library class
// ---------------------------------------------------------------------------

export class TemplateLibrary {
  private templatesDir: string;
  private templates: Map<string, Template>;

  constructor(templatesDir: string = resolve(__dirname, '../../artifacts/templates')) {
    this.templatesDir = templatesDir;
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load all templates from the templates directory.
   */
  private loadTemplates(): void {
    if (!existsSync(this.templatesDir)) {
      console.warn(`[templates] Templates directory not found: ${this.templatesDir}`);
      return;
    }

    try {
      const files = readdirSync(this.templatesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      jsonFiles.forEach(file => {
        try {
          const filePath = resolve(this.templatesDir, file);
          const content = readFileSync(filePath, 'utf-8');
          const template: Template = JSON.parse(content);
          this.templates.set(template.id, template);
          console.log(`[templates] ✓ Loaded template: ${template.name} (${template.id})`);
        } catch (err) {
          console.warn(`[templates] ✘ Failed to load template ${file}: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      console.log(`[templates] Loaded ${this.templates.size} template(s)`);
    } catch (err) {
      console.warn(`[templates] ✘ Failed to load templates: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Match requirement text against template keywords.
   * Returns Template HIT if keywords match, Template MISS otherwise.
   */
  match(requirement: string): TemplateMatchResult {
    const requirementLower = requirement.toLowerCase();
    let bestMatch: { template: Template; score: number; keywords: string[] } | null = null;

    // Score each template based on keyword matches
    for (const template of this.templates.values()) {
      const matchedKeywords = template.keywords.filter(keyword =>
        requirementLower.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        const score = matchedKeywords.length / template.keywords.length;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { template, score, keywords: matchedKeywords };
        }
      }
    }

    if (bestMatch && bestMatch.score >= 0.3) {
      // 30% keyword match threshold
      console.log(
        `[templates] ✔ TEMPLATE HIT: "${bestMatch.template.name}" (${bestMatch.score * 100}% match) ` +
        `| Keywords: ${bestMatch.keywords.join(', ')}`
      );
      return {
        status: 'HIT',
        template: bestMatch.template,
        matchedKeywords: bestMatch.keywords,
        matchScore: bestMatch.score,
      };
    }

    console.log(`[templates] ✘ TEMPLATE MISS: No matching template for requirement`);
    return { status: 'MISS' };
  }

  /**
   * Get a specific template by ID.
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * List all available templates.
   */
  listTemplates(): Array<{ id: string; name: string; keywords: string[] }> {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      keywords: t.keywords,
    }));
  }

  /**
   * Get template count.
   */
  getTemplateCount(): number {
    return this.templates.size;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let libraryInstance: TemplateLibrary | null = null;

export function getTemplateLibrary(): TemplateLibrary {
  if (!libraryInstance) {
    libraryInstance = new TemplateLibrary();
  }
  return libraryInstance;
}
