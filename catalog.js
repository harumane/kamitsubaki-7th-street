(() => {
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
    const values = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(values) : value && typeof value === 'object' ? Object.values(value).flatMap(values) : [];
    function matches(item, query, artists, selected = '') {
        if (selected && (!(item.artistIds || []).includes(selected) || (item.excludedArtistIds || []).includes(selected))) return false;
        const terms = query.trim().split(/\s+/u).map(normalize).filter(Boolean);
        // Explicit artist exclusions also apply when a raw track video title names the group.
        if ((item.excludedArtistIds || []).some(id => [...values(artists[id]?.names), ...values(artists[id]?.aliases), id].map(normalize).filter(Boolean).some(name => terms.includes(name)))) return false;
        const fields = [...values(item.titles), ...values(item.aliases), ...values(item.tags), ...values((item.tracks || []).map(track => typeof track === 'string' ? track : [track.titles, track.aliases])), item.date || '', item.venue || ''];
        (item.artistIds || []).forEach(id => fields.push(...values(artists[id]?.names), ...values(artists[id]?.aliases)));
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
    const results = document.getElementById('catalog-results');
    const status = document.getElementById('catalog-status');
    const filter = document.getElementById('catalog-filter');
    const label = kind === 'albums' ? '음반' : '라이브';
    let selected = new URLSearchParams(location.search).get('artist') || '';
    if (!artists[selected]) selected = '';
    function node(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; }
    function colorArtistTag(tag, id) {
        if (id === 'vwp') { tag.classList.add('catalog-vwp-color'); return; }
        const color = artists[id]?.color;
        if (!color) return;
        tag.classList.add('catalog-artist-color');
        tag.style.setProperty('--artist-color', color);
    }
    const releaseTypes = new Set(kind === 'albums' ? ['single', 'album', 'ep-cover'] : ['one-man', 'cover', 'mini', 'etc']);
    const sort = document.getElementById('catalog-sort');
    if (sort) sort.addEventListener('change', render);
    function render() {
        const found = items.filter(item => releaseTypes.has(kind === 'albums' ? (item.releaseType || 'album') : (item.liveType || 'etc')) && matches(item, input.value, artists, selected));
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
