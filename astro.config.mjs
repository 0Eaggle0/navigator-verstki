// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
			components: { PageTitle: './src/components/StepHeader.astro' },
			sidebar: [
				{ label: 'Главная', link: '/' },
				{ label: 'Маршрут', link: '/route/' },
				// Шаги подтягиваются из папок сами. Порядок — поле sidebar.order в файле шага.
				{ label: 'Занятие 1 · Каркас', items: [{ autogenerate: { directory: 'lesson-1' } }] },
				{ label: 'Занятие 2 · Стили', collapsed: true, items: [{ autogenerate: { directory: 'lesson-2' } }] },
				{ label: 'Занятие 3 · Сетки', collapsed: true, items: [{ autogenerate: { directory: 'lesson-3' } }] },
				{ label: 'Занятие 4 · Адаптив и сдача', collapsed: true, items: [{ autogenerate: { directory: 'lesson-4' } }] },
				{ label: 'Задачник', link: '/tasks/' },
				{ label: 'Шпаргалки и ссылки', link: '/cheatsheets/' },
				{ label: 'Блоки для вашего сайта', items: [{ autogenerate: { directory: 'blocks' } }] },
				{ label: 'Для модератора', link: '/moderator/' },
			],
		}),
	],
});
