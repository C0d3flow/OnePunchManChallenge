import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

const COOKIE_NAME = 'pb_auth';

type PBAuthCookie = {
  token: string;
  model: any;
};

export const handle: Handle = async ({ event, resolve }) => {
  const pb = new PocketBase(env.POCKETBASE_URL);

  // Restore auth from cookie (if present)
  const raw = event.cookies.get(COOKIE_NAME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PBAuthCookie;
      pb.authStore.save(parsed.token, parsed.model);
    } catch {
      // If the cookie is malformed, ignore it (do not delete here)
      pb.authStore.clear();
    }
  }

  event.locals.pb = pb;
  event.locals.user = pb.authStore.model;

  return resolve(event);
};
