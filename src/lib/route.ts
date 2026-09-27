// Маршрут собирается из файлов шагов: папка lesson-N = занятие N.
// Время берётся из поля minutes в каждом шаге.
import { getCollection } from 'astro:content';

export const LESSONS: Record<number, string> = {
	1: 'Каркас',
	2: 'Стили',
	3: 'Сетки',
	4: 'Адаптив и сдача',
};

// Сколько времени у команд: 7 пар по 80 минут
export const LIMIT_MINUTES = 7 * 80;

export async function getRoute() {
	const steps = (await getCollection('docs', (e) => e.data.lesson !== undefined)).sort(
		(a, b) =>
			a.data.lesson! - b.data.lesson! ||
			(a.data.sidebar.order ?? 0) - (b.data.sidebar.order ?? 0) ||
			a.id.localeCompare(b.id)
	);
	const lessons = Object.entries(LESSONS).map(([n, title]) => {
		const own = steps.filter((s) => s.data.lesson === Number(n));
		return { n: Number(n), title, steps: own, minutes: own.reduce((sum, s) => sum + (s.data.minutes ?? 0), 0) };
	});
	const total = lessons.reduce((sum, l) => sum + l.minutes, 0);
	if (total > LIMIT_MINUTES) {
		console.warn(`[маршрут] ${total} мин — больше лимита ${LIMIT_MINUTES} мин (7 пар × 80). Сократите шаги.`);
	}
	return { lessons, steps, total };
}

// Ссылка с учётом base (на GitHub Pages сайт лежит в подпапке)
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
