// Прогресс ученика в localStorage. Если хранилище недоступно (приватный режим,
// запрет браузера), сайт работает как обычно, просто ничего не запоминает.

const KEY = 'nav-v1';

// Профиль — офлайн-регистрация: хранится только в этом браузере
export type Profile = {
	name: string; // имя или ник
	team: string; // номер или название команды
	role: 'student' | 'moderator';
	part?: number; // какую часть сайта делает ученик (1–4, см. src/data/parts.json)
};

export type Progress = {
	profile?: Profile;
	case?: string; // выбранный кейс (id из cases.json) или 'own' — своя тема
	caseTitle?: string; // название своей темы, если case === 'own'
	last?: string; // адрес последнего открытого шага
	done: string[]; // id пройденных шагов (например "lesson-1/1-3-skeleton")
	checklist: Record<string, number[]>; // отмеченные пункты чек-листа
	drafts: Record<string, { html: string; css: string; js?: string }>; // черновики песочницы
	solved: string[]; // id страниц, где разминка решена
	hints: string[]; // id шагов, где открывали подсказку (для звезды «без подсказок»)
	badges: string[]; // полученные значки
	games: string[]; // id страниц, где пройдена мини-игра
};

export function load(): Progress {
	const empty: Progress = { done: [], checklist: {}, drafts: {}, solved: [], hints: [], badges: [], games: [] };
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
