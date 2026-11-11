/** Tiny cross-page navigation for the clean UI inside the legacy tab shell. */
export interface NavDetail { tab: string; sub?: string; template?: string; builder?: 'agent' | 'widget' | 'artefact'; dept?: string }
export const pending: { template?: string; builder?: NavDetail['builder']; dept?: string } = {};
export function navigate(d: NavDetail) {
  pending.template = d.template; pending.builder = d.builder; pending.dept = d.dept;
  window.dispatchEvent(new CustomEvent<NavDetail>('ops:nav', { detail: d }));
}
export const onNavigate = (fn: (d: NavDetail) => void) => { const h = (e: Event) => fn((e as CustomEvent<NavDetail>).detail); window.addEventListener('ops:nav', h); return () => window.removeEventListener('ops:nav', h); };
