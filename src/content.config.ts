import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Одно правило автопроверки в разминке. Пишется во frontmatter шага.
// В каждом правиле обязательно поле fail — что показать ученику, если проверка не прошла.
const check = z.object({
	fail: z.string(),
	exists: z.string().optional(), // селектор: элемент должен быть на странице
	selector: z.string().optional(), // для style / text / attr
	style: z.record(z.string(), z.string()).optional(), // { display: "grid" } — getComputedStyle
	text: z.string().optional(), // элемент selector содержит этот текст
	attr: z.string().optional(), // у элемента selector есть этот атрибут (и он не пустой)
	count: z.object({ selector: z.string(), min: z.number() }).optional(),
	js: z.string().optional(), // тело функции (doc) => true/false, для редких случаев
});

// Дополнительные поля шага. Все необязательные, чтобы обычные страницы тоже проходили проверку.
const step = z.object({
	lesson: z.number().optional(),
	minutes: z.number().optional(),
	goal: z.string().optional(),
	soon: z.boolean().default(false), // шаг ещё не написан — показываем «Скоро»
	optional: z.boolean().default(false), // шаг можно пропустить, если команда отстаёт
	fast: z.string().optional(), // «быстрый путь» для отстающих: что взять готовым
	links: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
	warmup: z
		.object({
			task: z.string(),
			html: z.string().default(''),
			css: z.string().default(''),
			js: z.string().optional(), // есть поле (даже пустое) — в песочнице появятся JavaScript и консоль
			width: z.number().optional(), // ширина превью в px, например 375 — «как на телефоне»
			checks: z.array(check).default([]),
		})
		.optional(),
	// Мини-игра перед разминкой (Game.astro). Три типа:
	// ghost — фигурки из html нужно поставить на «призраков» — туда, куда их ставит CSS target.
	//         Ученик пишет CSS для selector (по умолчанию .board);
	// tags  — html — мини-страница, ученик кликает на элемент, подходящий под селектор target;
	// quiz  — вопрос с вариантами options (answer — номер верного, с 1). Без options ученик
	//         кликает строку в code, answer — номер строки.
	game: z
		.object({
			type: z.enum(['ghost', 'tags', 'quiz']),
			title: z.string(),
			html: z.string().default(''), // ghost: фигурки <i class="sp sp-cat"></i>; tags: мини-страница
			css: z.string().default(''), // оформление поля, ученик его не видит
			height: z.number().default(240), // высота поля в px
			levels: z.array(
				z.object({
					task: z.string(),
					target: z.string().optional(), // ghost: CSS-решение; tags: селектор, куда надо кликнуть
					start: z.string().optional(), // ghost: что уже написано в редакторе
					selector: z.string().optional(), // ghost: для какого селектора пишет ученик
					width: z.number().optional(), // ghost: ширина поля в px, например 375
					hint: z.string().optional(),
					code: z.string().optional(), // quiz: код к вопросу
					options: z.array(z.string()).optional(), // quiz: варианты ответа
					answer: z.number().optional(), // quiz: номер верного варианта или строки, с 1
					why: z.string().optional(), // quiz: объяснение после верного ответа
				})
			),
		})
		.optional(),
	checklist: z.array(z.string()).default([]),
	mistakes: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
	blocks: z.array(z.string()).default([]),
	// тема для задачника: html, css, flex, grid, adaptive, js. У шагов берётся из занятия (route.json)
	topic: z.enum(['html', 'css', 'flex', 'grid', 'adaptive', 'js']).optional(),
});

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: step }) }),
};
