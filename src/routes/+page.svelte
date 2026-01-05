<script lang="ts">
  export let data: { error?: string };
</script>

<h1>Login</h1>

{#if data?.error}
  <p style="color:red">{data.error}</p>
{/if}

<h2>Register</h2>
<form method="POST" action="?/register">
  <input name="email" type="email" placeholder="Email" required />
  <input name="password" type="password" placeholder="Password" required minlength="8" />
  <input name="passwordConfirm" type="password" placeholder="Confirm password" required minlength="8" />
  <button type="submit">Create account</button>
</form>

<h2>Sign in</h2>
<form method="POST" action="?/login">
  <input name="email" type="email" placeholder="Email" required />
  <input name="password" type="password" placeholder="Password" required />
  <button type="submit">Login</button>
</form>
