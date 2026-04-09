// app.js - главный модуль приложения

import { addRoute, initRouter, navigate } from './router.js';
import { parseMarkdown, generateTOC, calculateReadingTime } from './parser.js';

let posts = [];
let postsCache = new Map(); // Кэш для статей

// Загрузка метаданных статей
async function loadMeta() {
    try {
        const response = await fetch('posts/meta.json');
        if (!response.ok) throw new Error('Не удалось загрузить meta.json');
        posts = await response.json();
        return posts;
    } catch (error) {
        console.error('Ошибка загрузки метаданных:', error);
        return [];
    }
}

// Форматирование даты
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Получение избранных статей из localStorage
function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

// Сохранение избранных статей
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Переключение избранного
function toggleFavorite(postId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(postId);
    
    if (index === -1) {
        favorites.push(postId);
    } else {
        favorites.splice(index, 1);
    }
    
    saveFavorites(favorites);
    return favorites.includes(postId);
}

// Проверка, в избранном ли статья
function isFavorite(postId) {
    return getFavorites().includes(postId);
}

// Рендер главной страницы
function renderHome(app) {
    if (!posts.length) {
        app.innerHTML = '<div class="loading-spinner">Нет доступных статей</div>';
        return;
    }

    const favorites = getFavorites();

    app.innerHTML = `
        <div class="posts-grid">
            ${posts.map(post => `
                <article class="card">
                    <h2><a href="#/post/${post.id}">${escapeHtml(post.title)}</a></h2>
                    <time datetime="${post.date}">${formatDate(post.date)}</time>
                    <p>${escapeHtml(post.description)}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <a href="#/post/${post.id}" class="btn">Читать →</a>
                        <button class="favorite-btn ${favorites.includes(post.id) ? 'active' : ''}" data-id="${post.id}">
                            ${favorites.includes(post.id) ? 'В избранном' : 'В избранное'}
                        </button>
                    </div>
                </article>
            `).join('')}
        </div>
    `;

    // Добавляем обработчики для кнопок избранного на главной
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const postId = parseInt(btn.dataset.id);
            const isNowFavorite = toggleFavorite(postId);
            
            if (isNowFavorite) {
                btn.classList.add('active');
                btn.textContent = 'В избранном';
            } else {
                btn.classList.remove('active');
                btn.textContent = 'В избранное';
            }
        });
    });
}

// Рендер страницы статьи
async function renderPost(app, id) {
    const postId = Number(id);
    const post = posts.find(p => p.id === postId);

    if (!post) {
        app.innerHTML = `
            <div class="not-found">
                <h2>404</h2>
                <p>Статья не найдена</p>
                <a href="#/" class="btn">Вернуться на главную</a>
            </div>
        `;
        return;
    }

    // Показываем загрузку
    app.innerHTML = '<div class="loading-spinner">Загрузка статьи...</div>';

    try {
        // Проверяем кэш
        let md = postsCache.get(post.file);
        
        if (!md) {
            const response = await fetch(post.file);
            if (!response.ok) throw new Error('Не удалось загрузить статью');
            md = await response.text();
            postsCache.set(post.file, md);
        }

        // Парсим Markdown
        let html = parseMarkdown(md);
        
        // Генерируем оглавление
        const { tocHtml, htmlWithIds } = generateTOC(html);
        html = htmlWithIds;
        
        // Считаем время чтения
        const readingTime = calculateReadingTime(md);
        
        const isFav = isFavorite(postId);

        app.innerHTML = `
            <article class="post">
                <button class="back-btn" id="backBtn">← Назад к списку</button>
                <div class="post-header">
                    <h1>${escapeHtml(post.title)}</h1>
                    <div class="post-meta">
                        <time datetime="${post.date}">${formatDate(post.date)}</time>
                        <span class="reading-time">${readingTime} мин чтения</span>
                        <button class="favorite-btn ${isFav ? 'active' : ''}" id="favoritePostBtn">
                            ${isFav ? 'В избранном' : 'В избранное'}
                        </button>
                    </div>
                </div>
                ${tocHtml}
                <div class="post-content">
                    ${html}
                </div>
            </article>
        `;

        // Обработчик кнопки назад
        document.getElementById('backBtn').addEventListener('click', () => {
            navigate('#/');
        });

        // Обработчик кнопки избранного
        const favBtn = document.getElementById('favoritePostBtn');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const isNowFavorite = toggleFavorite(postId);
                if (isNowFavorite) {
                    favBtn.classList.add('active');
                    favBtn.textContent = 'В избранном';
                } else {
                    favBtn.classList.remove('active');
                    favBtn.textContent = 'В избранное';
                }
            });
        }

        // Добавляем кнопки копирования для блоков кода
        addCopyButtons();

        // Плавный скролл к якорям
        document.querySelectorAll('.table-of-contents a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').slice(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки статьи:', error);
        app.innerHTML = `
            <div class="not-found">
                <h2>Ошибка</h2>
                <p>Не удалось загрузить статью</p>
                <a href="#/" class="btn">Вернуться на главную</a>
            </div>
        `;
    }
}

// Добавление кнопок копирования для блоков кода
function addCopyButtons() {
    document.querySelectorAll('.post pre').forEach(pre => {
        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.textContent = 'Копировать';
        
        button.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;
            
            try {
                await navigator.clipboard.writeText(text);
                button.textContent = 'Скопировано!';
                setTimeout(() => {
                    button.textContent = 'Копировать';
                }, 2000);
            } catch (err) {
                button.textContent = 'Ошибка';
                setTimeout(() => {
                    button.textContent = 'Копировать';
                }, 2000);
            }
        });
        
        pre.style.position = 'relative';
        pre.appendChild(button);
    });
}

// Простое экранирование HTML
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Инициализация приложения
async function init() {
    await loadMeta();
    
    addRoute('#/', renderHome);
    addRoute('#/about', (app) => {
        app.innerHTML = `
            <article class="post">
                <h1>О блоге</h1>
                <p>Этот блог создан в рамках учебного проекта для демонстрации возможностей:</p>
                <ul>
                    <li>Чистый JavaScript без фреймворков</li>
                    <li>Парсинг Markdown с помощью регулярных выражений</li>
                    <li>Клиентская маршрутизация через History API / hashchange</li>
                    <li>Кэширование статей и сохранение избранного в localStorage</li>
                    <li>Адаптивный дизайн</li>
                </ul>
                <p>Все статьи написаны в формате Markdown и загружаются динамически.</p>
                <button class="back-btn" onclick="window.location.hash='#/'">← На главную</button>
            </article>
        `;
    });
    addRoute('#/post/:id', renderPost);
    
    initRouter();
}

// Запускаем приложение
init();