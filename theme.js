(() => {
    const key = 'kamitsubaki-theme';
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = 'system';
    try { preference = sessionStorage.getItem(key) || 'system'; } catch (_) {}
    if (!['light', 'dark'].includes(preference)) preference = 'system';
    let toggle;
    function apply() {
        const dark = preference === 'dark' || (preference === 'system' && system.matches);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        if (toggle) {
            toggle.setAttribute('aria-checked', String(dark));
            toggle.title = dark ? '라이트 모드로 전환' : '다크 모드로 전환';
        }
    }
    function save(value) {
        preference = value;
        try { sessionStorage.setItem(key, value); } catch (_) {}
        apply();
    }
    apply(); // Run in the head before painting the page.
    system.addEventListener('change', () => { if (preference === 'system') apply(); });
    window.addEventListener('storage', (event) => {
        if (event.key === key || event.key === null) {
            preference = ['dark', 'light'].includes(event.newValue) ? event.newValue : 'system';
            apply();
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        const controls = document.createElement('div');
        controls.className = 'theme-controls';
        controls.innerHTML = `<button class="theme-switch" type="button" role="switch" aria-label="다크 모드" aria-checked="false"><span class="theme-thumb"></span><svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" fill="currentColor"/></svg><svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
        document.body.append(controls);
        toggle = controls.querySelector('.theme-switch');
        toggle.addEventListener('click', () => save(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
        apply();
    });
})();
