import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// If PB field "date" is of type Date, PB expects a datetime-ish ISO string.
// We store "midnight UTC" for the given day.
function ymdToPbDateTime(ymd: string) {
  // "2026-01-05T00:00:00.000Z"
  return new Date(`${ymd}T00:00:00.000Z`).toISOString();
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const ymd = todayYMD();
  const pbDate = ymdToPbDateTime(ymd);

  // Try to load existing entry for today; if none exists, return null
  const existing = await locals.pb
    .collection('entries')
    .getFirstListItem(`user="${locals.user.id}" && date="${pbDate}"`)
    .catch(() => null);

  return { ymd, entry: existing };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const form = await request.formData();

    const ymd = String(form.get('ymd') ?? todayYMD());
    const pbDate = ymdToPbDateTime(ymd);

    const pushups = Number(form.get('pushups') ?? 0);

    const runKmRaw = form.get('runKm');
    const runKm = runKmRaw === null || runKmRaw === '' ? undefined : Number(runKmRaw);

    // Basic validation
    if (!Number.isFinite(pushups) || pushups < 0) {
      return fail(400, { error: 'Pushups must be a non-negative number.' });
    }
    if (runKm !== undefined && (!Number.isFinite(runKm) || runKm < 0)) {
      return fail(400, { error: 'Run km must be a non-negative number.' });
    }

    try {
      const existing = await locals.pb
        .collection('entries')
        .getFirstListItem(`user="${locals.user.id}" && date="${pbDate}"`)
        .catch(() => null);

      const payload: Record<string, any> = {
        user: locals.user.id,
        date: pbDate,
        pushups
      };
      if (runKm !== undefined) payload.runKm = runKm;

      if (existing) {
        await locals.pb.collection('entries').update(existing.id, payload);
      } else {
        await locals.pb.collection('entries').create(payload);
      }

      return { success: true };
    } catch (e: any) {
      // Surface PocketBase errors in the UI
      return fail(500, { error: e?.message ?? 'Failed to save entry.' });
    }
  }
};
