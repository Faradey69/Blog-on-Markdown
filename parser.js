// parser.js - парсер Markdown в HTML

// Экранирование HTML спецсимволов
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function parseMarkdown(markdown) {
    let html = markdown;

    // 1. Блоки кода ```lang ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const langAttr = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${langAttr}>${escapeHtml(code.trim())}</code></pre>`;
    });

    // 2. Горизонтальная линия ---
    html = html.replace(/^---+$/gm, '<hr>');

    // 3. Заголовки (h1-h3)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 4. Жирный текст **text** или __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // 5. Курсив *text* или _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // 6. Инлайн-код `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 7. Ссылки [текст](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 8. Ненумерованные списки
    html = html.replace(/((?:^[-*] .+?\n?)+)/gm, (block) => {
        const items = block.trim().split('\n').map(line => {
            return '<li>' + line.replace(/^[-*] /, '') + '</li>';
        }).join('');
        return '<ul>' + items + '</ul>';
    });

    // 9. Нумерованные списки
    html = html.replace(/((?:^\d+\. .+?\n?)+)/gm, (block) => {
        const items = block.trim().split('\n').map(line => {
            return '<li>' + line.replace(/^\d+\. /, '') + '</li>';
        }).join('');
        return '<ol>' + items + '</ol>';
    });

    // 10. Цитаты
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 11. Параграфы (строки, не являющиеся заголовками, списками, блоками кода и т.д.)
    const lines = html.split('\n');
    const result = [];
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Пропускаем пустые строки
        if (trimmed === '') {
            if (inParagraph) {
                result.push('</p>');
                inParagraph = false;
            }
            result.push('');
            continue;
        }

        // Проверяем, является ли строка уже обработанным HTML-элементом
        const isHtmlTag = /^<\/?[a-z][a-z0-9]*[>\s]/i.test(trimmed);

        if (isHtmlTag) {
            if (inParagraph) {
                result.push('</p>');
                inParagraph = false;
            }
            result.push(line);
        } else {
            if (!inParagraph) {
                result.push('<p>' + line);
                inParagraph = true;
            } else {
                result.push(line);
            }
        }
    }

    if (inParagraph) {
        result.push('</p>');
    }

    html = result.join('\n');

    // 12. Очистка пустых параграфов
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

// Функция для генерации оглавления из HTML
export function generateTOC(html) {
    const headingRegex = /<h2>(.*?)<\/h2>/g;
    const headings = [];
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
        const title = match[1];
        const id = title.toLowerCase().replace(/[^\w\u0400-\u04FF]+/g, '-');
        headings.push({ title, id });
    }

    if (headings.length === 0) return '';

    let tocHtml = '<div class="table-of-contents"><h4>📑 Оглавление</h4><ul>';
    for (const heading of headings) {
        tocHtml += `<li><a href="#${heading.id}">${heading.title}</a></li>`;
    }
    tocHtml += '</ul></div>';

    // Добавляем id к заголовкам
    for (const heading of headings) {
        const regex = new RegExp(`<h2>${escapeRegex(heading.title)}</h2>`, 'g');
        html = html.replace(regex, `<h2 id="${heading.id}">${heading.title}</h2>`);
    }

    return { tocHtml, htmlWithIds: html };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Функция для подсчёта времени чтения
export function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
}