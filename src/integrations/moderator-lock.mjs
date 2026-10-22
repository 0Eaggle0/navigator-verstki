// Шифрует раздел модератора при сборке (npm run build).
// Всё, что внутри <mod-secret>…</mod-secret> (компонент ModSecret.astro), заменяется зашифрованным блоком.
// Открыть его можно кодом доступа: коды задаёт Владислав в переменной MODERATOR_CODES
// (локально — файл .env, на GitHub — Settings → Secrets → Actions). Коды через запятую или с новой строки.
//
// Как устроено: при каждой сборке — новый случайный ключ раздела (AES-256-GCM). Он шифрует содержимое.
// Сам ключ сохраняется отдельно «под каждым кодом»: ключ из кода (PBKDF2, 150 000 повторов) шифрует ключ раздела.
// Убрали код из списка — после пересборки он перестаёт подходить.
import { webcrypto as crypto } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ITER = 150000;
const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString('base64');

async function kek(code, salt) {
	const base = await crypto.subtle.importKey('raw', enc.encode(code.trim()), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

const htmlFiles = (dir) =>
	readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? htmlFiles(p) : f.endsWith('.html') ? [p] : [];
	});

export default function moderatorLock(codesRaw = '') {
	const codes = codesRaw
		.split(/[,\n]/)
		.map((c) => c.trim())
		.filter(Boolean);
	return {
		name: 'moderator-lock',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const root = dir.pathname.replace(/^\/([A-Za-z]:)/, '$1'); // file:///D:/… → D:/…
				const files = htmlFiles(decodeURIComponent(root)).filter((f) => readFileSync(f, 'utf8').includes('<mod-secret'));
				if (!files.length) return;
				if (!codes.length) logger.warn('MODERATOR_CODES не задан — раздел модератора будет закрыт без возможности открыть');

				// Один ключ раздела на сборку: один код открывает все страницы модератора
				const raw = crypto.getRandomValues(new Uint8Array(32));
				const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
				const keys = [];
				for (const code of codes) {
					const salt = crypto.getRandomValues(new Uint8Array(16));
					const iv = crypto.getRandomValues(new Uint8Array(12));
					const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kek(code, salt), raw);
					keys.push({ s: b64(salt), i: b64(iv), c: b64(ct) });
				}

				for (const f of files) {
					let html = readFileSync(f, 'utf8');
					const re = /<mod-secret([^>]*)>([\s\S]*?)<\/mod-secret>/g;
					const parts = [...html.matchAll(re)];
					for (const m of parts) {
						const iv = crypto.getRandomValues(new Uint8Array(12));
						const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(m[2]));
						const payload = b64(enc.encode(JSON.stringify({ v: 1, it: ITER, keys, i: b64(iv), c: b64(ct) })));
						html = html.replace(m[0], `<mod-secret${m[1]} data-payload="${payload}"></mod-secret>`);
					}
					writeFileSync(f, html);
				}
				logger.info(`раздел модератора зашифрован: страниц ${files.length}, кодов ${codes.length}`);
			},
		},
	};
}
