document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.search.includes('mode=webapp')) return;
    iniciarApp();
});

async function iniciarApp() {
    const feed = document.getElementById('feed-container');
    feed.innerHTML = '<div style="padding:40px; text-align:center;">Sincronizando...</div>';

    try {
        const response = await fetch('/wp-json/wp/v2/posts?_embed');
        const posts = await response.json();

        feed.innerHTML = '';
        const urlsToSync = [];

        posts.forEach(post => {
            const imgUrl = post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
            urlsToSync.push(post.link); // Guardamos la URL para la auto-sinc

            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <img src="${imgUrl}" loading="lazy">
                <div class="post-card-info">
                    <h2>${post.title.rendered}</h2>
                </div>
            `;
            card.onclick = () => abrirLector(post.link);
            feed.appendChild(card);
        });

        // DISPARAR SINCRONIZACIÓN AUTOMÁTICA
        autoSincronizar(urlsToSync);

    } catch (e) {
        feed.innerHTML = '<div style="padding:40px; text-align:center;">Modo Offline Activo.</div>';
    }
}

function autoSincronizar(urls) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        document.getElementById('sync-icon').style.color = '#b30000'; // Indicador visual de trabajo
        navigator.serviceWorker.controller.postMessage({
            type: 'CLONE_POSTS',
            urls: urls
        });
        setTimeout(() => { document.getElementById('sync-icon').style.color = '#555'; }, 3000);
    }
}

async function abrirLector(url) {
    const reader = document.getElementById('reader-view');
    reader.style.display = 'block';
    reader.innerHTML = '<div style="padding:40px;">Purificando...</div>';

    try {
        const cache = await caches.open('praxma-native-v2');
        let response = await cache.match(url);
        if (!response) response = await fetch(url);

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // EXTRACCIÓN QUIRÚRGICA: Solo texto e imágenes, nada de basura
        const rawContent = doc.querySelector('.post-content') || doc.querySelector('.entry-content') || doc.querySelector('article');
        const cleanElements = rawContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, img');
        let cleanHTML = '';
        cleanElements.forEach(el => {
            el.removeAttribute('class');
            el.removeAttribute('style');
            cleanHTML += el.outerHTML;
        });

        reader.innerHTML = `
            <div class="reader-header" onclick="document.getElementById('reader-view').style.display='none'"> ← VOLVER</div>
            <div class="reader-body">
                <h1>${doc.querySelector('h1').innerText}</h1>
                ${cleanHTML}
            </div>
        `;
    } catch (e) {
        reader.innerHTML = '<div style="padding:40px;">No disponible offline.</div>';
    }
}

