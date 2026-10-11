(() => {
    const params = new URLSearchParams(location.search);
    const song = window.catalogData?.songs?.find(s => s.id === params.get('id'));
    if (song) { window.activeSong = song; return; }
    const videoId = params.get('track');
    const album = window.catalogData?.albums.find(a => a.id === params.get('id'));
    const track = album?.tracks?.find((t, index) => (t.videoId || 'index-' + index) === videoId);
    if (!track) return;
    if (track.songHref) { window.songRedirect = true; location.replace(track.songHref + (location.hash || '')); return; }
    if ((album.coverLive || album.coverOnly)) {
        window.songRedirect = true;
        location.replace(track.songHref || `album.html?id=${encodeURIComponent(album.id)}`);
        return;
    }
    const original = track.titles.ja || track.titles.en;
    const ids = track.vocalistIds || album.vocalistIds || track.artistIds || album.displayArtistIds || album.artistIds || [];
    const single = window.catalogData.albums.find(a => a.releaseType === 'single' && (a.artistIds || []).some(id => ids.includes(id)) && (a.originalTitle === original || a.titles?.ja === original));
    window.activeSong = { ...album, ...track, originalTitle: original, titles: {...track.titles, ko: track.titles.ko || single?.titles?.ko || ''},
        image: single?.image || album.image, artistIds: /instrumental/i.test(original) ? [] : ids };
})();
