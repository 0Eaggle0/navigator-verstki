// Пиксельные спрайты: рисунок — строки, каждая буква — цвет из палитры, «.» — пусто.
// svg('cat') — разметка <svg> для страницы, spriteCss() — классы .sp-cat и т. п. для превью в iframe.

const K = '#0e0d26'; // контур

const SPRITES = {
	// Проводник «Байт»
	byte: {
		pal: { k: K, b: '#8fd8ff', B: '#3d8fd0', w: '#ffffff', y: '#ffc930', r: '#f07a4a' },
		rows: [
			'.......yy.......',
			'.......kk.......',
			'...kkkkkkkkkk...',
			'..kbbbbbbbbbbk..',
			'..kbwwbbbbwwbk..',
			'..kbwkbbbbwkbk..',
			'..kbbbbbbbbbbk..',
			'..kbrbkkkkbrbk..',
			'..kBbbbbbbbbBk..',
			'...kkkkkkkkkk...',
			'....kbbbbbbk....',
			'..kkbbyybbbbkk..',
			'.kbkbbyybbbbkbk.',
			'.kkkbbbbbbbbkkk.',
			'....kBBkkBBk....',
			'....kkk..kkk....',
		],
	},
	cat: {
		pal: { k: K, o: '#f5a14a', O: '#c66a1f', w: '#ffffff', p: '#ff8fb1' },
		rows: [
			'.k........k.',
			'.kk......kk.',
			'.kokkkkkkok.',
			'kooooooooook',
			'kowkoooowkok',
			'koooopppoook',
			'kOoookkoooOk',
			'.kOooooooOk.',
			'..kkkkkkkk..',
			'.kooooooook.',
			'.koOooooOok.',
			'.kkk.kk.kkk.',
		],
	},
	dog: {
		pal: { k: K, b: '#c08552', B: '#6e4122', w: '#ffffff', p: '#ff6b8a' },
		rows: [
			'kk........kk',
			'kBk......kBk',
			'kBkkkkkkkkBk',
			'kBbbbbbbbbBk',
			'.kbwkbbwkbk.',
			'.kbbbkkbbbk.',
			'.kbbkppkbbk.',
			'..kbbbbbbk..',
			'..kkkkkkkk..',
			'.kbbbbbbbbk.',
			'.kbBbbbbBbk.',
			'.kkk.kk.kkk.',
		],
	},
	frog: {
		pal: { k: K, g: '#5cc85c', G: '#2f8a2f', w: '#ffffff', r: '#ff8fb1' },
		rows: [
			'..kk....kk..',
			'.kwwk..kwwk.',
			'.kwkgkkgkwk.',
			'kggggggggggk',
			'kGggggggggGk',
			'kgkrrrrrrkgk',
			'.kgkkkkkkgk.',
			'..kggggggk..',
			'.kgGggggGgk.',
			'kggk....kggk',
			'kkkk....kkkk',
		],
	},
	coin: {
		pal: { k: '#7a5600', y: '#ffc930', Y: '#c98f00', w: '#fff6c8' },
		rows: ['..kkkk..', '.kyyyyk.', 'kyywyyYk', 'kywyyyYk', 'kyyyyyYk', 'kyyyyYYk', '.kYYYYk.', '..kkkk..'],
	},
	star: {
		pal: { k: '#7a5600', y: '#ffc930' },
		rows: ['...kk...', '..kyyk..', 'kkkyykkk', 'kyyyyyyk', '.kyyyyk.', '.kyyyyk.', 'kyykkyyk', 'kkk..kkk'],
	},
	tree: {
		pal: { k: K, g: '#5cc85c', G: '#2f8a2f', t: '#8a5a2b' },
		rows: ['...kkkk...', '..kggggk..', '.kggGgggk.', 'kgggggGgGk', 'kgGgggggGk', '.kgggGggk.', '..kkttkk..', '....tt....', '....tt....', '...kttk...'],
	},
	pine: {
		pal: { k: K, g: '#2f8a5a', G: '#1d5c3c', t: '#6b4422' },
		rows: ['....kk....', '...kggk...', '...kgGk...', '..kgggGk..', '..kgGggk..', '.kggggGgk.', '.kgGgggGk.', 'kgggGggggk', 'kkkkttkkkk', '....tt....'],
	},
	flower: {
		pal: { r: '#ff6b8a', y: '#ffc930', g: '#3f9b3f' },
		rows: ['.r.', 'ryr', '.r.', '.g.', 'gg.'],
	},
	rock: {
		pal: { k: K, s: '#9a95c2', S: '#605c90' },
		rows: ['..kkk...', '.kssSk..', 'kssssSk.', 'ksSsssSk', 'kkkkkkkk'],
	},
	tower: {
		pal: { k: K, s: '#8b88b3', S: '#55517f', w: '#ffc930' },
		rows: ['k.k.k.k.', 'kkkkkkkk', '.kssssk.', '.ksSssk.', '.kswwsk.', '.ksSssk.', '.kssSsk.', '.ksskkk.', '.kssk.k.', 'kkkkkkkk'],
	},
	planet: {
		pal: { k: K, p: '#c39bff', P: '#7a5cc8', r: '#ffc930' },
		rows: ['...kkkk...', '..kppppk..', 'rrkpPpppkr', '.rrrrrrrr.', 'r.kppPpk.r', '..kpppPk..', '...kkkk...'],
	},
	lily: {
		pal: { g: '#5cc85c', G: '#2f8a2f', r: '#ff8fb1' },
		rows: ['.gggg..', 'gggGgg.', 'gGggr.g', '.gggg..'],
	},
	fence: {
		pal: { k: K, w: '#e8d2a6', W: '#b89a62' },
		rows: ['.k...k..', 'kwk.kwk.', 'kwkkkwkk', 'kwWWkwWW', 'kwkkkwkk', 'kwk.kwk.', 'kWk.kWk.'],
	},
} satisfies Record<string, { pal: Record<string, string>; rows: string[] }>;

export type SpriteName = keyof typeof SPRITES;

// SVG-разметка спрайта. Каждый пиксель — <rect>; соседние одинаковые в строке склеиваем
export function svg(name: SpriteName, size?: number, cls = '') {
	const { pal, rows } = SPRITES[name];
	const w = Math.max(...rows.map((r) => r.length));
	const h = rows.length;
	let rects = '';
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; ) {
			const c = row[x];
			let len = 1;
			while (row[x + len] === c) len++;
			const fill = (pal as Record<string, string>)[c];
			if (fill) rects += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${fill}"/>`;
			x += len;
		}
	});
	const dims = size ? ` width="${size}" height="${Math.round((size * h) / w)}"` : '';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${dims} class="${cls}" aria-hidden="true" shape-rendering="crispEdges">${rects}</svg>`;
}

// Классы для превью игр: <i class="sp sp-cat"></i> — картинка-спрайт по центру блока
export const spriteCss = () =>
	(Object.keys(SPRITES) as SpriteName[])
		.map((n) => `.sp-${n}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg(n))}")}`)
		.join('') + '.sp{background-position:center;background-repeat:no-repeat;background-size:contain;image-rendering:pixelated}';
