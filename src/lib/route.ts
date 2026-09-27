// Маршрут: список занятий — в src/data/route.json, шаги — файлы в папках lesson-N.
// Время берётся из поля minutes в каждом шаге.
import { getCollection } from 'astro:content';
import route from '~/data/route.json';

export const LESSONS = Object.fromEntries(route.lessons.map((l) => [l.n, l.title])) as Record<number, string>;

// Сколько времени у команд: 7 пар по 80 минут
export const PER_LESSON = route.minutesPerLesson;
export const LIMIT_MINUTES = route.lessons.length * PER_LESSON;

let warned = false; // предупреждаем в логе сборки один раз, а не на каждой странице

export async function getRoute() {
	const steps = (await getCollection('docs', (e) => e.data.lesson !== undefined)).sort(
		(a, b) =>
			a.data.lesson! - b.data.lesson! ||
			(a.data.sidebar.order ?? 0) - (b.data.sidebar.order ?? 0) ||
			a.id.localeCompare(b.id)
	);
	const lessons = route.lessons.map((l) => {
		const own = steps.filter((s) => s.data.lesson === l.n);
		return { ...l, steps: own, minutes: own.reduce((sum, s) => sum + (s.data.minutes ?? 0), 0) };
	});
	const total = lessons.reduce((sum, l) => sum + l.minutes, 0);

	const warnings = [
		...lessons.filter((l) => l.minutes !== PER_LESSON).map((l) => `занятие ${l.n}: ${l.minutes} мин вместо ${PER_LESSON}`),
		...steps.filter((s) => !LESSONS[s.data.lesson!]).map((s) => `шаг ${s.id}: занятия ${s.data.lesson} нет в route.json`),
		...(total > LIMIT_MINUTES ? [`весь маршрут ${total} мин — больше лимита ${LIMIT_MINUTES}`] : []),
	];
	if (warnings.length && !warned) {
		warned = true;
		warnings.forEach((w) => console.warn('[маршрут] ' + w));
	}
	return { lessons, steps, total, warnings };
}

// Ссылка с учётом base (на GitHub Pages сайт лежит в подпапке)
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
