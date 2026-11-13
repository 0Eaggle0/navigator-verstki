import { runChecks, type Check } from './checks';

type Result = ReturnType<typeof runChecks>[number];

export function checkFrame(
	template: HTMLIFrameElement, markup: string, checks: Check[], width: number,
	storage: Record<string, string>, signal: AbortSignal,
) {
	const token = crypto.getRandomValues(new Uint32Array(4)).join('-');
	const encode = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
	const bootstrap = `<script>(() => {
		document.currentScript.remove();
		const data = new Map(Object.entries(${encode(storage)}));
		Object.defineProperty(window, 'localStorage', { value: {
			get length() { return data.size },
			key: i => [...data.keys()][i] ?? null,
			getItem: k => data.get(String(k)) ?? null,
			setItem: (k, v) => data.set(String(k), String(v)),
			removeItem: k => data.delete(String(k)),
			clear: () => data.clear()
		}});
		const logs = [];
		console.log = (...args) => logs.push(args.map(String).join(' '));
		let scriptError = false;
		addEventListener('error', e => { if (e instanceof ErrorEvent) scriptError = true });
		addEventListener('load', async () => {
			await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
			for (let attempt = 0; innerWidth !== ${width} && attempt < 30; attempt++) {
				await new Promise(resolve => setTimeout(resolve, 16));
			}
			const results = (${runChecks.toString()})(document, ${encode(checks)}, logs);
			parent.postMessage({ token: ${encode(token)}, results, scriptError, width: innerWidth }, '*');
		}, { once: true });
	})();</script>`;

	return new Promise<Result[]>((resolve, reject) => {
		// Новый кадр получает размер до загрузки, без viewport от предыдущей проверки.
		const frame = template.cloneNode(false) as HTMLIFrameElement;
		const cleanup = () => {
			clearTimeout(timeout);
			window.removeEventListener('message', receive);
			signal.removeEventListener('abort', abort);
			frame.remove();
		};
		const abort = () => { cleanup(); reject(signal.reason); };
		const receive = (event: MessageEvent) => {
			if (event.source !== frame.contentWindow || event.data?.token !== token) return;
			const { results, scriptError } = event.data;
			if (!Array.isArray(results) || results.length !== checks.length ||
				!results.every(result => typeof result?.ok === 'boolean' && typeof result.message === 'string')) return;
			cleanup();
			if (event.data.width !== width) {
				reject(new Error('Не удалось установить ширину проверки.'));
				return;
			}
			resolve(scriptError ? [...results, { ok: false, message: 'Исправь ошибку JavaScript в редакторе.' }] : results);
		};
		const timeout = window.setTimeout(() => {
			cleanup();
			reject(new Error('Проверка не завершилась. Проверь код и попробуй ещё раз.'));
		}, 8000);
		if (signal.aborted) return abort();
		window.addEventListener('message', receive);
		signal.addEventListener('abort', abort, { once: true });
		frame.style.width = width + 'px';
		template.after(frame);
		// Chrome должен рассчитать геометрию родителя до загрузки srcdoc, иначе проверки видят старую раскладку.
		frame.getBoundingClientRect();
		frame.srcdoc = markup.replace('<head>', () => '<head>' + bootstrap);
	});
}
