(() => {
    const id = new URLSearchParams(location.search).get('id');
    const album = (window.catalogData?.albums || []).find(item => item.id === id);
    const title = document.getElementById('album-title');
    const subtitle = document.getElementById('album-subtitle');
    if (!album) {
        title.textContent = '앨범을 찾을 수 없습니다.';
        subtitle.hidden = true;
        return;
    }
    const original = album.originalTitle || album.titles?.ja || album.titles?.en || album.titles?.ko;
    title.textContent = original;
    document.title = original + ' | 카미츠바키 아카이브';
    const korean = album.titles?.ko;
    subtitle.hidden = !korean || korean === original || /^[\x00-\x7F]+$/.test(original);
    subtitle.textContent = korean || '';
})();
