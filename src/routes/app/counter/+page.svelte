<script lang="ts">
  export let data: { ymd: string; entry: any };
  export let form: { success?: boolean; error?: string } | null;
</script>

<h1>Today ({data.ymd})</h1>

{#if form?.error}
  <p style="color:red"><strong>Error:</strong> {form.error}</p>
{/if}

{#if form?.success}
  <p style="color:green"><strong>Saved.</strong></p>
{/if}

<form method="POST" action="?/save">
  <input type="hidden" name="ymd" value={data.ymd} />

  <label>
    Pushups
    <input name="pushups" type="number" min="0" value={data.entry?.pushups ?? 0} />
  </label>

  <br />

  <label>
    Run (km, optional)
    <input name="runKm" type="number" min="0" step="0.1" value={data.entry?.runKm ?? ''} />
  </label>

  <br />
  <button type="submit">Save</button>
</form>

<p>
  <a href="/app/overview">Overview</a> |
  <a href="/logout">Logout</a>
</p>
