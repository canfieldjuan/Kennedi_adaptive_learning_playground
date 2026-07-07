import type {
  ParentActivityBriefDecision,
  ParentActivityBriefDecisionType,
} from '../types/activity-briefs';

export type ActivityBriefDesignQueueStatus =
  | 'approved'
  | 'held'
  | 'archived';

export interface ActivityBriefDesignQueueItem {
  queue_id: string;
  decision_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  brief_id: string;
  status: ActivityBriefDesignQueueStatus;
  decision_type: ParentActivityBriefDecisionType;
  required_context_type: ParentActivityBriefDecision['required_context_type'];
  required_strength: ParentActivityBriefDecision['required_strength'];
  suggested_game_family: ParentActivityBriefDecision['suggested_game_family'];
  suggested_activity_pattern: string;
  reason: string;
  status_at_decision: ParentActivityBriefDecision['status_at_decision'];
  decided_at: string;
}

export interface ActivityBriefDesignQueue {
  approved: ActivityBriefDesignQueueItem[];
  held: ActivityBriefDesignQueueItem[];
  archived: ActivityBriefDesignQueueItem[];
  total_count: number;
}

export function buildActivityBriefDesignQueue(
  decisions: ParentActivityBriefDecision[]
): ActivityBriefDesignQueue {
  const latestByBrief = new Map<string, ParentActivityBriefDecision>();

  for (const decision of decisions) {
    const queueId = createQueueId(decision);
    const previous = latestByBrief.get(queueId);
    if (!previous || compareDecisions(decision, previous) > 0) {
      latestByBrief.set(queueId, decision);
    }
  }

  const queue: ActivityBriefDesignQueue = {
    approved: [],
    held: [],
    archived: [],
    total_count: latestByBrief.size,
  };

  for (const decision of latestByBrief.values()) {
    const item = createQueueItem(decision);
    if (item.status === 'approved') queue.approved.push(item);
    if (item.status === 'held') queue.held.push(item);
    if (item.status === 'archived') queue.archived.push(item);
  }

  queue.approved.sort(compareQueueItems);
  queue.held.sort(compareQueueItems);
  queue.archived.sort(compareQueueItems);

  return queue;
}

function createQueueItem(
  decision: ParentActivityBriefDecision
): ActivityBriefDesignQueueItem {
  return {
    queue_id: createQueueId(decision),
    decision_id: decision.decision_id,
    session_id: decision.session_id,
    child_id: decision.child_id,
    skill_id: decision.skill_id,
    skill_label: decision.skill_label,
    brief_id: decision.brief_id,
    status: getQueueStatus(decision.decision_type),
    decision_type: decision.decision_type,
    required_context_type: decision.required_context_type,
    required_strength: decision.required_strength,
    suggested_game_family: decision.suggested_game_family,
    suggested_activity_pattern: decision.suggested_activity_pattern,
    reason: decision.reason,
    status_at_decision: decision.status_at_decision,
    decided_at: decision.created_at,
  };
}

function createQueueId(decision: ParentActivityBriefDecision): string {
  return `${decision.skill_id}::${decision.brief_id}`;
}

function getQueueStatus(
  decisionType: ParentActivityBriefDecisionType
): ActivityBriefDesignQueueStatus {
  if (decisionType === 'approve_brief') return 'approved';
  if (decisionType === 'hold_brief') return 'held';
  return 'archived';
}

function compareDecisions(
  a: ParentActivityBriefDecision,
  b: ParentActivityBriefDecision
): number {
  return (
    a.created_at.localeCompare(b.created_at) ||
    a.decision_id.localeCompare(b.decision_id)
  );
}

function compareQueueItems(
  a: ActivityBriefDesignQueueItem,
  b: ActivityBriefDesignQueueItem
): number {
  return (
    b.decided_at.localeCompare(a.decided_at) ||
    a.skill_label.localeCompare(b.skill_label) ||
    a.suggested_activity_pattern.localeCompare(b.suggested_activity_pattern)
  );
}
