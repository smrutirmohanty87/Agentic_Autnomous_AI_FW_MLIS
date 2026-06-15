/**
 * src/ai/compression/CompressionTypes.ts
 *
 * Type definitions for prompt compression.
 */

// ---------------------------------------------------------------------------
// Business Actions (verbs that indicate workflow steps)
// ---------------------------------------------------------------------------

export type BusinessAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'RETRIEVE'
  | 'UPDATE'
  | 'DELETE'
  | 'SEARCH'
  | 'VERIFY'
  | 'VALIDATE'
  | 'ISSUE'
  | 'CANCEL'
  | 'APPROVE'
  | 'REJECT'
  | 'GENERATE'
  | 'CALCULATE'
  | 'REVIEW'
  | 'CONFIRM'
  | 'SUBMIT'
  | 'EXECUTE'
  | 'CHECK'
  | 'REGISTER'
  | 'ACTIVATE'
  | 'DEACTIVATE';

// ---------------------------------------------------------------------------
// Entity Types
// ---------------------------------------------------------------------------

export type EntityType =
  | 'QUOTE'
  | 'POLICY'
  | 'BROKER'
  | 'USER'
  | 'CLIENT'
  | 'AGENT'
  | 'PREMIUM'
  | 'RISK'
  | 'PROPERTY'
  | 'COVERAGE'
  | 'CLAIM'
  | 'ENDORSEMENT'
  | 'CANCELLATION'
  | 'REISSUE'
  | 'DOCUMENT'
  | 'SYSTEM'
  | 'FORM'
  | 'FIELD'
  | 'PERMISSION'
  | 'ROLE';

// ---------------------------------------------------------------------------
// Workflow Types
// ---------------------------------------------------------------------------

export type WorkflowType =
  | 'CommercialQuote'
  | 'ResidentialQuote'
  | 'PolicyCancellation'
  | 'PolicyEndorsement'
  | 'BrokerSearch'
  | 'UserVerification'
  | 'ClaimProcessing'
  | 'PolicyRenewal'
  | 'GenericWorkflow'
  | 'Unknown';

// ---------------------------------------------------------------------------
// Compressed Requirement Structure
// ---------------------------------------------------------------------------

export interface CompressedStep {
  action: string;
  target?: string;
  detail?: string;
}

export interface CompressedRequirement {
  original: string;
  compressed: string;
  workflow: WorkflowType;
  steps: CompressedStep[];
  entities: EntityType[];
  validations: string[];
  keywords: string[];
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  compressedAt: string;
}

// ---------------------------------------------------------------------------
// Compression Metrics
// ---------------------------------------------------------------------------

export interface CompressionMetrics {
  originalLength: number;
  compressedLength: number;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  stepsExtracted: number;
  entitiesExtracted: number;
  validationsExtracted: number;
  workflowDetected: WorkflowType;
  executedAt: string;
}
