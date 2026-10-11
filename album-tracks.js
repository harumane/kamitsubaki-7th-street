(() => {
    if (new URLSearchParams(location.search).has('track')) return;
    const id = new URLSearchParams(location.search).get('id');
    const data = window.catalogData;
    const album = data?.albums.find(item => item.id === id);
    const root = document.getElementById('album-content');
    if (!album || !root) return;
    if (album.releaseType === 'single' || !['kaf','rim','harusaruhi','isekaijoucho','koko','vwp'].some(id => (album.displayArtistIds || album.artistIds || []).includes(id))) return;
    const element = (tag, cls, text) => {
        const el = document.createElement(tag);
        el.className = cls;
        if (text) el.textContent = text;
        return el;
    };
    root.classList.add('album-track-layout');
    const cover = element('img', 'album-large-cover');
    cover.src = album.image;
    cover.alt = `${album.originalTitle} 앨범 자켓`;
    const panel = element('div', 'album-track-panel');
    panel.tabIndex = 0;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', `${album.originalTitle} 수록곡 ${(album.tracks || []).length}곡`);
    const list = element('ol', 'album-track-list');
    (album.tracks || []).forEach((track, index) => {
        const original = track.titles?.ja || track.titles?.en || track.titles?.ko || String(track);
        const single = data.albums.find(item => item.releaseType === 'single' && (item.artistIds || []).includes('kaf') && (item.originalTitle === original || item.titles?.ja === original));
        const englishTitle = /^[\x20-\x7E]+$/.test(original) && /[A-Za-z]/.test(original);
        const korean = englishTitle ? original : track.titles?.ko || single?.titles?.ko || (/^[\x00-\x7F]+$/.test(original) ? original : '번역 추가 예정');
        const row = element('li', 'album-track-row');
        row.append(element('span', 'album-track-number', String(index + 1)));
        const originalBlock = element('div', 'album-track-original');
        const koreanBlock = element('div', 'album-track-korean');
        const trackHref = `album.html?id=${encodeURIComponent(id)}&track=${encodeURIComponent(track.videoId || 'index-' + index)}`;
        const remixOriginal = window.kafRemixes?.routes.get(trackHref);
        const href = track.songHref || ((album.coverLive || album.coverOnly) ? null : remixOriginal ? remixOriginal.href + '#song-remixes' : trackHref);
        const originalLink = element(href ? 'a' : 'span', 'album-track-name', original);
        const koreanLink = element(href ? 'a' : 'span', 'album-track-name', korean);
        if (href) originalLink.href = koreanLink.href = href;
        originalBlock.append(originalLink);
        koreanBlock.append(koreanLink);
        const artists = (track.vocalistIds || album.vocalistIds || track.artistIds || album.displayArtistIds || album.artistIds).map(key => ({key, ...data.artists[key]})).filter(a => a.names);
        // Instrumental tracks have no vocalist.
        const instrumental = /instrumental/i.test(original);
        [originalBlock, koreanBlock].forEach((block, side) => {
            const names = element('span', 'album-track-singer');
            if (instrumental) names.textContent = 'Instrumental';
            else artists.forEach((artist, i) => {
                if (i) names.append(document.createTextNode(' · '));
                const originalName = artist.names.ja || artist.names.en;
                const label = side && !/^[\x00-\x7F]+$/.test(originalName) ? artist.names.ko : originalName;
                const link = element(artist.linkDisabled ? 'span' : 'a', 'album-track-artist', label);
                if (!artist.linkDisabled) link.href = `members/${artist.key}.html`;
                names.append(link);
            });
            block.append(names);
        });
        row.append(originalBlock, koreanBlock);
        list.append(row);
    });
    panel.append(list);
    root.append(cover, panel);
    const details = element('div', 'album-description song-page');
    const addSection = (anchor, number, label) => {
        const section = element('section', 'song-section');
        section.id = `album-${anchor}`;
        const heading = element('h2', '');
        heading.append(element('span', 'song-number', `${number}.`), document.createTextNode(label));
        section.append(heading);
        details.append(section);
        return section;
    };
    const overview = addSection('overview', 1, '개요');
    (album.overview || ['개요는 추후 추가 예정입니다.']).forEach(text => overview.append(element('p', album.overview ? '' : 'song-empty', text)));
    const links = addSection('links', 2, '링크');
    const linkList = element('div', 'album-platform-links');
    const source = album.sourceUrl ? new URL(album.sourceUrl) : null;
    const youtubeSource = source && /(^|\.)youtube\.com$/.test(source.hostname) ? album.sourceUrl : '';
    const playlist = youtubeSource ? source.searchParams.get('list') : null;
    const platforms = [
        ['YouTube', album.platformLinks?.youtube || youtubeSource],
        ['YouTube Music', album.platformLinks?.youtubeMusic || (playlist ? `https://music.youtube.com/playlist?list=${encodeURIComponent(playlist)}` : '')],
        ['Spotify', album.platformLinks?.spotify]
    ];
    platforms.forEach(([name, url]) => {
        const link = element(url ? 'a' : 'span', 'album-platform-link', name);
        if (url) {
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.append(element('span', 'album-platform-arrow', '↗'));
        } else link.append(element('small', '', album.digitalUnavailable ? '음원 미발매' : '추후 추가 예정'));
        linkList.append(link);
    });
    links.append(linkList);
    if (!album.hideStore) {
    const store = addSection('store', 3, 'FINDMESTORE');
    // An existing listing remains visible even when sold out. Add verified
    // product entries as { name, releaseDate, url, image? } on the album.
    const products = (album.storeProducts || []).filter(product => {
        try { const url = new URL(product.url); return url.protocol === 'https:' && url.hostname === 'findmestore.thinkr.jp'; }
        catch { return false; }
    });
    if (!products.length) store.append(element('p', 'song-empty', '판매 정보는 추후 추가 예정입니다.'));
    products.forEach(product => {
        const card = element('div', 'song-release album-store-card');
        const image = element('img', 'song-release-art');
        image.src = product.image || album.image;
        image.alt = `${product.name || album.originalTitle} 음반 자켓`;
        const table = element('table', '');
        table.setAttribute('aria-label', 'FINDMESTORE 음반 판매 정보');
        const body = element('tbody', '');
        const addRow = (label, value) => {
            const row = element('tr', '');
            const header = element('th', '', label);
            header.scope = 'row';
            const cell = element('td', '');
            cell.append(value);
            row.append(header, cell);
            body.append(row);
        };
        addRow('음반명', document.createTextNode(product.name || album.originalTitle));
        addRow('발매일', document.createTextNode(product.releaseDate || '추후 추가 예정'));
        const link = element('a', '', 'FINDMESTORE ↗');
        link.href = product.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        addRow('링크', link);
        table.append(body);
        card.append(image, table);
        store.append(card);
    });
    }
    const notes = addSection('notes', album.hideStore ? 3 : 4, '여담');
    (album.notes || ['여담은 추후 추가 예정입니다.']).forEach(text => notes.append(element('p', album.notes ? '' : 'song-empty', text)));
    root.append(details);
    // Keep native text selection; scroll with the wheel, touch, or scrollbar.
})();
