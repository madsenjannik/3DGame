// @ts-nocheck
// DEV-only structured logger: log('LOAD', 'stable ready', 812). Silent unless the dev menu (or a
// dev route) is enabled, so production never spams the console. Tags: LOAD SAVE WORLD GARDEN STABLE FISH PERF LIFE.
const on = (() => { try { return localStorage.getItem('tgw.devMenu') === '1' || new URLSearchParams(location.search).get('dev') === '1'; } catch { return false; } })();
const t0 = performance.now();
export const devLogging = on;
export function log(tag, ...args) { if (on) console.info(`%c[${tag}]%c +${Math.round(performance.now() - t0)}ms`, 'color:#6f9a48;font-weight:700', 'color:#888', ...args); }
export function warn(tag, ...args) { console.warn(`[${tag}]`, ...args); } // warnings always reach the console
