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
};

function pass(doc: Document, c: Check): boolean {
	if (c.exists) return !!doc.querySelector(c.exists);
	if (c.count) return doc.querySelectorAll(c.count.selector).length >= c.count.min;
	if (c.js) return !!new Function('doc', c.js)(doc);
	const el = c.selector ? doc.querySelector(c.selector) : null;
	if (!el) return false;
	if (c.style) {
		// getComputedStyle отдаёт «посчитанные» значения: цвета в rgb(), размеры в px
		const cs = doc.defaultView!.getComputedStyle(el);
		if (!Object.entries(c.style).every(([prop, value]) => cs.getPropertyValue(prop).trim() === value)) return false;
	}
	if (c.text && !el.textContent?.includes(c.text)) return false;
	if (c.attr && !el.getAttribute(c.attr)?.trim()) return false;
	return true;
}

// Возвращает список проверок с результатом. Ошибка внутри правила = проверка не прошла.
export function runChecks(doc: Document, checks: Check[]) {
	return checks.map((c) => {
		let ok = false;
		try {
			ok = pass(doc, c);
		} catch (e) {
			// Недописанный код ученика часто роняет правило — это просто «не прошло».
			// Модератору при локальной разработке (npm run dev) показываем подробности.
			if (import.meta.env.DEV) console.warn('Ошибка в правиле проверки', c, e);
		}
		return { ok, message: c.fail };
	});
}
