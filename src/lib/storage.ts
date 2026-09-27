// Прогресс ученика в localStorage. Если хранилище недоступно (приватный режим,
// запрет браузера), сайт работает как обычно, просто ничего не запоминает.

const KEY = 'nav-v1';

export type Progress = {
	case?: string; // выбранный кейс
	last?: string; // адрес последнего открытого шага
	done: string[]; // id пройденных шагов (например "lesson-1/1-3-skeleton")
	checklist: Record<string, number[]>; // отмеченные пункты чек-листа
	drafts: Record<string, { html: string; css: string; js?: string }>; // черновики песочницы
	solved: string[]; // id страниц, где разминка решена
	hints: string[]; // id шагов, где открывали подсказку (для звезды «без подсказок»)
	badges: string[]; // полученные значки
};

export function load(): Progress {
	const empty: Progress = { done: [], checklist: {}, drafts: {}, solved: [], hints: [], badges: [] };
	try {
		return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
	} catch {
		return empty;
	}
}

// Меняем прогресс через функцию: update(p => { p.done.push(id) })
export function update(fn: (p: Progress) => void) {
	const p = load();
	fn(p);
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
	} catch {
		// нет доступа к хранилищу — молча продолжаем
	}
	// Сообщаем странице: звёзды и значки пересчитываются (слушатель в StepHeader.astro)
	window.dispatchEvent(new Event('nav-progress'));
	return p;
}
