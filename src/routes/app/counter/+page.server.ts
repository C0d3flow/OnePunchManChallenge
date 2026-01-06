import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ymdToPbDateTime(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`).toISOString();
}

// Monday-based week boundaries in UTC
function startOfWeekMondayUTC(d: Date) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (dt.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  dt.setUTCDate(dt.getUTCDate() - day);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

function endOfWeekMondayUTC(d: Date) {
  const start = startOfWeekMondayUTC(d);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

function clampPercent(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function normalizeGoal(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}
function pbErrorMessage(e: any) {
  try {
    console.error('PocketBase error:', {
      status: e?.status,
      message: e?.message,
      data: e?.data
    });
  } catch {}
  if (e?.data?.message) return String(e.data.message);
  if (e?.message) return String(e.message);
  if (e?.status) return `Error (status ${e.status})`;
  return 'Unknown PocketBase error.';
}

async function getOrCreateTodayEntry(locals: any, ymd: string) {
  const pbDate = ymdToPbDateTime(ymd);

  const existing = await locals.pb
    .collection('entries')
    .getFirstListItem(`user="${locals.user.id}" && ymd="${ymd}"`)
    .catch(() => null);

  if (existing) return existing;

  // Create "zero" entry for today so totals can be edited later even if user only sets totals
  return await locals.pb.collection('entries').create({
    user: locals.user.id,
    ymd,
    date: pbDate,
    pushups: 0,
    runKm: 0
  });
}
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/login');

  const ymd = todayYMD();

  const entry = await locals.pb
    .collection('entries')
    .getFirstListItem(`user="${locals.user.id}" && ymd="${ymd}"`)
    .catch(() => null);

  // Weekly totals (robust: compute in code)
  const now = new Date();
  const weekStart = startOfWeekMondayUTC(now);
  const weekEnd = endOfWeekMondayUTC(now);

  const allEntries = await locals.pb.collection('entries').getFullList({
    filter: `user="${locals.user.id}"`,
    sort: 'date'
  });

  let weekPushups = 0;
  let weekRunKm = 0;

  for (const e of allEntries) {
    const dt = new Date(e.date);
    if (dt >= weekStart && dt < weekEnd) {
      weekPushups += Number(e.pushups ?? 0);
      weekRunKm += Number(e.runKm ?? 0);
    }
  }

  // Goals defaults
  const DEFAULT_PUSHUPS_GOAL = 100;
  const DEFAULT_RUNKM_GOAL = 50;

  let settings = await locals.pb
    .collection('settings')
    .getFirstListItem(`user="${locals.user.id}"`)
    .catch(() => null);

  if (!settings) {
    settings = await locals.pb.collection('settings').create({
      user: locals.user.id,
      weeklyPushupGoal: DEFAULT_PUSHUPS_GOAL,
      weeklyRunKmGoal: DEFAULT_RUNKM_GOAL
    });
  }

  const pushupsGoal = normalizeGoal(settings.weeklyPushupGoal, DEFAULT_PUSHUPS_GOAL);
  const runKmGoal = normalizeGoal(settings.weeklyRunKmGoal, DEFAULT_RUNKM_GOAL);

  const pushupsPercent = pushupsGoal > 0 ? clampPercent((weekPushups / pushupsGoal) * 100) : 0;
  const runKmPercent = runKmGoal > 0 ? clampPercent((weekRunKm / runKmGoal) * 100) : 0;

  const saved = url.searchParams.get('saved') === '1';

  return {
    ymd,
    entry,
    saved,
    week: {
      pushups: weekPushups,
      runKm: weekRunKm,
      pushupsGoal,
      runKmGoal,
      pushupsPercent,
      runKmPercent
    }
  };
};

export const actions: Actions = {
  // Used by +5/+10 buttons: immediate increments, no redirect
  quickAdd: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const form = await request.formData();
    const ymd = String(form.get('ymd') ?? todayYMD());

    const pushupsDelta = Number(form.get('pushupsDelta') ?? 0);
    const runKmDeltaRaw = form.get('runKmDelta');
    const runKmDelta = runKmDeltaRaw === null || runKmDeltaRaw === '' ? 0 : Number(runKmDeltaRaw);

    if (!Number.isFinite(pushupsDelta) || pushupsDelta < 0) return fail(400, { error: 'Invalid pushups delta.' });
    if (!Number.isFinite(runKmDelta) || runKmDelta < 0) return fail(400, { error: 'Invalid runKm delta.' });

    try {
      const entry = await getOrCreateTodayEntry(locals, ymd);

      const newPushups = Number(entry.pushups ?? 0) + pushupsDelta;
      const newRunKm = Number(entry.runKm ?? 0) + runKmDelta;

      await locals.pb.collection('entries').update(entry.id, {
        pushups: newPushups,
        runKm: newRunKm
      });

      return { ok: true };
    } catch (e: any) {
      return fail(500, { error: pbErrorMessage(e) });
    }
  },

  // Used by typed inputs: adds values that are >0, no redirect
  addTyped: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const form = await request.formData();
    const ymd = String(form.get('ymd') ?? todayYMD());

    const pushupsDelta = Number(form.get('pushups') ?? 0);
    const runKmDeltaRaw = form.get('runKm');
    const runKmDelta = runKmDeltaRaw === null || runKmDeltaRaw === '' ? 0 : Number(runKmDeltaRaw);

    if (!Number.isFinite(pushupsDelta) || pushupsDelta < 0) return fail(400, { error: 'Pushups must be non-negative.' });
    if (!Number.isFinite(runKmDelta) || runKmDelta < 0) return fail(400, { error: 'Run km must be non-negative.' });

    if (pushupsDelta === 0 && runKmDelta === 0) return { ok: true }; // nothing to do

    try {
      const entry = await getOrCreateTodayEntry(locals, ymd);

      const newPushups = Number(entry.pushups ?? 0) + pushupsDelta;
      const newRunKm = Number(entry.runKm ?? 0) + runKmDelta;

      await locals.pb.collection('entries').update(entry.id, {
        pushups: newPushups,
        runKm: newRunKm
      });

      return { ok: true };
    } catch (e: any) {
      return fail(500, { error: pbErrorMessage(e) });
    }
  },

  // Gear modal: set exact totals for today
  setTotals: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const form = await request.formData();
    const ymd = String(form.get('ymd') ?? todayYMD());

    const pushupsTotal = Number(form.get('pushupsTotal') ?? 0);
    const runKmTotal = Number(form.get('runKmTotal') ?? 0);

    if (!Number.isFinite(pushupsTotal) || pushupsTotal < 0) return fail(400, { error: 'Invalid pushups total.' });
    if (!Number.isFinite(runKmTotal) || runKmTotal < 0) return fail(400, { error: 'Invalid run km total.' });

    try {
      const entry = await getOrCreateTodayEntry(locals, ymd);
      await locals.pb.collection('entries').update(entry.id, {
        pushups: pushupsTotal,
        runKm: runKmTotal
      });
      return { ok: true };
    } catch (e: any) {
      return fail(500, { error: pbErrorMessage(e) });
    }
  }
};
