/**
 * runtime/workflowStatus.ts
 *
 * Reusable runtime status service.
 * Writes live execution state to runtime/workflow-status.json
 * so external tools (dashboard, CI scripts) can read it in real time.
 *
 * Public API:
 *   initializeWorkflow(workflowId)   — reset to PENDING, write fresh file
 *   updateAgent(name, state)         — update one agent entry + currentAgent
 *   markWorkflowComplete(status)     — set overallStatus + completedAt
 *   readWorkflowStatus()             — read current file contents
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type AgentName =
  | 'Planner'
  | 'Designer'
  | 'Generator'
  | 'Execution'
  | 'RCA'
  | 'Healing';

export const AGENT_NAMES: AgentName[] = [
  'Planner',
  'Designer',
  'Generator',
  'Execution',
  'RCA',
  'Healing',
];

export type WorkflowOverallStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface AgentStatusEntry {
  name: AgentName;
  state: AgentState;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface WorkflowStatus {
  workflowId: string;
  startedAt: string;
  completedAt?: string;
  overallStatus: WorkflowOverallStatus;
  currentAgent: AgentName | null;
  requirement?: string;
  generatedTestName?: string;
  currentStep?: string;
  agents: AgentStatusEntry[];
}

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const STATUS_FILE = path.resolve(__dirname, 'workflow-status.json');
// Also write to Vite public/ so the dashboard can fetch it via HTTP
const PUBLIC_STATUS_FILE = path.resolve(__dirname, '../dashboard-ui/public/workflow-status.json');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildInitialAgents(): AgentStatusEntry[] {
  return AGENT_NAMES.map(name => ({ name, state: 'PENDING' as AgentState }));
}

function write(status: WorkflowStatus): void {
  const json = JSON.stringify(status, null, 2);
  fs.writeFileSync(STATUS_FILE, json, 'utf-8');
  try {
    fs.writeFileSync(PUBLIC_STATUS_FILE, json, 'utf-8');
  } catch {
    // public/ may not exist in non-dashboard environments — silently skip
  }
}

function read(): WorkflowStatus {
  if (!fs.existsSync(STATUS_FILE)) {
    throw new Error(`[workflowStatus] Status file not found: ${STATUS_FILE}. Call initializeWorkflow() first.`);
  }
  return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')) as WorkflowStatus;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize (or reset) the workflow status file.
 * Must be called at the start of every orchestrator run.
 */
export function initializeWorkflow(
  workflowId: string = `run-${Date.now()}`,
  metadata?: { requirement?: string; generatedTestName?: string; currentStep?: string }
): void {
  const status: WorkflowStatus = {
    workflowId,
    startedAt: new Date().toISOString(),
    overallStatus: 'RUNNING',
    currentAgent: null,
    requirement: metadata?.requirement,
    generatedTestName: metadata?.generatedTestName,
    currentStep: metadata?.currentStep,
    agents: buildInitialAgents(),
  };
  write(status);
  console.log(`[workflowStatus] Initialized — ${workflowId}`);
}

/**
 * Update live workflow metadata (non-agent state), used by dashboard widgets.
 */
export function updateWorkflowContext(
  patch: { requirement?: string; generatedTestName?: string; currentStep?: string }
): void {
  const status = read();

  if (patch.requirement !== undefined) {
    status.requirement = patch.requirement;
  }
  if (patch.generatedTestName !== undefined) {
    status.generatedTestName = patch.generatedTestName;
  }
  if (patch.currentStep !== undefined) {
    status.currentStep = patch.currentStep;
  }

  write(status);
}

/**
 * Update the state of a single agent entry and set it as the currentAgent
 * when transitioning to RUNNING.
 */
export function updateAgent(name: AgentName, state: AgentState): void {
  const status = read();

  const entry = status.agents.find(a => a.name === name);
  if (!entry) {
    throw new Error(`[workflowStatus] Unknown agent: ${name}`);
  }

  const now = new Date().toISOString();

  if (state === 'RUNNING') {
    entry.state = 'RUNNING';
    entry.startedAt = now;
    entry.finishedAt = undefined;
    entry.durationMs = undefined;
    status.currentAgent = name;
  } else {
    entry.state = state;
    entry.finishedAt = now;
    if (entry.startedAt) {
      entry.durationMs = Date.now() - new Date(entry.startedAt).getTime();
    }
    // Clear currentAgent only when the finished agent was the active one
    if (status.currentAgent === name) {
      status.currentAgent = null;
    }
  }

  write(status);
}

/**
 * Mark the entire workflow as complete (SUCCESS or FAILED).
 */
export function markWorkflowComplete(overallStatus: 'SUCCESS' | 'FAILED'): void {
  const status = read();
  status.overallStatus = overallStatus;
  status.completedAt = new Date().toISOString();
  status.currentAgent = null;
  write(status);
  console.log(`[workflowStatus] Workflow complete — ${overallStatus}`);
}

/**
 * Read and return the current workflow status object.
 */
export function readWorkflowStatus(): WorkflowStatus {
  return read();
}
