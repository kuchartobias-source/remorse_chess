// Web Worker: přemýšlení stroje mimo hlavní vlákno (aby se neseklo uživatelské rozhraní)
import * as E from './engine.js?v=6';
import { loadModel, materialModel, chooseAction, acceptsDraw } from './ai.js?v=6';

let cache = { variant: 'poutnici', actions: [], state: E.initialState() };
const models = {};

function stateFor(actions, variant = 'poutnici') {
  const c = cache.actions;
  let s;
  let from = 0;
  if (cache.variant === variant && actions.length >= c.length && c.every((a, i) => actions[i] === a)) {
    s = cache.state;
    from = c.length;
  } else {
    s = E.initialState(variant);
  }
  for (let i = from; i < actions.length; i++) s = E.applyAction(s, actions[i]).state;
  cache = { variant, actions: actions.slice(), state: s };
  return s;
}

// síť módu, záložně síť Poutníků, nakonec materiál
function ensureModel(bases) {
  const key = bases.join('|');
  if (!models[key]) {
    models[key] = (async () => {
      for (let i = 0; i < bases.length; i++) {
        try { return { model: await loadModel(bases[i]), kind: i === 0 ? 'net' : 'net-fallback' }; } catch (e) { /* další */ }
      }
      return { model: materialModel, kind: 'material' };
    })();
  }
  return models[key];
}

self.onmessage = async (ev) => {
  const { id, type, actions, level, bases, aiColor, variant } = ev.data;
  try {
    const { model, kind } = await ensureModel(bases);
    if (type === 'load') { self.postMessage({ id, ok: true, kind }); return; }
    const st = stateFor(actions, variant);
    if (type === 'move') {
      const t0 = performance.now();
      const action = chooseAction(model, st, level);
      self.postMessage({ id, ok: true, action, ms: Math.round(performance.now() - t0), kind });
    } else if (type === 'draw') {
      self.postMessage({ id, ok: true, accept: acceptsDraw(model, st, aiColor) });
    } else if (type === 'eval') {
      self.postMessage({ id, ok: true, value: model.value(st) });
    }
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message || e) });
  }
};
