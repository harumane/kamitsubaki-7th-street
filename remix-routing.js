(() => {
    const albums = (window.catalogData?.albums || []).filter(a => !a.coverLive && !a.coverOnly && ['kaf','rim','harusaruhi','isekaijoucho','koko','vwp'].some(id => (a.displayArtistIds || a.artistIds || []).includes(id) || a.templateArtist === id));
    const titleOf = item => item.originalTitle || item.titles?.ja || item.titles?.en || '';
    const normalize = title => title.normalize('NFKC').replace(/\s+feat\..*$/i, '').replace(/\s/g, '').replace(/ぺ/g, 'ペ').replace('夜が降りやむ前に', '夜が降り止む前に');
    const groupKey = (album, title) => (['rim','harusaruhi','isekaijoucho','koko','vwp'].includes(album.templateArtist) ? album.templateArtist + ':' : '') + normalize(title);
    const baseTitle = title => title.replace(/[（(].*(?:remix|instrumental).*[）)]\s*$/i, '').replace(/[-－]崩壊Remix[-－]?$/i, '').trim();
    const isVariant = title => /remix/i.test(title) || (/instrumental/i.test(title) && ['夜が降り止む前に', '戸惑いテレパシー', 'ラブしい', 'かりそめ'].some(name => normalize(baseTitle(title)) === normalize(name)));
    const variantLabel = item => {
        if (item.variantLabel) return item.variantLabel;
        const title = item.titles?.ko || titleOf(item);
        const normalized = title.normalize('NFKC');
        const start = normalized.indexOf('(');
        if (start >= 0 && /(?:remix|instrumental)/i.test(normalized.slice(start))) return normalized.slice(start + 1).replace(/\)\s*$/, '').trim().replace(/\s*Remix$/i, ' Remix');
        const special = normalized.match(/[-－]([^－-]*Remix)[-－]?$/i);
        return special ? special[1].replace(/\s*Remix$/i, ' Remix') : 'Remix';
    };
    const entries = [];
    albums.forEach(album => {
        if (album.releaseType === 'single') {
            entries.push({item: album, album, href: `album.html?id=${encodeURIComponent(album.id)}`});
            (album.tracks || []).forEach((item, index) => { if (item.variantOf) entries.push({item, album, href: `album.html?id=${encodeURIComponent(album.id)}&track=${encodeURIComponent(item.videoId || 'index-' + index)}`}); });
        }
        else (album.tracks || []).forEach((item, index) => entries.push({item, album, href: `album.html?id=${encodeURIComponent(album.id)}&track=${encodeURIComponent(item.videoId || 'index-' + index)}`}));
    });
    // Standalone original-song templates are canonical destinations too.
    (window.catalogData?.songs || []).forEach(song => entries.push({item: song, album: song, href: `album.html?id=${encodeURIComponent(song.id)}`}));
    const originals = new Map();
    // Prefer a single, then an original studio album over a live/cover version.
    [...entries].sort((a,b) => (a.album.releaseType === 'single' ? 0 : a.album.releaseType === 'album' ? 1 : 2) - (b.album.releaseType === 'single' ? 0 : b.album.releaseType === 'album' ? 1 : 2)).forEach(entry => {
        const title = titleOf(entry.item);
        if (!entry.item.variantOf && !isVariant(title) && !originals.has(groupKey(entry.album, title))) originals.set(groupKey(entry.album, title), entry);
    });
    const routes = new Map(), groups = new Map(), unresolved = [];
    entries.filter(entry => !(entry.album.templateArtist === 'vwp' && entry.item.songHref && !entry.item.variantOf) && (entry.item.variantOf || isVariant(titleOf(entry.item)))).forEach(entry => {
        const key = groupKey(entry.album, entry.item.variantOf || baseTitle(titleOf(entry.item)));
        const original = originals.get(key);
        if (!original) { unresolved.push(titleOf(entry.item)); return; }
        routes.set(entry.href, original);
        const group = groups.get(key) || [];
        if (!group.some(e => normalize(titleOf(e.item)) === normalize(titleOf(entry.item)))) group.push(entry);
        groups.set(key, group);
    });
    window.kafRemixes = { routes, groups, unresolved, normalize, groupKey, titleOf, variantLabel };
    const params = new URLSearchParams(location.search);
    const href = `album.html?id=${encodeURIComponent(params.get('id'))}` + (params.has('track') ? `&track=${encodeURIComponent(params.get('track'))}` : '');
    const original = routes.get(href);
    if (original) location.replace(original.href + '#song-remixes');
})();
