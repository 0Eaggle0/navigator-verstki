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
			width: z.number().optional(), // ширина превью в px, например 375 — «как на телефоне»
			checks: z.array(check).default([]),
		})
		.optional(),
	checklist: z.array(z.string()).default([]),
	mistakes: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
	blocks: z.array(z.string()).default([]),
});

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: step }) }),
};
