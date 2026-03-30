import { db } from "@/lib/db";

export type HireUsPackageSlug = "starter" | "complete";
export type HireUsLeadState = "started" | "working" | "completed";

export type HireUsChecklistItem = {
  id: string;
  label: string;
  stepKey: string | null;
  stepLabel: string | null;
  completed: boolean;
  completedAt: string | null;
};

export type HireUsTimelineEventType = "state_change" | "checklist_update" | "admin_update" | "system";

export type HireUsTimelineEvent = {
  id: string;
  type: HireUsTimelineEventType;
  text: string;
  at: string;
  by: string;
};

export type HireUsCurationListItem = {
  id: string;
  label: string;
  sectionLabel: string;
};

export type HireUsPackageDefinition = {
  slug: HireUsPackageSlug;
  title: string;
  priceCents: number;
  mappedPlanSlug: "starter" | "pro";
};

export const HIRE_US_PACKAGES: Record<HireUsPackageSlug, HireUsPackageDefinition> = {
  starter: {
    slug: "starter",
    title: "Hire Us Starter",
    priceCents: 39900,
    mappedPlanSlug: "starter",
  },
  complete: {
    slug: "complete",
    title: "Hire Us Complete",
    priceCents: 99900,
    mappedPlanSlug: "pro",
  },
};

export function parseHireUsPackageSlug(value: unknown): HireUsPackageSlug | null {
  if (value === "starter" || value === "complete") return value;
  return null;
}

export async function resolveHireUsCheckoutPlanId(packageSlug: HireUsPackageSlug): Promise<string | null> {
  const pkg = HIRE_US_PACKAGES[packageSlug];
  const plan = await db.planConfig.findFirst({
    where: { slug: pkg.mappedPlanSlug, isActive: true },
    select: { id: true },
  });
  return plan?.id ?? null;
}

function getServiceType(packageSlug: HireUsPackageSlug): string {
  return `hire_us_${packageSlug}`;
}

export function packageSlugFromServiceType(serviceType: string | null | undefined): HireUsPackageSlug | null {
  if (serviceType === "hire_us_starter") return "starter";
  if (serviceType === "hire_us_complete") return "complete";
  return null;
}

export type HireUsLeadNotes = {
  flow: "hire_us";
  packageSlug: HireUsPackageSlug;
  curationId: string | null;
  activities: string[];
  state: HireUsLeadState;
  checklist: HireUsChecklistItem[];
  timeline: HireUsTimelineEvent[];
  lastAdminUpdateAt: string | null;
  lastAdminUpdateBy: string | null;
};

export function buildDefaultHireUsChecklist(packageSlug: HireUsPackageSlug): HireUsChecklistItem[] {
  const common: HireUsChecklistItem[] = [
    {
      id: "curation_review",
      label: "Review curation and priorities",
      stepKey: null,
      stepLabel: null,
      completed: false,
      completedAt: null,
    },
    {
      id: "execution_started",
      label: "Start submissions and outreach",
      stepKey: null,
      stepLabel: null,
      completed: false,
      completedAt: null,
    },
    {
      id: "delivery_report",
      label: "Share delivery report",
      stepKey: null,
      stepLabel: null,
      completed: false,
      completedAt: null,
    },
  ];

  if (packageSlug === "complete") {
    common.splice(2, 0, {
      id: "guest_post_execution",
      label: "Execute guest post placements",
      stepKey: null,
      stepLabel: null,
      completed: false,
      completedAt: null,
    });
  }

  return common;
}

type CurationSectionKey = "a" | "b" | "c" | "d" | "e" | "f";

const curationSectionOrder: CurationSectionKey[] = ["a", "b", "c", "d", "e", "f"];

const curationSectionStepLabels: Record<CurationSectionKey, string> = {
  a: "Distribution list",
  b: "Guest post & backlinks",
  c: "Press release sites",
  d: "Social influencers",
  e: "Reddit communities",
  f: "Investors & funds",
};

type CurationResultForChecklist = {
  id: string;
  section: CurationSectionKey;
  website: { id: string; name: string } | null;
  influencer: { id: string; name: string } | null;
  redditChannel: { id: string; name: string } | null;
  fund: { id: string; name: string } | null;
};

function findCurationIdsFromRawNotes(notes: string | null): string[] {
  if (!notes) return [];

  try {
    const parsed = JSON.parse(notes) as {
      curationId?: unknown;
      activities?: unknown;
    };

    const ids = new Set<string>();

    if (typeof parsed.curationId === "string" && parsed.curationId.trim().length > 0) {
      ids.add(parsed.curationId.trim());
    }

    if (Array.isArray(parsed.activities)) {
      for (const activity of parsed.activities) {
        if (typeof activity !== "string") continue;

        const directMarker = activity.match(/curation:([a-zA-Z0-9_-]+)/i);
        if (directMarker?.[1]) {
          ids.add(directMarker[1]);
        }

        const onboardingMatch = activity.match(/Onboarding curation submitted\s*\(([a-zA-Z0-9_-]+)\)/i);
        if (onboardingMatch?.[1]) {
          ids.add(onboardingMatch[1]);
        }
      }
    }

    return [...ids];
  } catch {
    return [];
  }
}

function findCurationIdsFromMessage(message: string | null): string[] {
  if (!message) return [];

  const ids = new Set<string>();

  const markerMatches = message.matchAll(/curation:([a-zA-Z0-9_-]+)/gi);
  for (const match of markerMatches) {
    if (match[1]) ids.add(match[1]);
  }

  const onboardingMatches = message.matchAll(/Onboarding curation submitted\s*\(([a-zA-Z0-9_-]+)\)/gi);
  for (const match of onboardingMatches) {
    if (match[1]) ids.add(match[1]);
  }

  return [...ids];
}

function collectCandidateCurationIds(args: {
  knownCurationId: string | null;
  notesRaw: string | null;
  message: string | null;
}): Set<string> {
  const candidateIds = new Set<string>();
  if (args.knownCurationId) {
    candidateIds.add(args.knownCurationId);
  }
  for (const id of findCurationIdsFromRawNotes(args.notesRaw)) {
    candidateIds.add(id);
  }
  for (const id of findCurationIdsFromMessage(args.message)) {
    candidateIds.add(id);
  }
  return candidateIds;
}

function buildCurationChecklistTask(result: CurationResultForChecklist): HireUsChecklistItem {
  let resourceKey = `result:${result.id}`;
  let label = `${curationSectionStepLabels[result.section]} item ${result.id.slice(-6)}`;

  if ((result.section === "a" || result.section === "b" || result.section === "c") && result.website) {
    resourceKey = `website:${result.website.id}`;
    label = result.website.name;
  } else if (result.section === "d" && result.influencer) {
    resourceKey = `influencer:${result.influencer.id}`;
    label = result.influencer.name;
  } else if (result.section === "e" && result.redditChannel) {
    resourceKey = `reddit:${result.redditChannel.id}`;
    label = result.redditChannel.name;
  } else if (result.section === "f" && result.fund) {
    resourceKey = `fund:${result.fund.id}`;
    label = result.fund.name;
  }

  return {
    id: `curation:${result.section}:${resourceKey}`,
    label,
    stepKey: result.section,
    stepLabel: curationSectionStepLabels[result.section],
    completed: false,
    completedAt: null,
  };
}

// IDs of the generic built-in placeholder items — these should never appear alongside curation-derived tasks
const BUILT_IN_DEFAULT_IDS = new Set([
  "curation_review",
  "execution_started",
  "delivery_report",
  "guest_post_execution",
]);

function buildChecklistFromCuration(
  results: CurationResultForChecklist[],
  existingChecklist: HireUsChecklistItem[]
): HireUsChecklistItem[] {
  const existingById = new Map(existingChecklist.map((item) => [item.id, item]));
  const canonicalIds = new Set<string>();

  const normalized = results
    .slice()
    .sort((a, b) => {
      const sectionDelta = curationSectionOrder.indexOf(a.section) - curationSectionOrder.indexOf(b.section);
      if (sectionDelta !== 0) return sectionDelta;
      return a.id.localeCompare(b.id);
    })
    .map((result) => {
      const task = buildCurationChecklistTask(result);
      canonicalIds.add(task.id);
      const existing = existingById.get(task.id);
      return {
        ...task,
        label: existing?.label ?? task.label,
        stepKey: existing?.stepKey ?? task.stepKey,
        stepLabel: existing?.stepLabel ?? task.stepLabel,
        completed: existing?.completed ?? false,
        completedAt: existing?.completedAt ?? null,
      };
    });

  // Exclude built-in placeholder defaults — they're only relevant when there are no curation tasks
  const legacyExtras = existingChecklist.filter(
    (item) => !canonicalIds.has(item.id) && !BUILT_IN_DEFAULT_IDS.has(item.id)
  );
  return [...normalized, ...legacyExtras];
}

export async function resolveHireUsChecklistFromCuration(args: {
  userId: string | null | undefined;
  email?: string | null;
  knownCurationId: string | null;
  notesRaw: string | null;
  message: string | null;
  existingChecklist: HireUsChecklistItem[];
}): Promise<{ linkedCurationId: string | null; checklist: HireUsChecklistItem[] }> {
  // Resolve userId — when the lead has no linked userId, try to recover via email
  let userId = args.userId ?? null;
  if (!userId && args.email) {
    const user = await db.user.findUnique({
      where: { email: args.email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) {
    return {
      linkedCurationId: args.knownCurationId,
      checklist: args.existingChecklist,
    };
  }

  const candidateIds = collectCandidateCurationIds({
    knownCurationId: args.knownCurationId,
    notesRaw: args.notesRaw,
    message: args.message,
  });

  type CurationRecord = { id: string; results: CurationResultForChecklist[] };
  let curation: CurationRecord | null = null;
  for (const candidateId of candidateIds) {
    curation = await db.curation.findFirst({
      where: {
        id: candidateId,
        userId,
      },
      include: {
        results: {
          select: {
            id: true,
            section: true,
            website: { select: { id: true, name: true } },
            influencer: { select: { id: true, name: true } },
            redditChannel: { select: { id: true, name: true } },
            fund: { select: { id: true, name: true } },
          },
        },
      },
    }) as CurationRecord | null;

    if (curation && curation.results.length > 0) {
      break;
    }
  }

  if (!curation || curation.results.length === 0) {
    curation = await db.curation.findFirst({
      where: {
        userId,
        results: { some: {} },
      },
      orderBy: { createdAt: "desc" },
      include: {
        results: {
          select: {
            id: true,
            section: true,
            website: { select: { id: true, name: true } },
            influencer: { select: { id: true, name: true } },
            redditChannel: { select: { id: true, name: true } },
            fund: { select: { id: true, name: true } },
          },
        },
      },
    }) as CurationRecord | null;
  }

  if (!curation || curation.results.length === 0) {
    return {
      linkedCurationId: null,
      checklist: args.existingChecklist,
    };
  }

  return {
    linkedCurationId: curation.id,
    checklist: buildChecklistFromCuration(
      curation.results as CurationResultForChecklist[],
      args.existingChecklist
    ),
  };
}

export async function resolveHireUsCurationList(args: {
  userId: string | null | undefined;
  email?: string | null;
  linkedCurationId: string | null;
}): Promise<HireUsCurationListItem[]> {
  let userId = args.userId ?? null;
  if (!userId && args.email) {
    const user = await db.user.findUnique({
      where: { email: args.email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) return [];

  const curation = await db.curation.findFirst({
    where: {
      userId,
      ...(args.linkedCurationId ? { id: args.linkedCurationId } : {}),
      results: { some: {} },
    },
    orderBy: args.linkedCurationId ? undefined : { createdAt: "desc" },
    include: {
      results: {
        orderBy: [{ section: "asc" }, { id: "asc" }],
        select: {
          id: true,
          section: true,
          website: { select: { name: true } },
          influencer: { select: { name: true } },
          redditChannel: { select: { name: true } },
          fund: { select: { name: true } },
        },
      },
    },
  });

  if (!curation) return [];

  return curation.results.map((result) => {
    const section = result.section as CurationSectionKey;
    const label =
      result.website?.name ??
      result.influencer?.name ??
      result.redditChannel?.name ??
      result.fund?.name ??
      `${curationSectionStepLabels[section]} item`;

    return {
      id: result.id,
      label,
      sectionLabel: curationSectionStepLabels[section],
    };
  });
}

export async function resolveHireUsChecklistsFromCurationBatch(args: {
  userId: string;
  leads: Array<{
    knownCurationId: string | null;
    notesRaw: string | null;
    message: string | null;
    existingChecklist: HireUsChecklistItem[];
  }>;
}): Promise<Array<{ linkedCurationId: string | null; checklist: HireUsChecklistItem[] }>> {
  if (args.leads.length === 0) return [];

  const curations = await db.curation.findMany({
    where: { userId: args.userId, results: { some: {} } },
    orderBy: { createdAt: "desc" },
    include: {
      results: {
        select: {
          id: true,
          section: true,
          website: { select: { id: true, name: true } },
          influencer: { select: { id: true, name: true } },
          redditChannel: { select: { id: true, name: true } },
          fund: { select: { id: true, name: true } },
        },
      },
    },
  });

  const curationsById = new Map(curations.map((curation) => [curation.id, curation]));
  const latestCuration = curations[0] ?? null;

  return args.leads.map((lead) => {
    const candidateIds = collectCandidateCurationIds({
      knownCurationId: lead.knownCurationId,
      notesRaw: lead.notesRaw,
      message: lead.message,
    });

    let matchedCuration: (typeof curations)[number] | null = null;
    for (const candidateId of candidateIds) {
      const candidate = curationsById.get(candidateId);
      if (candidate && candidate.results.length > 0) {
        matchedCuration = candidate;
        break;
      }
    }

    const resolvedCuration = matchedCuration ?? latestCuration;
    if (!resolvedCuration || resolvedCuration.results.length === 0) {
      return {
        linkedCurationId: null,
        checklist: lead.existingChecklist,
      };
    }

    return {
      linkedCurationId: resolvedCuration.id,
      checklist: buildChecklistFromCuration(
        resolvedCuration.results as CurationResultForChecklist[],
        lead.existingChecklist
      ),
    };
  });
}

export function createHireUsTimelineEvent(
  type: HireUsTimelineEventType,
  text: string,
  by: string,
  at = new Date().toISOString()
): HireUsTimelineEvent {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    text,
    at,
    by,
  };
}

function sanitizeChecklistItem(
  item: unknown,
  fallback: HireUsChecklistItem
): HireUsChecklistItem {
  if (!item || typeof item !== "object") return fallback;
  const candidate = item as Partial<HireUsChecklistItem>;
  return {
    id: typeof candidate.id === "string" ? candidate.id : fallback.id,
    label: typeof candidate.label === "string" ? candidate.label : fallback.label,
    stepKey: typeof candidate.stepKey === "string" ? candidate.stepKey : null,
    stepLabel: typeof candidate.stepLabel === "string" ? candidate.stepLabel : null,
    completed: Boolean(candidate.completed),
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : null,
  };
}

function buildNormalizedChecklist(
  parsedChecklist: unknown,
  defaults: HireUsChecklistItem[]
): HireUsChecklistItem[] {
  const source = Array.isArray(parsedChecklist) ? parsedChecklist : [];
  const defaultChecklistById = new Map(defaults.map((item) => [item.id, item]));

  const normalizedDefaults = defaults.map((defaultItem) => {
    const candidate = source.find((item) => {
      if (!item || typeof item !== "object") return false;
      return (item as Partial<HireUsChecklistItem>).id === defaultItem.id;
    });
    return sanitizeChecklistItem(candidate, defaultItem);
  });

  const extras = source
    .filter((item): item is HireUsChecklistItem => {
      if (!item || typeof item !== "object") return false;
      const id = (item as Partial<HireUsChecklistItem>).id;
      return typeof id === "string" && !defaultChecklistById.has(id);
    })
    .map((item) =>
      sanitizeChecklistItem(item, {
        id: item.id,
        label: item.label,
        stepKey: item.stepKey ?? null,
        stepLabel: item.stepLabel ?? null,
        completed: Boolean(item.completed),
        completedAt: item.completedAt ?? null,
      })
    );

  return [...normalizedDefaults, ...extras];
}

function isValidTimelineEvent(event: unknown): event is HireUsTimelineEvent {
  if (!event || typeof event !== "object") return false;
  const candidate = event as Partial<HireUsTimelineEvent>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.text === "string" &&
    typeof candidate.at === "string" &&
    typeof candidate.by === "string" &&
    (candidate.type === "state_change" ||
      candidate.type === "checklist_update" ||
      candidate.type === "admin_update" ||
      candidate.type === "system")
  );
}

function buildNormalizedTimeline(parsedTimeline: unknown): HireUsTimelineEvent[] {
  if (!Array.isArray(parsedTimeline)) return [];
  return parsedTimeline.filter(isValidTimelineEvent).slice(-50);
}

export function parseHireUsLeadNotes(raw: string | null, packageSlug: HireUsPackageSlug): HireUsLeadNotes {
  const defaults: HireUsLeadNotes = {
    flow: "hire_us",
    packageSlug,
    curationId: null,
    activities: [],
    state: "started",
    checklist: buildDefaultHireUsChecklist(packageSlug),
    timeline: [],
    lastAdminUpdateAt: null,
    lastAdminUpdateBy: null,
  };

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HireUsLeadNotes>;
    const checklist = buildNormalizedChecklist(parsed.checklist, defaults.checklist);
    const timeline = buildNormalizedTimeline(parsed.timeline);

    return {
      flow: "hire_us",
      packageSlug,
      curationId: typeof parsed.curationId === "string" ? parsed.curationId : null,
      activities: Array.isArray(parsed.activities)
        ? parsed.activities.filter((item): item is string => typeof item === "string")
        : [],
      state:
        parsed.state === "started" || parsed.state === "working" || parsed.state === "completed"
          ? parsed.state
          : "started",
      checklist,
      timeline,
      lastAdminUpdateAt:
        typeof parsed.lastAdminUpdateAt === "string" ? parsed.lastAdminUpdateAt : null,
      lastAdminUpdateBy:
        typeof parsed.lastAdminUpdateBy === "string" ? parsed.lastAdminUpdateBy : null,
    };
  } catch {
    return defaults;
  }
}

export function serializeHireUsLeadNotes(notes: HireUsLeadNotes): string {
  return JSON.stringify(notes);
}

export async function finalizeHireUsPurchase(args: {
  userId: string;
  packageSlug: HireUsPackageSlug;
}): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: args.userId },
    select: { id: true, name: true, email: true, creditsRemaining: true },
  });
  if (!user) return;

  const serviceType = getServiceType(args.packageSlug);
  const existingLead = await db.serviceLead.findFirst({
    where: { userId: user.id, serviceType },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (existingLead) {
    const ageMs = Date.now() - existingLead.createdAt.getTime();
    if (ageMs < 30 * 60 * 1000) {
      return;
    }
  }

  await db.$transaction(async (tx) => {
    await tx.serviceLead.create({
      data: {
        userId: user.id,
        name: user.name?.trim() || user.email,
        email: user.email,
        serviceType,
        message: `Hire Us ${args.packageSlug} purchased. PublishRoad team will take over execution and share updates here.`,
        notes: JSON.stringify({
          flow: "hire_us",
          packageSlug: args.packageSlug,
          curationId: null,
          activities: ["Purchase completed", "Waiting for onboarding curation submission"],
          state: "started",
          checklist: buildDefaultHireUsChecklist(args.packageSlug),
          timeline: [
            createHireUsTimelineEvent(
              "system",
              "Hire Us purchase completed.",
              "system"
            ),
          ],
          lastAdminUpdateAt: null,
          lastAdminUpdateBy: null,
        } satisfies HireUsLeadNotes),
        status: "new",
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { creditsRemaining: (user.creditsRemaining ?? 0) + 1 },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "payment_success",
        title: "Hire Us activated",
        message: "Your Hire Us request is active. We added 1 bonus curation credit to complete onboarding.",
      },
    });
  });
}

export async function attachHireUsCuration(args: {
  userId: string;
  curationId: string;
  packageSlug: HireUsPackageSlug;
}): Promise<void> {
  const serviceType = getServiceType(args.packageSlug);

  const lead = await db.serviceLead.findFirst({
    where: { userId: args.userId, serviceType },
    orderBy: { createdAt: "desc" },
    select: { id: true, message: true, notes: true },
  });

  if (!lead) return;

  const parsedNotes = parseHireUsLeadNotes(lead.notes, args.packageSlug);
  if (parsedNotes.curationId === args.curationId) return;

  parsedNotes.curationId = args.curationId;
  parsedNotes.activities = [
    ...parsedNotes.activities,
    `Onboarding curation submitted (${args.curationId})`,
  ].slice(-8);
  parsedNotes.timeline = [
    ...parsedNotes.timeline,
    createHireUsTimelineEvent(
      "system",
      `Onboarding curation submitted (${args.curationId}).`,
      "system"
    ),
  ].slice(-50);

  const marker = `curation:${args.curationId}`;

  const nextMessage = [
    lead.message ?? "",
    `Onboarding curation submitted (${marker}). Track progress from your curation results page and Dashboard Hire Us tab.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  await db.serviceLead.update({
    where: { id: lead.id },
    data: {
      message: nextMessage,
      notes: serializeHireUsLeadNotes(parsedNotes),
    },
  });
}
