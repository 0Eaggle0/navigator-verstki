// Игра «Призрак»: на поле два слоя с одинаковыми фигурками. В #ghost — CSS-решение уровня
// (полупрозрачные «призраки»), в #play — CSS ученика. Уровень пройден, когда каждая фигурка
// встала на своего призрака (прямоугольники совпали с допуском).
import { srcdoc } from '../srcdoc';
import { spriteCss } from '../sprites';

export type GhostLevel = { task: string; target: string; start?: string; selector?: string; hint?: string; width?: number };

const TOLERANCE = 4; // px

const stageCss = (height: number) => `
html,body{margin:0;height:100%;overflow:hidden}
.stage{position:relative;height:${height}px}
.layer{position:absolute;inset:0}
.board{box-sizing:border-box;height:100%;padding:12px}
.board>*{box-sizing:border-box;min-width:40px;min-height:40px}
#ghost .board>*{opacity:.35;outline:2px dashed #fff;outline-offset:-2px;filter:grayscale(1)}
#ghost .board{background:none!important}
#play{pointer-events:none}
#play .board{background:none!important}
`;

// Документ для iframe. base — оформление поля. Уровни с другим селектором, пройденные раньше,
// уже «решены» на обоих слоях: так следующий уровень продолжает предыдущий.
// Уровни с тем же селектором пишут target целиком (вместе с прошлыми свойствами).
export function ghostDoc(html: string, base: string, levels: GhostLevel[], n: number, code: string, height: number) {
	const level = levels[n];
	const sel = level.selector ?? '.board';
	const before = levels
		.slice(0, n)
		.filter((l) => (l.selector ?? '.board') !== sel)
		.map((l) => `#ghost ${l.selector ?? ".board"},#play ${l.selector ?? ".board"}{${l.target}}`)
		.join('');
	const css = spriteCss() + stageCss(height) + base + before + `#ghost ${sel}{${level.target}}` + `#play ${sel}{${code}}`;
	const board = `<div class="board">${html}</div>`;
	const body = `<div class="stage"><div class="layer"><div class="board"></div></div><div class="layer" id="ghost">${board}</div><div class="layer" id="play">${board}</div></div>`;
	return srcdoc(body, css);
}

// Сколько фигурок стоит на своих призраках
export function score(doc: Document) {
	const a = [...doc.querySelectorAll('#play .board > *')];
	const b = [...doc.querySelectorAll('#ghost .board > *')];
	const hit = a.filter((el, i) => {
		const r = el.getBoundingClientRect();
		const g = b[i]?.getBoundingClientRect();
		return g && ['left', 'top', 'width', 'height'].every((k) => Math.abs(r[k as 'left'] - g[k as 'left']) <= TOLERANCE);
	}).length;
	return { hit, total: a.length };
}
