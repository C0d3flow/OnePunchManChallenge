import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  throw redirect(303, locals.user ? '/app/counter' : '/login');
};
