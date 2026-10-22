// Игровые механики: звёзды за уровень и значки. Всё считается из прогресса в браузере.
// Список уровней страница кладёт в <script id="nav-levels" type="application/json"> (см. Header.astro).
import { load, update, type Progress } from './storage';

export type Level = { id: string; lesson: number; order: number; warmup: boolean; js: boolean };

export function getLevels(): Level[] | null {
	const el = document.getElementById('nav-levels');
	return el ? JSON.parse(el.textContent!) : null;
}

// Звёзды уровня: разминка решена, шаг пройден, подсказки не открывались (считается только у пройденного шага)
export function stars(p: Progress, l: Level) {
	const done = p.done.includes(l.id);
	return (
		(l.warmup && p.solved.includes(l.id) ? 1 : 0) + (done ? 1 : 0) + (done && !p.hints.includes(l.id) ? 1 : 0)
	);
}
export const maxStars = (l: Level) => (l.warmup ? 3 : 2);

const byLesson = (levels: Level[], n: number) => levels.filter((l) => l.lesson === n);
const allDone = (p: Progress, ls: Level[]) => ls.length > 0 && ls.every((l) => p.done.includes(l.id));

// Значки. rule получает прогресс и уровни (уровней может не быть — тогда правило, где они нужны, не срабатывает)
export const BADGES: { id: string; title: string; how: string; rule: (p: Progress, ls: Level[] | null) => boolean }[] = [
	{ id: 'case', title: 'Персонаж выбран', how: 'Выбери кейс команды на главной', rule: (p) => !!p.case },
	{ id: 'first', title: 'Первая разминка', how: 'Реши любую разминку', rule: (p) => p.solved.length > 0 },
	{ id: 'ten', title: 'Десять разминок', how: 'Реши 10 разминок или задач', rule: (p) => p.solved.length >= 10 },
	{
		id: 'clean',
		title: 'Чистая работа',
		how: 'Собери 3 звезды на уровне: без подсказок',
		rule: (p, ls) => !!ls?.some((l) => l.warmup && stars(p, l) === 3),
	},
	{
		id: 'world',
		title: 'Урок пройден',
		how: 'Пройди все уровни одного урока',
		rule: (p, ls) => !!ls && [1, 2, 3, 4, 5, 6, 7].some((n) => allDone(p, byLesson(ls, n))),
	},
	{
		id: 'js',
		title: 'Первый скрипт',
		how: 'Реши разминку на JavaScript',
		rule: (p, ls) => !!ls?.some((l) => l.js && p.solved.includes(l.id)),
	},
	{
		id: 'minimum',
		title: 'Минимум',
		how: 'Пройди уроки 1–5: главная свёрстана и адаптивна',
		rule: (p, ls) => !!ls && [1, 2, 3, 4, 5].every((n) => allDone(p, byLesson(ls, n))),
	},
	{ id: 'gamer', title: 'Игроман', how: 'Пройди 10 мини-игр', rule: (p) => p.games.length >= 10 },
	{ id: 'final', title: 'Игра пройдена', how: 'Пройди все уровни всех уроков', rule: (p, ls) => !!ls && allDone(p, ls) },
];

// Проверяем значки и показываем тост за каждый новый
export function checkBadges() {
	const levels = getLevels();
	const p = load();
	const fresh = BADGES.filter((b) => !p.badges.includes(b.id) && b.rule(p, levels));
	if (!fresh.length) return;
	update((q) => (q.badges = [...q.badges, ...fresh.map((b) => b.id)]));
	fresh.forEach((b, i) => setTimeout(() => toast('Новый значок', b.title), i * 1800));
}

export function toast(title: string, text: string) {
	const el = document.createElement('div');
	el.className = 'px-toast';
	el.setAttribute('role', 'status');
	el.innerHTML = '<span class="px-toast__icon" aria-hidden="true">★</span><span><b></b><span></span></span>';
	el.querySelector('b')!.textContent = title;
	el.querySelector('span span')!.textContent = text;
	// Несколько тостов подряд — стопкой, а не друг на друге
	el.style.bottom = `${1 + document.querySelectorAll('.px-toast').length * 5}rem`;
	document.body.append(el);
	setTimeout(() => el.remove(), 4000);
}
