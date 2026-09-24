/**
 * Client-side filtering for the writing and library indexes.
 *
 * Markup contract, inside the <section> that holds [data-filters=NAME]:
 *   .chip[data-f=KEY][data-v=VALUE]   a filter option; data-v="" means "all"
 *   [data-item]                       one filterable entry
 *   [data-group]                      optional container hidden when empty
 *   [data-n] inside a chip            receives the chip's faceted count
 *   [data-count] [data-clear] [data-empty] [data-more]   status + controls
 *
 * Counts are FACETED: each chip shows how many items it would leave given
 * the other active filters. A chip that would leave none is disabled, not
 * hidden, so the taxonomy stays visible and nothing jumps around.
 *
 * State lives in the URL query (?lang=ar&tag=…) so a filtered view can be
 * linked to — the tag pills on a post page link straight into one.
 *
 * Without JavaScript the filter bar stays hidden and every item shows.
 */

type Predicate = (el: HTMLElement, value: string) => boolean;

const pad = (n: number) => String(n).padStart(2, '0');

export function initFilters(name: string, predicates: Record<string, Predicate>) {
  const root = document.querySelector<HTMLElement>(`[data-filters="${name}"]`);
  const section = root?.closest('section');
  if (!root || !section) return;

  const items = Array.from(section.querySelectorAll<HTMLElement>('[data-item]'));
  const groups = Array.from(section.querySelectorAll<HTMLElement>('[data-group]'));
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.chip[data-f]'));
  const countEl = root.querySelector<HTMLElement>('[data-count]');
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-clear]');
  const moreBtn = root.querySelector<HTMLButtonElement>('[data-more]');
  const emptyEl = section.querySelector<HTMLElement>('[data-empty]');
  const keys = Object.keys(predicates);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state: Record<string, string> = Object.fromEntries(keys.map((k) => [k, '']));

  // Only accept URL values that correspond to a real chip — an unknown
  // ?tag= would otherwise filter everything away with nothing to un-press.
  const params = new URLSearchParams(location.search);
  for (const k of keys) {
    const v = params.get(k);
    if (v && chips.some((c) => c.dataset.f === k && c.dataset.v === v)) state[k] = v;
  }

  const matches = (el: HTMLElement, s: Record<string, string>) =>
    keys.every((k) => !s[k] || predicates[k](el, s[k]));

  let expanded = false;

  function apply(animate: boolean) {
    let shown = 0;
    for (const el of items) {
      const ok = matches(el, state);
      if (ok && el.hidden && animate && !reduce) {
        el.dataset.entering = '';
        el.addEventListener('animationend', () => delete el.dataset.entering, { once: true });
      }
      el.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) {
      g.hidden = !Array.from(g.querySelectorAll<HTMLElement>('[data-item]')).some((el) => !el.hidden);
    }

    for (const chip of chips) {
      const k = chip.dataset.f!;
      const v = chip.dataset.v!;
      const n = items.filter((el) => matches(el, { ...state, [k]: v })).length;
      const n_el = chip.querySelector('[data-n]');
      if (n_el) n_el.textContent = pad(n);
      const pressed = state[k] === v;
      chip.setAttribute('aria-pressed', String(pressed));
      if (n === 0 && !pressed) chip.setAttribute('aria-disabled', 'true');
      else chip.removeAttribute('aria-disabled');
      // an overflow tag that is selected must stay visible when collapsed
      if (chip.hasAttribute('data-overflow')) chip.hidden = !expanded && !pressed;
    }

    const active = keys.some((k) => state[k]);
    if (countEl) countEl.textContent = `${countEl.dataset.label ?? ''} ${pad(shown)} / ${pad(items.length)}`;
    if (clearBtn) clearBtn.hidden = !active;
    if (emptyEl) emptyEl.hidden = shown > 0;

    const url = new URL(location.href);
    for (const k of keys) {
      if (state[k]) url.searchParams.set(k, state[k]);
      else url.searchParams.delete(k);
    }
    history.replaceState(history.state, '', url);
  }

  root.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip[data-f]');
    if (!chip || chip.getAttribute('aria-disabled') === 'true') return;
    const k = chip.dataset.f!;
    const v = chip.dataset.v!;
    // pressing the active option again returns to "all"
    state[k] = state[k] === v ? '' : v;
    apply(true);
  });

  clearBtn?.addEventListener('click', () => {
    for (const k of keys) state[k] = '';
    apply(true);
  });

  moreBtn?.addEventListener('click', () => {
    expanded = !expanded;
    moreBtn.setAttribute('aria-expanded', String(expanded));
    moreBtn.textContent = (expanded ? moreBtn.dataset.labelLess : moreBtn.dataset.labelMore) ?? '';
    apply(false);
  });

  root.hidden = false;
  apply(false);
}
