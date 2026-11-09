import type { Lang } from './i18n';
import type { Rec, Settings } from './store';
import { findings, goalInfo, habitStats, scores, taskStats, type Finding } from './analytics';

export type IntelligenceData = {
  goals: Rec[];
  tasks: Rec[];
  habits: Rec[];
  habitLogs: Rec[];
  transactions: Rec[];
};

export type IntelligenceOverview = {
  generatedAt: string;
  score: number | null;
  scoreCoverage: number;
  scoreDimensions: ReturnType<typeof scores>['parts'];
  completionRate: number | null;
  overdueTaskCount: number;
  atRiskGoalCount: number;
  habitAdherence: number | null;
  findings: Finding[];
  highPriorityFindings: number;
};

/**
 * Builds a deterministic, explainable overview using only locally available data.
 * Missing history remains null instead of being treated as zero performance.
 */
export function buildIntelligenceOverview(
  data: IntelligenceData,
  settings: Settings,
  language: Lang,
): IntelligenceOverview {
  const scoreResult = scores(data, settings);
  const taskResult = taskStats(data.tasks);
  const activeGoals = data.goals.filter((goal) => !goal.completed);
  const atRiskGoalCount = activeGoals.filter((goal) => {
    const status = goalInfo(goal).status;
    return status === 'At Risk' || status === 'Delayed';
  }).length;

  const activeHabits = data.habits.filter((habit) => !habit.archived);
  const habitResults = activeHabits
    .map((habit) => habitStats(habit, data.habitLogs))
    .filter((result) => result.hasHistory);
  const habitAdherence = habitResults.length
    ? habitResults.reduce((total, result) => total + result.rate30, 0) / habitResults.length
    : null;

  const orderedFindings = findings(data, settings, language).sort((a, b) => {
    const severity = { high: 0, medium: 1, low: 2 } as const;
    return severity[a.severity] - severity[b.severity];
  });

  return {
    generatedAt: new Date().toISOString(),
    score: scoreResult.overall,
    scoreCoverage: scoreResult.coverage,
    scoreDimensions: scoreResult.parts,
    completionRate: taskResult.completionRate,
    overdueTaskCount: taskResult.overdue.length,
    atRiskGoalCount,
    habitAdherence,
    findings: orderedFindings,
    highPriorityFindings: orderedFindings.filter((item) => item.severity === 'high').length,
  };
}
