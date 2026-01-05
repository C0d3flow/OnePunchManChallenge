import { redirect } from '@sveltejs/kit';

const COOKIE_NAME = 'pb_auth';

export const GET = async ({ locals, cookies }) => {
  locals.pb.authStore.clear();
  cookies.delete(COOKIE_NAME, { path: '/' });
  throw redirect(303, '/login');
};
