// Add square portraits when files are supplied; keep empty slots otherwise.
document.querySelectorAll('[data-artist-image]').forEach((slot) => {
    const extensions = ['png', 'jpg', 'jpeg', 'webp'];
    const portrait = new Image();
    portrait.alt = '';
    let attempt = 0;
    portrait.onload = () => {
        slot.replaceChildren(portrait);
    };
    portrait.onerror = () => {
        if (attempt < extensions.length) loadNext();
    };
    function loadNext() {
        portrait.src = `images/artist/${slot.dataset.artistImage}.${extensions[attempt++]}`;
    }
    loadNext();
});