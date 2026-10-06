// Highlight the current top-level section on every page.
const currentPath = window.location.pathname;
const currentFile = currentPath.split('/').pop();
let section;
if (currentPath.includes('/members/') || currentFile === 'artists.html') {
    section = 'artists.html';
} else if (currentFile === 'album.html') {
    section = 'albums.html';
} else if (['albums.html', 'live.html', 'schedule.html', 'guide.html'].includes(currentFile)) {
    section = currentFile;
} else if (currentFile === 'discord.html') {
    section = 'discord.html';
} else if (currentFile === 'website.html') {
    section = 'website.html';
} else if (currentFile === 'index.html' || currentFile === '') {
    section = 'index.html';
}
if (section) {
    const activeMenu = document.querySelector(`.side-menu > .menu-item[href$="${section}"]`);
    if (activeMenu) {
        activeMenu.classList.add('is-active');
        activeMenu.setAttribute('aria-current', (currentPath.includes('/members/') || currentFile === 'album.html') ? 'true' : 'page');
    }
}
// Sidebar enters once per tab session; content enters on every navigation.
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.main-content');
    let firstEntry = true;
    try {
        firstEntry = sessionStorage.getItem('kamitsubaki-entry-seen') !== '1';
        sessionStorage.setItem('kamitsubaki-entry-seen', '1');
    } catch (_) {
        // Navigation still works when browser storage is unavailable.
    }
    function enter(element, offset, duration) {
        if (!element || reducedMotion.matches || typeof element.animate !== 'function') return;
        element.animate([
            { opacity: 0, transform: `translateX(${offset}px)` },
            { opacity: 1, transform: 'translateX(0)' }
        ], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    if (firstEntry) enter(sidebar, -24, 520);
    enter(content, 24, 440);
    // Back/forward cache restores do not run this script again.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) enter(content, 24, 440);
    });
})();