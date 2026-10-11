(() => {
    const normalize = value => { const text = String(value || '').normalize('NFKC').toLowerCase().trim(); return text.replace(/[\p{P}\p{S}\s]/gu, '') || text; };
    const values = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(values) : value && typeof value === 'object' ? Object.values(value).flatMap(values) : [];
    const relatedCache = new WeakMap();
    function relatedArtists(item) {
        if (relatedCache.has(item)) return relatedCache.get(item);
        const ids = new Set(item.artistIds || []);
        const catalog = window.catalogData || {};
        const entries = [...(catalog.albums || []), ...(catalog.songs || [])];
        for (const track of item.tracks || []) {
            for (const id of [...(track.artistIds || []), ...(track.vocalistIds || [])]) ids.add(id);
            if (!track.songHref) continue;
            const params = new URLSearchParams(track.songHref.split('?')[1] || '');
            const song = entries.find(entry => entry.id === params.get('id'));
            for (const id of song?.artistIds || []) ids.add(id);
        }
        relatedCache.set(item, [...ids]);
        return [...ids];
    }
    function artistSearchNames(id, artist) {
        if (!artist) return [id];
        const names = artist.tagName ? { ...artist.names, ko: artist.tagName } : artist.names;
        return [id, artist.tagName, ...values(names), ...values(artist.aliases)].filter(Boolean);
    }
    function queryArtists(query, artists) {
        const words = query.trim().split(/\s+/u).filter(Boolean);
        const groups = [];
        // Prefer a complete multiword name. Shared names are alternatives, not
        // a requirement that one album must carry every namesake's tag.
        for (let i = 0; i < words.length; i++) {
            for (let j = words.length; j > i; j--) {
                const phrase = normalize(words.slice(i, j).join(' '));
                const ids = Object.keys(artists).filter(id => artistSearchNames(id, artists[id]).some(name => normalize(name) === phrase));
                if (ids.length) { groups.push(ids); i = j - 1; break; }
            }
        }
        return groups;
    }
    function matches(item, query, artists, selected = '', ownOnly = false) {
        const tagged = item.displayArtistIds || item.artistIds || [];
        const related = ownOnly ? tagged : relatedArtists(item);
        if (selected && (!related.includes(selected) || (item.excludedArtistIds || []).includes(selected))) return false;
        if (ownOnly && queryArtists(query, artists).some(ids => !ids.some(id => tagged.includes(id)))) return false;
        const terms = query.trim().split(/\s+/u).map(normalize).filter(Boolean);
        // Explicit artist exclusions also apply when a raw track video title names the group.
        if ((item.excludedArtistIds || []).some(id => [...values(artists[id]?.names), ...values(artists[id]?.aliases), id].map(normalize).filter(Boolean).some(name => terms.includes(name)))) return false;
        const fields = [...values(item.titles), ...values(item.aliases), ...values(item.tags), ...values((item.tracks || []).map(track => typeof track === 'string' ? track : [track.titles, track.aliases])), item.date || '', item.venue || ''];
        related.forEach(id => fields.push(...artistSearchNames(id, artists[id])));
        const indexed = fields.map(normalize).filter(Boolean);
        return query.trim().split(/\s+/u).map(normalize).filter(Boolean).every(term => indexed.some(field => field.includes(term)));
    }
    // Reusable by future album/live detail pages.
    window.catalogSearch = { normalize, matches };
    const root = document.querySelector('[data-catalog]');
    if (!root) return;
    const kind = root.dataset.catalog;
    const data = window.catalogData || { artists: {}, albums: [], live: [] };
    const items = data[kind] || [];
    const artists = data.artists || {};
    const artistRanks = new Map((data.artistOrder || Object.keys(artists)).map((id, index) => [id, index]));
    const orderedArtistIds = ids => [...new Set(ids || [])].sort((a, b) => (artistRanks.get(a) ?? Infinity) - (artistRanks.get(b) ?? Infinity));
    const input = document.getElementById('catalog-query');
    const clear = document.getElementById('catalog-clear');
    const ownOnly = document.getElementById('catalog-own-only');
    const results = document.getElementById('catalog-results');
    const status = document.getElementById('catalog-status');
    const filter = document.getElementById('catalog-filter');
    const label = kind === 'albums' ? '음반' : '라이브';
    let selected = new URLSearchParams(location.search).get('artist') || '';
    if (!artists[selected]) selected = '';
    function node(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; }
    function colorArtistTag(tag, id) {
        if (id === 'vwp') { tag.classList.add('catalog-vwp-color'); return; }
        if (id === 'kuusou') {
            tag.classList.add('catalog-kuusou-color');
            tag.style.setProperty('--kuusou-ciel', artists.ciel.color);
            tag.style.setProperty('--kuusou-sooda', artists.sooda.color);
            return;
        }
        const color = artists[id]?.color;
        if (!color) return;
        tag.classList.add('catalog-artist-color');
        tag.style.setProperty('--artist-color', color);
    }
    const releaseTypes = new Set(kind === 'albums' ? ['single', 'album', 'ep-cover'] : ['one-man', 'cover', 'mini', 'etc']);
    const sort = document.getElementById('catalog-sort');
    // Keep each history entry's filters, with a tab-local fallback for the list link.
    const stateKey = 'kamitsubaki:album-view:v1:' + location.pathname;
    let savedView = null;
    if (kind === 'albums') {
        savedView = history.state?.albumViewState || null;
        if (!savedView && !new URLSearchParams(location.search).has('artist')) {
            try { savedView = JSON.parse(sessionStorage.getItem(stateKey)); } catch (_) {}
        }
        if (savedView && typeof savedView === 'object') {
            if (typeof savedView.query === 'string') input.value = savedView.query;
            if (ownOnly && typeof savedView.ownOnly === 'boolean') ownOnly.checked = savedView.ownOnly;
            if (sort && ['newest', 'oldest'].includes(savedView.sort)) sort.value = savedView.sort;
            selected = artists[savedView.artist] ? savedView.artist : '';
            if (Array.isArray(savedView.types)) {
                releaseTypes.clear();
                savedView.types.filter(type => ['single', 'album', 'ep-cover'].includes(type)).forEach(type => releaseTypes.add(type));
            }
        }
        document.querySelectorAll('[data-release-type]').forEach(button => {
            button.setAttribute('aria-pressed', String(releaseTypes.has(button.dataset.releaseType)));
        });
    }
    function saveView() {
        if (kind !== 'albums') return;
        const view = { ownOnly: !!ownOnly?.checked, query: input.value, sort: sort?.value || 'newest', artist: selected, types: [...releaseTypes] };
        try { sessionStorage.setItem(stateKey, JSON.stringify(view)); } catch (_) {}
        try { history.replaceState({ ...history.state, albumViewState: view }, ''); } catch (_) {}
    }
    if (sort) sort.addEventListener('change', render);
    if (ownOnly) ownOnly.addEventListener('change', render);
    function render() {
        saveView();
        const found = items.filter(item => releaseTypes.has(kind === 'albums' ? (item.releaseType || 'album') : (item.liveType || 'etc')) && matches(item, input.value, artists, selected, !!ownOnly?.checked));
        if (sort) found.sort((a,b) => (sort.value === 'oldest' ? 1 : -1) * (a.date || '').localeCompare(b.date || '') || (a.originalTitle || '').localeCompare(b.originalTitle || ''));
        results.replaceChildren(); filter.replaceChildren();
        clear.hidden = !input.value;
        if (selected) {
            const chip = node('button', 'catalog-tag', `#${artists[selected].tagName || artists[selected].names.ko || artists[selected].names.en} ×`);
            colorArtistTag(chip, selected);
            chip.type = 'button'; chip.setAttribute('aria-label', '아티스트 필터 해제');
            chip.onclick = () => { selected = ''; render(); }; filter.append(chip);
        }
        status.textContent = !releaseTypes.size ? (kind === 'albums' ? '음반 종류를 하나 이상 선택해 주세요.' : '라이브 종류를 하나 이상 선택해 주세요.') : !items.length ? `아직 등록된 ${label}이 없습니다.` : !found.length ? '검색 결과가 없습니다. 다른 이름이나 표기로 검색해 보세요.' : `${found.length}개의 ${label}`;
        found.forEach(item => {
            const card = node('article', 'catalog-card');
            const title = item.originalTitle || item.titles?.ja || item.titles?.en || item.titles?.ko || '';
            const heading = node('h2', 'catalog-item-title');
            const href = kind === 'albums' ? `album.html?id=${encodeURIComponent(item.id)}` : item.href;
            const safeHref = href && !/^(?:[a-z]+:|\/\/)/i.test(href);
            const titleNode = node(safeHref ? 'a' : 'span', '', title);
            if (safeHref) titleNode.href = href;
            if (item.image) {
                const img = node('img', 'catalog-cover'); img.src = item.image; img.alt = ''; img.loading = 'lazy';
                img.addEventListener('error', () => {
                    if (item.imageFallback && img.getAttribute('src') !== item.imageFallback) {
                        img.src = item.imageFallback;
                    } else {
                        img.hidden = true;
                        const placeholder = node('span', 'catalog-cover catalog-cover-placeholder', '표지 준비 중');
                        img.after(placeholder);
                    }
                });
                if (safeHref) {
                    const link = node('a', 'catalog-cover-link'); link.href = href;
                    link.setAttribute('aria-label', title + ' 상세 페이지'); link.append(img); card.append(link);
                } else card.append(img);
            }
            heading.append(titleNode);
            if (item.titles?.ko && item.titles.ko !== title && !/^[\x00-\x7F]+$/.test(title)) heading.append(node('span', 'catalog-title-ko', item.titles.ko));
            card.append(heading);
            if (item.date) card.append(node('p', 'catalog-date', item.date.replace(/-/g, '.')));
            const tags = node('div', 'catalog-tags');
            if (kind === 'albums') {
                const type = item.releaseType || 'album';
                const category = node('button', 'catalog-tag catalog-release-tag', type === 'single' ? '#싱글' : type === 'ep-cover' ? '#EP/COVER' : '#앨범');
                category.type = 'button';
                category.onclick = () => {
                    releaseTypes.clear(); releaseTypes.add(type);
                    document.querySelectorAll('[data-release-type]').forEach(button => {
                        button.setAttribute('aria-pressed', String(button.dataset.releaseType === type));
                    });
                    render();
                };
                tags.append(category);
            }
            orderedArtistIds(item.displayArtistIds || item.artistIds).forEach(id => {
                if (!artists[id]) return;
                const tag = node('button', 'catalog-tag', `#${artists[id].tagName || artists[id].names.ko || artists[id].names.en || id}`);
                colorArtistTag(tag, id);
                tag.type = 'button'; tag.onclick = () => { selected = id; render(); }; tags.append(tag);
            });
            card.append(tags); results.append(card);
        });
    }
    document.querySelectorAll('[data-release-type]').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.releaseType;
            releaseTypes.has(type) ? releaseTypes.delete(type) : releaseTypes.add(type);
            button.setAttribute('aria-pressed', String(releaseTypes.has(type)));
            render();
        });
    });
    input.addEventListener('input', render);
    clear.addEventListener('click', () => { input.value = ''; input.focus(); render(); });
    document.getElementById('catalog-search').addEventListener('submit', e => { e.preventDefault(); render(); });
    render();
})();

