(() => {
    const today = new Date();
    let year = today.getFullYear(), month = today.getMonth(), listView = false;
    const enabled = new Set(['live', 'stream', 'event']);
    const labels = { live: 'LIVE', stream: 'STREAM', event: 'EVENT' };
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const events = window.scheduleEvents || [];
    const calendar = document.getElementById('calendar-view');
    const list = document.getElementById('schedule-list');
    const status = document.getElementById('schedule-status');
    const viewButton = document.getElementById('view-toggle');
    const pad = n => String(n).padStart(2, '0');
    const key = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function applyArtistColor(node, event) {
        if (!/^#[0-9a-f]{6}$/i.test(event.color || '')) return;
        node.classList.add('artist-colored');
        node.style.setProperty('--artist-color', event.color);
    }
    function artistHref(event) {
        return event.type === 'event' && /^[a-z0-9-]+$/.test(event.artistImage || '')
            ? `members/${event.artistImage}.html` : null;
    }
    function render() {
        const prefix = `${year}-${pad(month + 1)}-`;
        const expanded = events.flatMap(event => {
            if (!event.monthDay) return [event];
            return [year - 1, year, year + 1].map(y => ({ ...event, date: `${y}-${event.monthDay}` }));
        });
        const filtered = expanded.filter(e => enabled.has(e.type) && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
        const current = filtered.filter(e => e.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
        document.getElementById('schedule-month').textContent = `${year}년 ${month + 1}월`;
        calendar.hidden = listView;
        list.hidden = !listView;
        viewButton.textContent = listView ? '▦ 캘린더 보기' : '☷ 리스트 보기';
        viewButton.setAttribute('aria-pressed', String(listView));
        calendar.replaceChildren();
        list.replaceChildren();
        const table = el('table', 'calendar-table');
        table.setAttribute('aria-label', `${year}년 ${month + 1}월 일정`);
        const head = el('thead'), headRow = el('tr');
        ['월','화','수','목','금','토','일'].forEach(day => {
            const th = el('th', '', day); th.scope = 'col'; headRow.append(th);
        });
        head.append(headRow); table.append(head);
        const body = el('tbody');
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        const days = new Date(year, month + 1, 0).getDate();
        const cells = Math.ceil((offset + days) / 7) * 7;
        for (let i = 0; i < cells; i += 7) {
            const row = el('tr');
            for (let j = 0; j < 7; j++) {
                const date = new Date(year, month, i + j - offset + 1);
                const dateKey = key(date);
                const cell = el('td', date.getMonth() === month ? '' : 'outside-month');
                if (dateKey === key(today)) { cell.classList.add('is-today'); cell.setAttribute('aria-current', 'date'); }
                const number = el('time', 'day-number', date.getDate()); number.dateTime = dateKey;
                cell.append(number);
                filtered.filter(e => e.date === dateKey).forEach(event => {
                    const href = artistHref(event);
                    const badge = el(href ? 'a' : 'div', `calendar-event ${event.type}`, event.title);
                    if (href) badge.href = href;
                    badge.title = `${labels[event.type]} · ${event.title}${event.time ? ' · ' + event.time : ''}`;
                    applyArtistColor(badge, event);
                    cell.append(badge);
                });
                row.append(cell);
            }
            body.append(row);
        }
        table.append(body); calendar.append(table);
        current.forEach(event => {
            const date = new Date(`${event.date}T12:00:00`);
            const row = el('li', 'schedule-event-row');
            const href = artistHref(event);
            const dateBox = el('div', 'event-date');
            dateBox.append(el('strong', '', date.getDate()), el('span', '', weekdays[date.getDay()]));
            const portrait = el('div', `event-portrait ${event.type}`, event.type === 'event' ? '♪' : '♫');
            applyArtistColor(portrait, event);
            // A custom live/stream image takes priority over the artist portrait.
            const imageSources = event.image ? [event.image] : event.artistImage
                ? ['png', 'jpg', 'jpeg', 'webp'].map(ext => `images/artist/${event.artistImage}.${ext}`) : [];
            if (imageSources.length) {
                const image = el('img'); image.alt = ''; image.loading = 'lazy';
                let imageIndex = 0;
                image.addEventListener('error', () => {
                    imageIndex++;
                    if (imageIndex < imageSources.length) image.src = imageSources[imageIndex];
                    else image.remove();
                });
                image.src = imageSources[0];
                portrait.append(image);
            }
            const info = el('div', 'event-info');
            info.append(el('span', 'event-type', labels[event.type]), el('strong', 'event-title', event.title));
            if (event.description || event.time) info.append(el('p', 'event-description', [event.time, event.description].filter(Boolean).join(' · ')));
            if (href) {
                const link = el('a', 'schedule-event-link');
                link.href = href;
                link.append(dateBox, portrait, info);
                row.classList.add('has-event-link');
                row.append(link);
            } else {
                row.append(dateBox, portrait, info);
            }
            list.append(row);
        });
        status.textContent = current.length ? `이번 달 일정 ${current.length}개` : enabled.size ? '이번 달에 표시할 일정이 없습니다.' : 'LIVE, STREAM 또는 EVENT 필터를 켜주세요.';
    }
    document.getElementById('previous-month').addEventListener('click', () => { const d = new Date(year, month - 1, 1); year = d.getFullYear(); month = d.getMonth(); render(); });
    document.getElementById('next-month').addEventListener('click', () => { const d = new Date(year, month + 1, 1); year = d.getFullYear(); month = d.getMonth(); render(); });
    document.getElementById('today-button').addEventListener('click', () => { const d = new Date(); year = d.getFullYear(); month = d.getMonth(); render(); });
    viewButton.addEventListener('click', () => { listView = !listView; render(); });
    document.querySelectorAll('[data-event-filter]').forEach(button => button.addEventListener('click', () => {
        const type = button.dataset.eventFilter;
        enabled.has(type) ? enabled.delete(type) : enabled.add(type);
        button.setAttribute('aria-pressed', String(enabled.has(type))); render();
    }));
    render();
})();
