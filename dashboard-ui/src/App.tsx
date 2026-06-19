import { useEffect, useRef, useState } from 'react';
import type { AgentRecord, WorkflowStatus as WorkflowStatusType } from './types/dashboard';
import { AgentStatusSection } from './components/AgentStatusSection';
import { SuiteProgressPanel } from './components/SuiteProgressPanel';
import { CurrentTestPanel } from './components/CurrentTestPanel';
import { HealingAnalyticsPanel } from './components/HealingAnalyticsPanel';
import { KpiCards } from './components/KpiCards';
import { LiveWorkflowPanel } from './components/LiveWorkflowPanel';
import { LiveRcaPanel } from './components/LiveRcaPanel';
import { RcaSummaryPanel } from './components/RcaSummaryPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { WorkflowSummaryCard } from './components/WorkflowSummaryCard';
import { WorkflowTimeline } from './components/WorkflowTimeline';
import { MetricDetailsDrawer } from './components/MetricDetailsDrawer';
import type { MetricType } from './components/MetricDetailsDrawer';
import { LiveOptimizationTracker } from './components/LiveOptimizationTracker';
import { LiveHealingMemoryView } from './components/LiveHealingMemoryView';
import { TokenOptimizationCenter } from './components/TokenOptimizationCenter';
import { SelfHealingMemoryCenter } from './components/SelfHealingMemoryCenter';
import { AutonomousRecoveryCenter } from './components/AutonomousRecoveryCenter';
import { useDashboardData } from './hooks/useDashboardData';
import { useWorkflowStatus } from './hooks/useWorkflowStatus';
import { useSuiteProgress } from './hooks/useSuiteProgress';
import { useRcaResults } from './hooks/useRcaResults';
import { useHealLog } from './hooks/useHealLog';
import { useTokenOptimization } from './hooks/useTokenOptimization';
import { useOptimizationTracker } from './hooks/useOptimizationTracker';
import type { TokenMetricType } from './types/tokenOptimization';
import { useHealingMemory } from './hooks/useHealingMemory';
import type { SelfHealingMemoryMetricType } from './types/selfHealingMemory';
import { useRecoveryEvents } from './hooks/useRecoveryEvents';
import type { RecoveryMetricType } from './types/recoveryEvents';
import { useDemo } from './hooks/useDemo';
import { DemoModeControlPanel } from './components/DemoModeControlPanel';
import { DemoModeToggleButton } from './components/DemoModeToggleButton';
import { DemoSummaryPanel } from './components/DemoSummaryPanel';

// ─────────────────────────────────────────────────────────────────────────────
// LIVE MODE  — suite-progress.json has running > 0 (npx playwright test active)
// REPORT MODE — all tests done or idle, show full historical dashboard
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const { data, isLoading, error, refetch } = useDashboardData();
  const { workflowStatus } = useWorkflowStatus();
  const suiteProgress = useSuiteProgress();
  const rcaEntries = useRcaResults();
  const healLog = useHealLog();
  const tokenOptimization = useTokenOptimization();
  const optimizationTracker = useOptimizationTracker();
  const healingMemory = useHealingMemory();
  const recoveryEvents = useRecoveryEvents();

  // Demo mode state
  const {
    demoState,
    toggleDemoMode,
    toggleExecutiveMode,
    startDemo,
    stopDemo,
  } = useDemo();

  // Metric details drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

  const handleMetricClick = (metric: MetricType | TokenMetricType | SelfHealingMemoryMetricType | RecoveryMetricType) => {
    setSelectedMetric(metric as MetricType);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    // Keep metric selected briefly to show closing animation
    setTimeout(() => setSelectedMetric(null), 300);
  };

  // Primary LIVE MODE signal: tests running OR Healing/RCA pipeline still transitioning
  const isTestRunning =
    (suiteProgress !== null && suiteProgress.totalTests > 0 && suiteProgress.running > 0) ||
    workflowStatus?.overallStatus === 'RUNNING';

  const workflowStartMs = workflowStatus?.startedAt
    ? new Date(workflowStatus.startedAt).getTime()
    : null;

  const belongsToActiveWorkflow = (timestamp?: string): boolean => {
    if (!isTestRunning || workflowStartMs === null || Number.isNaN(workflowStartMs)) {
      return true;
    }
    if (!timestamp) return false;
    const recordMs = new Date(timestamp).getTime();
    if (Number.isNaN(recordMs)) return false;
    return recordMs >= workflowStartMs - 60000;
  };

  const liveHealLog = isTestRunning
    ? healLog.filter(item => belongsToActiveWorkflow(item.timestamp))
    : healLog;

  const liveRcaEntries = isTestRunning
    ? rcaEntries.filter(item => belongsToActiveWorkflow(item.timestamp))
    : rcaEntries;

  const scopedRecoveryEvents = workflowStatus?.workflowId
    ? recoveryEvents.filter(event => event.workflowId === workflowStatus.workflowId)
    : recoveryEvents;

  const suiteAlignedWithLiveWorkflow = (() => {
    if (!suiteProgress?.startedAt || !workflowStatus?.startedAt || workflowStatus.overallStatus !== 'RUNNING') {
      return false;
    }
    const wfStart = new Date(workflowStatus.startedAt).getTime();
    const suiteStart = new Date(suiteProgress.startedAt).getTime();
    if (Number.isNaN(wfStart) || Number.isNaN(suiteStart)) return false;
    return Math.abs(wfStart - suiteStart) <= 120000;
  })();

  // Detect live → report transition and refetch fresh dashboard data
  const wasLiveRef = useRef(false);
  useEffect(() => {
    if (wasLiveRef.current && !isTestRunning) {
      // Tests just finished — re-fetch dashboard data to get latest results
      refetch();
    }
    wasLiveRef.current = isTestRunning;
  }, [isTestRunning]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-slate-900/60 p-8">
          <p className="text-sm uppercase tracking-[0.16em] text-cyan-300">Loading</p>
          <h1 className="mt-2 text-2xl font-semibold">Agentic QA Platform</h1>
          <p className="mt-4 text-slate-300">Fetching dashboard data…</p>
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-500/30 bg-rose-950/30 p-8">
          <h1 className="text-2xl font-semibold">Agentic QA Platform</h1>
          <p className="mt-3 text-rose-300">Unable to load dashboard data.</p>
          {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
        </div>
      </div>
    );
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // LIVE: real-time counters from suite-progress.json (start at 0, build up).
  // REPORT after plain playwright run (no orchestrator): derive from suiteProgress final state.
  // REPORT with orchestrator data: use data.kpis.
  const hasCompletedRun = suiteProgress !== null && suiteProgress.totalTests > 0 && suiteProgress.running === 0;
  const workflowCompleted = workflowStatus !== null && workflowStatus.overallStatus !== 'RUNNING';

  // Prevent stale mixed-report scenarios by only trusting suite-progress when it
  // belongs to the same run window as workflow-status.
  const suiteAlignedWithWorkflow = (() => {
    if (!hasCompletedRun || !workflowStatus?.startedAt || !suiteProgress?.startedAt) return false;
    const wfStart = new Date(workflowStatus.startedAt).getTime();
    const suiteStart = new Date(suiteProgress.startedAt).getTime();
    if (Number.isNaN(wfStart) || Number.isNaN(suiteStart)) return false;
    return Math.abs(wfStart - suiteStart) <= 120000; // 2 minutes tolerance
  })();

  // Use suite-progress as report source only when there is no workflow status,
  // or when both files clearly belong to the same run.
  const useSuiteForReport = hasCompletedRun && (!workflowCompleted || suiteAlignedWithWorkflow);

  const healingAgentState = workflowStatus?.agents.find(a => a.name === 'Healing')?.state;
  const isHealingRunning = healingAgentState === 'RUNNING';
  const healingActivity =
    healingAgentState === 'RUNNING'
      ? 'Retry Running'
      : healingAgentState === 'SUCCESS'
      ? (liveHealLog.length > 0 ? `Fallback Heals: ${liveHealLog.length}` : 'Retry Complete (No Fallback Heal)')
      : healingAgentState === 'FAILED'
      ? 'Retry Failed'
      : 'Idle';

  const healingAnalyticsRecords = isTestRunning
    ? liveHealLog
    : healLog.length > 0
    ? healLog
    : data.healingAnalytics;
  const rcaSummaryRecords = isTestRunning
    ? liveRcaEntries.map(e => ({
        failureType: e.failureType,
        rootCause: e.rootCause,
        recoveryAction: e.recoveryAction,
        confidence: e.confidence,
      }))
    : rcaEntries.length > 0
    ? rcaEntries.map(e => ({
        failureType: e.failureType,
        rootCause: e.rootCause,
        recoveryAction: e.recoveryAction,
        confidence: e.confidence,
      }))
    : data.rcaSummary;
  const successfulHealsCount = healingAnalyticsRecords.filter(h => !h.recoveryStatus || h.recoveryStatus === 'SUCCESS').length;

  const liveKpis = isTestRunning
    ? {
        ...data.kpis,
        workflowStatus: 'RUNNING' as const,
        testsPassed: suiteAlignedWithLiveWorkflow ? (suiteProgress?.passed ?? 0) : 0,
        testsFailed: suiteAlignedWithLiveWorkflow ? (suiteProgress?.failed ?? 0) : 0,
        healEvents: healingAnalyticsRecords.length,
        healingActivity,
        rcaEvents: rcaSummaryRecords.length,
        successfulHeals: successfulHealsCount,
        // Prefer active workflow start time, fallback to aligned suite start time.
        executionDurationMs: workflowStatus?.overallStatus === 'RUNNING' && workflowStatus?.startedAt
          ? Date.now() - new Date(workflowStatus.startedAt).getTime()
          : suiteAlignedWithLiveWorkflow && suiteProgress?.startedAt
          ? Date.now() - new Date(suiteProgress.startedAt).getTime()
          : undefined,
      }
    : useSuiteForReport
    ? {
        ...data.kpis,
        workflowStatus: (suiteProgress!.failed > 0 ? 'FAILED' : 'SUCCESS') as 'FAILED' | 'SUCCESS',
        testsPassed: suiteProgress!.passed,
        testsFailed: suiteProgress!.failed,
        executionDurationMs: suiteProgress!.durationMs ?? data.kpis.executionDurationMs,
        rcaEvents: rcaSummaryRecords.length,
        healEvents: healingAnalyticsRecords.length,
        healingActivity,
        successfulHeals: successfulHealsCount,
      }
    : data.kpis;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_5%,rgba(34,211,238,0.20),transparent_24%),radial-gradient(circle_at_92%_0%,rgba(34,197,94,0.20),transparent_28%),linear-gradient(150deg,#020617,#0b1228,#0f172a)] px-4 py-6 text-slate-100 md:px-8 md:py-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-[0_20px_40px_rgba(2,10,26,0.40)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Agentic QA Platform</h1>
              <p className="mt-2 text-sm text-slate-300">
                {isTestRunning
                  ? 'Live monitoring console — test suite is executing.'
                  : 'Production-ready observability view for the autonomous QA pipeline.'}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {isTestRunning && workflowStatus?.overallStatus === 'RUNNING' && workflowStatus?.startedAt
                  ? `Started: ${new Date(workflowStatus.startedAt).toLocaleString()}`
                  : isTestRunning && suiteAlignedWithLiveWorkflow && suiteProgress?.startedAt
                  ? `Started: ${new Date(suiteProgress.startedAt).toLocaleString()}`
                  : useSuiteForReport && suiteProgress?.updatedAt
                  ? `Completed: ${new Date(suiteProgress.updatedAt).toLocaleString()}`
                  : workflowCompleted && workflowStatus?.completedAt
                  ? `Completed: ${new Date(workflowStatus.completedAt).toLocaleString()}`
                  : `Generated: ${new Date(data.generatedAt).toLocaleString()}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DemoModeToggleButton
                isEnabled={demoState.enabled}
                isRunning={demoState.isRunning}
                onClick={toggleDemoMode}
              />
              {isTestRunning && (
                <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Live Workflow Timeline (always show current order during live execution) */}
        {isTestRunning && workflowStatus?.agents && (
          <WorkflowTimeline steps={['Requirement', ...workflowStatus.agents.map(a => a.name)]} />
        )}

        {/* ════════════════════════════════════════════════════════════════
            LIVE MODE — npx playwright test is actively running
            ════════════════════════════════════════════════════════════════ */}
        {isTestRunning ? (
          <>
            <LiveOptimizationTracker data={optimizationTracker} />

            {/* ── Live Agent Pipeline ─────────────────────────────────────
                MOVED TO TOP — If the orchestrator is running, use its live workflow-status.json.
                Otherwise, synthesise a WorkflowStatus from suite-progress data
                so the pipeline panel is ALWAYS visible during any test run.
            ──────────────────────────────────────────────────────────────── */}
            {(() => {
              const prog = suiteProgress;
              const executionDone = prog !== null && prog.running === 0 && prog.totalTests > 0;
              const execState = executionDone
                ? (prog!.failed > 0 ? 'FAILED' : 'SUCCESS')
                : 'RUNNING';
              const healState = liveHealLog.length > 0 ? 'SUCCESS' : 'PENDING';
              const rcaState  = liveRcaEntries.length > 0
                ? 'SUCCESS'
                : (prog?.failed ?? 0) > 0 ? 'RUNNING' : 'PENDING';

              // Determine which agent is currently the active one
              const currentAgent =
                execState === 'RUNNING' ? 'Execution' :
                rcaState  === 'RUNNING' ? 'RCA'       : null;

              // Use real orchestrator data when available, else build synthetic status
              const liveStatus: WorkflowStatusType = workflowStatus?.overallStatus === 'RUNNING'
                ? {
                    ...workflowStatus,
                    agents: workflowStatus.agents.map(agent => {
                      if (
                        agent.name === 'RCA' &&
                        agent.state === 'FAILED' &&
                        workflowStatus.agents.some(a => a.name === 'Healing' && a.state === 'RUNNING')
                      ) {
                        return { ...agent, state: 'RUNNING' as const };
                      }
                      return agent;
                    }),
                  }
                : {
                    workflowId:    `run-${prog?.startedAt ? new Date(prog.startedAt).getTime() : Date.now()}`,
                    startedAt:     prog?.startedAt ?? new Date().toISOString(),
                    overallStatus: 'RUNNING',
                    currentAgent:  currentAgent as WorkflowStatusType['currentAgent'],
                    requirement: data.requirement ?? data.title,
                    generatedTestName: data.generatedTestName ?? (prog?.currentTest ?? 'Pending generator output'),
                    currentStep: currentAgent ? `${currentAgent} in progress` : 'Waiting for next action',
                    agents: [
                      { name: 'Planner',   state: 'SUCCESS', durationMs: data.agents.find(a => a.name === 'Planner')?.durationMs ?? 0 },
                      { name: 'Designer',  state: 'SUCCESS', durationMs: data.agents.find(a => a.name === 'Designer')?.durationMs ?? 0 },
                      { name: 'Generator', state: 'SUCCESS', durationMs: data.agents.find(a => a.name === 'Generator')?.durationMs ?? 0 },
                      { name: 'Execution', state: execState, durationMs: prog?.durationMs ?? undefined },
                      { name: 'RCA',       state: rcaState,  durationMs: liveRcaEntries.length > 0 ? liveRcaEntries.length : undefined },
                      { name: 'Healing',   state: healState, durationMs: liveHealLog.length > 0 ? liveHealLog.length : undefined },
                    ],
                  };

              return <LiveWorkflowPanel status={liveStatus} />;
            })()}

            {/* Live suite counters + progress bar */}
            <SuiteProgressPanel />

            {/* Currently executing test */}
            <CurrentTestPanel />

            {isHealingRunning && healingMemory?.currentSession ? (
              <LiveHealingMemoryView session={healingMemory.currentSession} />
            ) : null}

            {/* Live KPI counters — built from zero as tests complete */}
            <KpiCards kpis={liveKpis} onMetricClick={handleMetricClick} />

            {/* Live RCA for failed tests (appears as failures accumulate) */}
            {liveRcaEntries.length > 0 ? <LiveRcaPanel /> : null}

            {/* Live healing events (appears when healer fires a fallback) */}
            {healingAnalyticsRecords.length > 0 && (
              <HealingAnalyticsPanel records={healingAnalyticsRecords} />
            )}

            {/* RCA summary fallback when live rows are not yet present */}
            {liveRcaEntries.length === 0 && rcaSummaryRecords.length > 0 && (
              <RcaSummaryPanel records={rcaSummaryRecords} />
            )}
          </>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             REPORT MODE — run complete or idle, show full results
             ════════════════════════════════════════════════════════════════ */
          <>
            {/* Final KPIs — from this run if available, else from historical data */}
            <KpiCards kpis={liveKpis} onMetricClick={handleMetricClick} />

            {/* Workflow Summary — override kpis with live/completed run data */}
            <WorkflowSummaryCard data={{ ...data, kpis: liveKpis }} />

            {/* Execution Trend + Event Distribution — override with real run data when available */}
            <WorkflowTimeline steps={
              // Derive timeline from actual agent order, or use workflow-status if available
              workflowStatus?.agents
                ? ['Requirement', ...workflowStatus.agents.map(a => a.name)]
                : useSuiteForReport && data.agents
                ? ['Requirement', ...data.agents.map(a => a.name)]
                : ['Requirement', 'Planner', 'Designer', 'Generator', 'Execution', 'RCA', 'Healing']
            } />

            {/* ── Token Optimization Center ──────────────────────────────── */}
            <TokenOptimizationCenter
              data={tokenOptimization}
              onMetricClick={handleMetricClick}
            />

            <SelfHealingMemoryCenter
              data={healingMemory}
              onMetricClick={handleMetricClick}
            />

            <AutonomousRecoveryCenter
              events={scopedRecoveryEvents}
              healingRunning={isHealingRunning}
              onMetricClick={handleMetricClick}
            />

            <VisualizationPanel data={useSuiteForReport ? {
              ...data.visualizations,
              testTrend: [
                ...(data.visualizations.testTrend ?? []),
                {
                  run: `Run ${new Date(suiteProgress!.updatedAt ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                  passed: suiteProgress!.passed,
                  failed: suiteProgress!.failed,
                },
              ],
              eventDistribution: [
                { name: 'Failed', value: suiteProgress!.failed },
                { name: 'Heal', value: healLog.length },
                { name: 'RCA', value: rcaEntries.length },
              ],
            } : data.visualizations} />

            {/* Healing Analytics + Agent Status */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AgentStatusSection agents={
                // Prefer workflow-status.json agents (written by both reporter and orchestrator)
                // since they carry the most accurate final states including RCA
                workflowStatus?.agents && workflowStatus.agents.length > 0
                  ? workflowStatus.agents.map(a => ({
                      name: a.name,
                      status: (a.state === 'SUCCESS' ? 'SUCCESS' : a.state === 'FAILED' ? 'FAILED' : a.state === 'RUNNING' ? 'RUNNING' : 'PENDING') as AgentRecord['status'],
                      durationMs: a.durationMs ?? 0,
                    }))
                  : hasCompletedRun ? [
                      { name: 'Planner',   status: 'SUCCESS' as AgentRecord['status'], durationMs: 0 },
                      { name: 'Designer',  status: 'SUCCESS' as AgentRecord['status'], durationMs: 0 },
                      { name: 'Generator', status: 'SUCCESS' as AgentRecord['status'], durationMs: 0 },
                      { name: 'Execution', status: (suiteProgress!.failed > 0 ? 'FAILED' : 'SUCCESS') as AgentRecord['status'], durationMs: suiteProgress!.durationMs ?? 0 },
                      { name: 'Healing',   status: 'SUCCESS' as AgentRecord['status'], durationMs: 1 },
                      { name: 'RCA',       status: 'SUCCESS' as AgentRecord['status'], durationMs: 1 },
                    ]
                  : data.agents
              } />
              <HealingAnalyticsPanel records={healingAnalyticsRecords} />
            </section>

            {/* RCA Summary — prefer live rca-results.json when available */}
            <RcaSummaryPanel records={rcaSummaryRecords} />
          </>
        )}

      </main>

      {/* Metric Details Drawer */}
      <MetricDetailsDrawer
        isOpen={drawerOpen}
        metricType={selectedMetric}
        dashboardData={data}
        workflowStatus={workflowStatus}
        healingAnalyticsRecords={healingAnalyticsRecords}
        rcaSummaryRecords={rcaSummaryRecords}
        testsPassed={liveKpis.testsPassed}
        testsFailed={liveKpis.testsFailed}
        healEvents={liveKpis.healEvents}
        successfulHeals={liveKpis.successfulHeals ?? liveKpis.healEvents}
        executionDurationMs={liveKpis.executionDurationMs}
        tokenStats={tokenOptimization.tokenStats}
        cacheStats={tokenOptimization.cacheStats}
        templateStats={tokenOptimization.templateStats}
        costStats={tokenOptimization.costStats}
        healingMemoryData={healingMemory}
        recoveryEvents={scopedRecoveryEvents}
        onClose={handleDrawerClose}
      />

      {/* Demo Mode Control Panel */}
      {demoState.enabled && !demoState.executiveMode && (
        <DemoModeControlPanel
          demoState={demoState}
          onToggle={toggleDemoMode}
          onToggleExecutiveMode={toggleExecutiveMode}
          onStart={startDemo}
          onStop={stopDemo}
        />
      )}

      {/* Executive Mode Fullscreen */}
      {demoState.executiveMode && (
        <DemoModeControlPanel
          demoState={demoState}
          onToggle={toggleDemoMode}
          onToggleExecutiveMode={toggleExecutiveMode}
          onStart={startDemo}
          onStop={stopDemo}
        />
      )}

      {/* Demo Summary Panel */}
      {demoState.summary && !demoState.isRunning && (
        <DemoSummaryPanel
          summary={demoState.summary}
          isVisible={!demoState.isRunning && demoState.enabled}
        />
      )}
    </div>
  );
}

export default App;
