// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import moderatorLock from './src/integrations/moderator-lock.mjs';

// Список занятий — в src/data/route.json. Шаги каждого занятия лежат в src/content/docs/lesson-N/
const route = JSON.parse(readFileSync('./src/data/route.json', 'utf-8'));
// Коды доступа к разделу модератора: локально — файл .env, на GitHub — секрет MODERATOR_CODES
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// SITE и BASE_PATH подставляет GitHub Actions (см. .github/workflows/deploy.yml).
// Локально сайт открывается с корня: http://localhost:4321/
export default defineConfig({
	site: process.env.SITE,
	base: process.env.BASE_PATH || '/',
	integrations: [
		// Шифрует раздел модератора. Стоит раньше Starlight, чтобы поиск не проиндексировал открытый текст
		moderatorLock(env.MODERATOR_CODES),
		starlight({
			title: 'Навигатор вёрстки',
			description: 'Шаг за шагом от макета в Figma до готовой страницы. Проектная школа ОмГТУ.',
			defaultLocale: 'root',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			customCss: ['./src/styles/custom.css'],
			// Роль из профиля ставим на <html> до отрисовки — чтобы ссылки модератора не мелькали у учеников
			head: [
				{
					tag: 'script',
					content:
						"try{document.documentElement.dataset.role=(JSON.parse(localStorage.getItem('nav-v1')||'{}').profile||{}).role||'student'}catch(e){document.documentElement.dataset.role='student'}",
				},
			],
			// Заголовок шага: добавляем «Цель · N мин» над страницей шага
			components: {
				PageTitle: './src/components/StepHeader.astro',
				Header: './src/components/Header.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{ label: 'Главная', link: '/' },
				{ label: 'Маршрут', link: '/route/' },
				// Шаги подтягиваются из папок сами. Порядок — поле sidebar.order в файле шага.
				...route.lessons.map((l) => ({
					label: `Мир ${l.n}. ${l.title}`,
					collapsed: l.n > 1,
					items: [{ autogenerate: { directory: `lesson-${l.n}` } }],
				})),
				{ label: "Задачник", collapsed: true, items: [{ autogenerate: { directory: "tasks" } }] },
				{ label: 'Шпаргалки и ссылки', link: '/cheatsheets/' },
				{ label: 'Блоки для вашего сайта', items: [{ autogenerate: { directory: 'blocks' } }] },
				{ label: 'Для модератора', link: '/moderator/' },
			],
		}),
	],
});
