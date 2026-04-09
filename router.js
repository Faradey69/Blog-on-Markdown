// router.js - маршрутизация через hashchange

const routes = {};

export function addRoute(pattern, handler) {
    routes[pattern] = handler;
}

export function navigate(hash) {
    window.location.hash = hash;
}

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash || '#/';
    const app = document.getElementById('app');

    // Точное совпадение
    if (routes[hash]) {
        routes[hash](app);
        updateActiveNav(hash);
        return;
    }

    // Динамические маршруты: #/post/:id
    for (const pattern in routes) {
        const regex = new RegExp('^' + pattern.replace(/:([\w]+)/g, '([^/]+)') + '$');
        const match = hash.match(regex);

        if (match) {
            routes[pattern](app, match[1]);
            updateActiveNav(hash);
            return;
        }
    }

    // 404 - страница не найдена
    app.innerHTML = `
        <div class="not-found">
            <h2>404</h2>
            <p>Страница не найдена</p>
            <a href="#/" class="btn">Вернуться на главную</a>
        </div>
    `;
}

function updateActiveNav(currentHash) {
    document.querySelectorAll('[data-nav]').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentHash || (currentHash === '#/' && href === '#')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}