// Автопроверки разминки. Правила пишутся во frontmatter шага (поле warmup.checks),
// сюда приходит документ из iframe с кодом ученика.

export type Check = {
	fail: string;
	exists?: string;
	selector?: string;
	style?: Record<string, string>;
	text?: string;
	attr?: string;
	count?: { selector: string; min: number };
	js?: string;
	widths?: number[];
};

// Браузер сам «дозакрывает» теги, поэтому незакрытый тег ищем в исходном тексте:
// открывающих <tag больше, чем закрывающих </tag>. Возвращает имя первого такого тега.
const PAIRED = ['header', 'nav', 'main', 'section', 'footer', 'article', 'div', 'ul', 'ol', 'li', 'p', 'a', 'h1', 'h2', 'h3', 'button', 'form', 'label', 'dialog'];

export function unclosedTag(html: string): string | null {
	const code = html.replace(/<!--[\s\S]*?-->/g, '');
	const count = (re: RegExp) => (code.match(re) || []).length;
	return PAIRED.find((t) => count(new RegExp(`<${t}[\\s>]`, 'gi')) > count(new RegExp(`</${t}\\s*>`, 'gi'))) ?? null;
}

// Возвращает список проверок с результатом. Ошибка внутри правила = проверка не прошла.
// Этот код также выполняется в iframe. Все зависимости функции локальны.
export function runChecks(doc: Document, checks: Check[], logs: string[] = []) {
	function pass(c: Check): boolean {
		if (c.exists) return !!doc.querySelector(c.exists);
		if (c.count) return doc.querySelectorAll(c.count.selector).length >= c.count.min;
		if (c.js) return !!new Function('doc', 'logs', c.js)(doc, logs);
		const el = c.selector ? doc.querySelector(c.selector) : null;
		if (!el) return false;
		if (c.style) {
			const cs = doc.defaultView!.getComputedStyle(el);
			if (!Object.entries(c.style).every(([prop, value]) => cs.getPropertyValue(prop).trim() === value)) return false;
		}
		if (c.text && !el.textContent?.includes(c.text)) return false;
		if (c.attr && !el.getAttribute(c.attr)?.trim()) return false;
		return true;
	}
	return checks.map((c) => {
		let ok = false;
		try {
			ok = pass(c);
		} catch {
			// Правило может упасть, пока ученик редактирует код.
		}
		return { ok, message: c.fail };
	});
}
