(() => {
    if (window.songRedirect) return;
    // Only these two songs are enabled while the template is being designed.
    const id = new URLSearchParams(location.search).get('id');
    const targetId = 'youtube-OLAK5uy_mMbhk9oDbKmZU2NZxZNSl3ZnQBa9OEV-A';
    const blankId = 'youtube-OLAK5uy_lxZ2GH3wBoEwxeJmmlvBnca2soazqI6Jo';
    const album = window.activeSong || (window.catalogData?.albums || []).find(item => item.id === id);
    const isKafSingle = album?.releaseType === 'single' && (['kaf','rim','harusaruhi','isekaijoucho','koko'].some(id => (album.displayArtistIds || album.artistIds || []).includes(id)) || album.songTemplate === 'blank');
    if (id !== targetId && id !== blankId && !window.activeSong && !isKafSingle) return;
    const isBlank = id !== targetId || !!window.activeSong;
    const content = document.getElementById('album-content');
    if (!album || !content) return;
    content.classList.add('song-page');
    const sections = [
        ['overview', '개요'], ['video', '영상'], ['lyrics', '가사'],
        ['releases', '음반 수록'], ['notes', '여담']
    ];
    if (isBlank) sections.splice(4, 0, ['live', '라이브']);
    const remixIndex = window.kafRemixes;
    const remixes = remixIndex?.groups.get(remixIndex.groupKey(album, album.originalTitle || album.titles?.ja || '')) || [];
    if (remixes.length) sections.splice(4, 0, ['remixes', '리믹스', remixes.map((entry, index) => [`remix-${index + 1}`, remixIndex.variantLabel(entry.item)])]);
    // Nested sections can be represented as children, with numbers such as 4.1.
    function tocEntries(items, prefix = '') {
        return '<ol>' + items.map(([anchor, label, children], index) => {
            const number = prefix + (index + 1);
            return `<li><a href="#song-${anchor}"><span class="song-number">${number}.</span>${label}</a>${children ? tocEntries(children, number + '.') : ''}</li>`;
        }).join('') + '</ol>';
    }
    content.innerHTML = `
        <div class="song-top">
            <nav class="song-toc" aria-label="곡 페이지 목차"><details open><summary>목차</summary>${tocEntries(sections)}</details></nav>
            <aside class="song-facts" aria-label="BLUE SIGNAL 곡 정보">
                <img class="song-art" alt="BLUE SIGNAL 싱글 커버" width="350" height="350">
                <table aria-label="곡 제작 정보"><tbody>
                    <tr><th scope="row">작사</th><td>카나타 오카지마<br>슈야 마사요시</td></tr>
                    <tr><th scope="row">작곡</th><td>카나타 오카지마<br>슈야 마사요시</td></tr>
                    <tr><th scope="row">편곡</th><td>슈야 마사요시</td></tr>
                    <tr><th scope="row">가수</th><td><a href="members/kaf.html">카후 (花譜)</a></td></tr>
                    <tr><th scope="row">투고일</th><td><time datetime="2026-09-07">2026년 9월 7일</time></td></tr>
                </tbody></table>
            </aside>
        </div>
        ${sections.map(([anchor, label], index) => `<section class="song-section" id="song-${anchor}" aria-labelledby="song-heading-${anchor}"><h2 id="song-heading-${anchor}"><span class="song-number">${index + 1}.</span>${label}</h2><div class="song-section-body"></div></section>`).join('')}`;
    content.querySelector('.song-art').src = album.image;
    if (!album.image) {
        const placeholder = document.createElement('div');
        placeholder.className = 'song-art song-art-placeholder';
        placeholder.textContent = '이미지는 추후 추가 예정입니다.';
        placeholder.style.cssText = 'aspect-ratio:1;display:grid;place-items:center;background:var(--song-panel);color:var(--song-muted);font-size:16px;';
        content.querySelector('.song-art').replaceWith(placeholder);
    }
    if (isBlank) {
        const facts = content.querySelector('.song-facts');
        facts.setAttribute('aria-label', album.originalTitle + ' 곡 정보');
        content.querySelector('.song-art').alt = album.originalTitle + ' 커버';
        const tbody = facts.querySelector('tbody');
        tbody.replaceChildren();
        const appendEmptyRow = name => {
            const emptyRow = document.createElement('tr');
            const heading = document.createElement('th');
            heading.scope = 'row';
            heading.textContent = name;
            const cell = document.createElement('td');
            emptyRow.append(heading, cell);
            tbody.append(emptyRow);
        };
        ['작사', '작곡', '편곡'].forEach(appendEmptyRow);
        const row = document.createElement('tr');
        const label = document.createElement('th');
        label.scope = 'row';
        label.textContent = '가수';
        const value = document.createElement('td');
        (album.vocalistIds || album.artistIds || []).forEach((artistId, index) => {
            const artist = window.catalogData.artists[artistId];
            if (!artist) return;
            if (index) value.append(document.createElement('br'));
            const link = document.createElement(artist.linkDisabled ? 'span' : 'a');
            if (!artist.linkDisabled) link.href = `members/${artistId}.html`;
            const originalName = artist.names.ja || artist.names.en;
            link.textContent = /^[\x00-\x7F]+$/.test(originalName) ? originalName : `${artist.names.ko} (${originalName})`;
            value.append(link);
        });
        row.append(label, value);
        tbody.append(row);
        ['일러스트레이터', '투고일'].forEach(appendEmptyRow);
    }
    // Use the same artist palette as the album catalog, for every linked credit.
    content.querySelectorAll('.song-facts a[href^="members/"]').forEach(link => {
        const artistId = link.getAttribute('href').split('/').pop().replace('.html', '');
        const color = window.catalogData.artists?.[artistId]?.color;
        if (color) {
            link.classList.add('song-artist-link');
            link.style.setProperty('--song-artist-color', color);
        }
    });
    const setBody = (anchor, html) => { content.querySelector(`#song-${anchor} .song-section-body`).innerHTML = html; };
    if (isBlank) {
        const placeholders = {overview:'개요는',video:'영상은',lyrics:'가사는',releases:'음반 수록 정보는',remixes:'리믹스 정보는',live:'라이브 기록은',notes:'여담은'};
        sections.forEach(([anchor]) => setBody(anchor, `<p class="song-empty">${placeholders[anchor]} 추후 추가 예정입니다.</p>`));
        if (remixes.length) {
            const body = content.querySelector('#song-remixes .song-section-body');
            body.replaceChildren();
            remixes.forEach((entry, index) => {
                const row = document.createElement('section');
                row.id = `song-remix-${index + 1}`;
                row.className = 'song-section';
                const heading = document.createElement('h3');
                const number = document.createElement('span');
                number.className = 'song-number';
                number.textContent = `5.${index + 1}`;
                heading.append(number);
                if (entry.item.remixer?.artistId) {
                    const person = document.createElement('a');
                    person.href = `members/${entry.item.remixer.artistId}.html`;
                    person.textContent = entry.item.remixer.name;
                    heading.append(person, document.createTextNode(' Remix'));
                } else heading.append(document.createTextNode(remixIndex.variantLabel(entry.item)));
                const text = document.createElement('p');
                text.className = 'song-empty';
                text.textContent = '추후 추가 예정입니다.';
                row.append(heading, text);
                body.append(row);
            });
        }
        return;
    }
    // Editorial rule: omit generic introductions identifying who sang the song.
    setBody('overview', '<p>2026년 9월 6일에 진행한 카후의 5th ONE-MAN LIVE 숙성/심애 (순) INFO에서 첫 공개한 곡으로, 게임 《벽람항로》의 일본 서비스 9주년 기념곡이다.</p><p>2026년 9월 7일 싱글로 발매되었다.</p>');
    setBody('video', '<figure class="song-video"><iframe src="https://www.youtube-nocookie.com/embed/YeQ-9dFrXI4" title="花譜 BLUE SIGNAL 공식 음원" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><figcaption><a href="https://www.youtube.com/watch?v=YeQ-9dFrXI4" target="_blank" rel="noopener noreferrer">BLUE SIGNAL · YouTube에서 보기 ↗</a></figcaption></figure>');
    setBody('lyrics', '<p class="song-empty">가사는 추후 추가 예정입니다.</p>');
    if (location.protocol === 'file:') {
        setBody('video', '<figure class="song-video"><a class="song-video-launch" href="https://www.youtube.com/watch?v=YeQ-9dFrXI4" target="_blank" rel="noopener noreferrer" aria-label="BLUE SIGNAL 공식 음원 YouTube에서 재생"><img alt="BLUE SIGNAL 커버"><span>▶ YouTube에서 재생</span></a><figcaption>BLUE SIGNAL · Official Audio</figcaption></figure>');
        content.querySelector('.song-video-launch img').src = album.image;
    }
    setBody('releases', '<div class="song-release"><img class="song-release-art" alt="BLUE SIGNAL 싱글 커버"><table aria-label="BLUE SIGNAL 음반 수록 정보"><tbody><tr><th scope="row">음반명</th><td>BLUE SIGNAL</td></tr><tr><th scope="row">분류</th><td>싱글</td></tr><tr><th scope="row">발매일</th><td>2026년 9월 7일</td></tr></tbody></table></div>');
    content.querySelector('.song-release-art').src = album.image;
    setBody('notes', '<p>카후의 유튜브 채널에서 뮤직비디오 없이 Official Audio 형식으로 처음 업로드된 곡이다.</p>');
})();



