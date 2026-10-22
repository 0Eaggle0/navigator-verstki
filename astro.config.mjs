// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';

// Список занятий — в src/data/route.json. Шаги каждого занятия лежат в src/content/docs/lesson-N/
const route = JSON.parse(readFileSync('./src/data/route.json', 'utf-8'));

// SITE и BASE_PATH подставляет GitHub Actions (см. .github/workflows/deploy.yml).
// Локально сайт открывается с корня: http://localhost:4321/
export default defineConfig({
	site: process.env.SITE,
	base: process.env.BASE_PATH || '/',
	integrations: [
		starlight({
			title: 'Навигатор вёрстки',
			description: 'Шаг за шагом от макета в Figma до готовой страницы. Проектная школа ОмГТУ.',
			defaultLocale: 'root',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			customCss: ['./src/styles/custom.css'],
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
