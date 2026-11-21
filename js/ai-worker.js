// Web Worker: přemýšlení stroje mimo hlavní vlákno (aby se neseklo uživatelské rozhraní)
import * as E from './engine.js?v=3';
import { loadModel, materialModel, chooseAction, acceptsDraw } from './ai.js?v=3';

let model = null;
let modelPromise = null;
let cache = { actions: [], state: E.initialState() };

function stateFor(actions) {
  const c = cache.actions;
  let s;
  let from = 0;
  if (actions.length >= c.length && c.every((a, i) => actions[i] === a)) {
    s = cache.state;
    from = c.length;
  } else {
    s = E.initialState();
  }
  for (let i = from; i < actions.length; i++) s = E.applyAction(s, actions[i]).state;
  cache = { actions: actions.slice(), state: s };
  return s;
}

function ensureModel(base) {
  if (!modelPromise) {
    modelPromise = loadModel(base)
      .then((m) => { model = m; return 'net'; })
      .catch(() => { model = materialModel; return 'material'; });
  }
  return modelPromise;
}

self.onmessage = async (ev) => {
  const { id, type, actions, level, base, aiColor } = ev.data;
  try {
    const kind = await ensureModel(base);
    if (type === 'load') { self.postMessage({ id, ok: true, kind }); return; }
    const st = stateFor(actions);
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
