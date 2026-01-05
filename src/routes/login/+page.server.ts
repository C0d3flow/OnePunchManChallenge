import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const COOKIE_NAME = 'pb_auth';

function setAuthCookie(cookies: any, token: string, model: any) {
  cookies.set(COOKIE_NAME, JSON.stringify({ token, model }), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 30
  });
}

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/app/counter');
  return {};
};

export const actions: Actions = {
  register: async ({ request, locals, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const passwordConfirm = String(form.get('passwordConfirm') ?? '');

    try {
      await locals.pb.collection('users').create({
        email,
        password,
        passwordConfirm
      });

      await locals.pb.collection('users').authWithPassword(email, password);

      setAuthCookie(cookies, locals.pb.authStore.token, locals.pb.authStore.model);
    } catch (e: any) {
      return fail(400, { error: e?.message ?? 'Registration failed' });
    }

    throw redirect(303, '/app/counter');
  },

  login: async ({ request, locals, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    try {
      await locals.pb.collection('users').authWithPassword(email, password);

      setAuthCookie(cookies, locals.pb.authStore.token, locals.pb.authStore.model);
    } catch {
      return fail(400, { error: 'Invalid email or password' });
    }

    throw redirect(303, '/app/counter');
  }
};
