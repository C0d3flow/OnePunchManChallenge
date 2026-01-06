<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  export let data;
  export let form;

  // typed deltas (reset to 0 after submit success)
  let typedPushups = 0;
  let typedRunKm = 0;

  // gear modal
  let editOpen = false;
  let editPushupsTotal = 0;
  let editRunKmTotal = 0;

  $: todayPushups = Number(data.entry?.pushups ?? 0);
  $: todayRunKm = Number(data.entry?.runKm ?? 0);

  $: canAddTyped = typedPushups > 0 || typedRunKm > 0;

  function openEdit() {
    editPushupsTotal = todayPushups;
    editRunKmTotal = todayRunKm;
    editOpen = true;
  }

  function closeEdit() {
    editOpen = false;
  }
  function quickAddPushups(n: number) {
    const fd = new FormData();
    fd.set('ymd', data.ymd);
    fd.set('pushupsDelta', String(n));
    fd.set('runKmDelta', '0');

    fetch('?/quickAdd', { method: 'POST', body: fd })
      .then(async (r) => {
        if (!r.ok) throw new Error('Request failed');
        await invalidateAll();
      })
      .catch(() => {});
  }

  function quickAddRunKm(n: number) {
    const fd = new FormData();
    fd.set('ymd', data.ymd);
    fd.set('pushupsDelta', '0');
    fd.set('runKmDelta', String(n));

    fetch('?/quickAdd', { method: 'POST', body: fd })
      .then(async (r) => {
        if (!r.ok) throw new Error('Request failed');
        await invalidateAll();
      })
      .catch(() => {});
  }
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
  <header class="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
    <div class="mx-auto max-w-md px-4 py-3 flex justify-between">
      <div>
        <div class="text-sm text-gray-500">Today</div>
        <div class="text-lg font-semibold">{data.ymd}</div>
      </div>
      <div class="text-sm">
        <a href="/app/overview" class="text-gray-600">Overview</a>
        <span class="px-2 text-gray-300">|</span>
        <a href="/logout" class="text-gray-600">Logout</a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-md px-4 py-6 space-y-4">

    {#if form?.error}
      <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
        <strong>Error:</strong> {form.error}
      </div>
    {/if}

    <!-- Weekly summary -->
    <section class="rounded-2xl bg-white border shadow-sm p-4 space-y-3">
      <h2 class="font-semibold">This week</h2>

      <div>
        <div class="flex justify-between text-sm">
          <span>Pushups</span>
          <span>{data.week.pushups} / {data.week.pushupsGoal}</span>
        </div>
        <div class="h-2 bg-gray-100 rounded">
          <div class="h-2 bg-gray-900 rounded" style="width:{data.week.pushupsPercent}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-sm">
          <span>Run (km)</span>
          <span>{data.week.runKm} / {data.week.runKmGoal}</span>
        </div>
        <div class="h-2 bg-gray-100 rounded">
          <div class="h-2 bg-gray-900 rounded" style="width:{data.week.runKmPercent}%"></div>
        </div>
      </div>
    </section>

    <!-- Log today -->
    <section class="rounded-2xl bg-white border shadow-sm p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Log today</h2>
        <button type="button" class="text-gray-500" on:click={openEdit} title="Edit today's totals">⚙</button>
      </div>

      <div class="text-xs text-gray-500">
        “Today total” is cumulative for the day. Use +5/+10 for instant logging or type a custom amount.
      </div>

      <!-- PUSHUPS ROW -->
      <div class="space-y-1">
        <div class="text-sm font-medium">Pushups</div>
        <div class="grid grid-cols-[auto_auto_1fr_auto] gap-2 items-center">
          <button type="button" class="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium" on:click={() => quickAddPushups(5)}>+5</button>
          <button type="button" class="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium" on:click={() => quickAddPushups(10)}>+10</button>

          <input
            class="w-full rounded-lg border border-gray-200 px-3 py-2"
            type="number"
            min="0"
            bind:value={typedPushups}
            placeholder="Custom"
          />
          <div class="text-right">
            <div class="text-[11px] text-gray-500">Today total</div>
            <div class="text-sm font-medium">{todayPushups}</div>
          </div>
        </div>
      </div>

      <!-- RUN ROW -->
      <div class="space-y-1">
        <div class="text-sm font-medium">Run (km)</div>
        <div class="grid grid-cols-[auto_auto_1fr_auto] gap-2 items-center">
          <button type="button" class="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium" on:click={() => quickAddRunKm(5)}>+5</button>
          <button type="button" class="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium" on:click={() => quickAddRunKm(10)}>+10</button>

          <input
            class="w-full rounded-lg border border-gray-200 px-3 py-2"
            type="number"
            min="0"
            step="0.1"
            bind:value={typedRunKm}
            placeholder="Custom"
          />

          <div class="text-right">
            <div class="text-[11px] text-gray-500">Today total</div>
            <div class="text-sm font-medium">{todayRunKm}</div>
          </div>
        </div>
      </div>

      <!-- Add typed deltas -->
      <form
        method="POST"
        action="?/addTyped"
        use:enhance={() => {
          return async ({ result }) => {
            // On success, refresh data + reset typed inputs
            // If server returned fail(), SvelteKit will populate `form.error`
            if (result.type === 'success') {
              typedPushups = 0;
              typedRunKm = 0;
              await invalidateAll();
            }
          };
        }}
        class="pt-2"
      >
        <input type="hidden" name="ymd" value={data.ymd} />
        <input type="hidden" name="pushups" value={typedPushups} />
        <input type="hidden" name="runKm" value={typedRunKm} />

        <button
          type="submit"
          class="w-full rounded-xl py-3 font-semibold text-white transition
                 {canAddTyped ? 'bg-gray-900 hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}"
          disabled={!canAddTyped}
        >
          Add typed values
        </button>
      </form>
    </section>
  </main>

  <!-- Edit modal -->
  {#if editOpen}
    <div class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50" on:click={closeEdit}>
      <div class="w-full max-w-md bg-white rounded-2xl shadow-lg border p-4" on:click|stopPropagation>
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold">Edit today’s totals</div>
          <button type="button" class="text-gray-500" on:click={closeEdit}>✕</button>
        </div>

        <form
          method="POST"
          action="?/setTotals"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === 'success') {
                await invalidateAll();
                closeEdit();
              }
            };
          }}
          class="space-y-3"
        >
          <input type="hidden" name="ymd" value={data.ymd} />

          <div>
            <label class="block text-sm font-medium">Pushups total</label>
            <input class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" type="number" min="0" bind:value={editPushupsTotal} name="pushupsTotal" />
          </div>

          <div>
            <label class="block text-sm font-medium">Run (km) total</label>
            <input class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" type="number" min="0" step="0.1" bind:value={editRunKmTotal} name="runKmTotal" />
          </div>

          <button class="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black" type="submit">
            Save totals
          </button>
        </form>
      </div>
    </div>
  {/if}
</div>
