// Маленький ZIP без сжатия (метод «store») — чтобы скачать готовый сайт одной папкой.
// Без библиотек: CRC32 + заголовки по спецификации ZIP.

const table = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc32 = (data: Uint8Array) => {
	let c = 0xffffffff;
	for (const b of data) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};

export type ZipFile = { name: string; data: Uint8Array | string };

export function zip(files: ZipFile[]): Blob {
	const enc = new TextEncoder();
	const parts: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	for (const f of files) {
		const name = enc.encode(f.name);
		const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
		const crc = crc32(data);
		// Локальный заголовок файла (30 байт + имя)
		const head = new DataView(new ArrayBuffer(30));
		head.setUint32(0, 0x04034b50, true);
		head.setUint16(4, 20, true);
		head.setUint16(6, 0x0800, true); // имена в UTF-8 — кириллица не ломается
		head.setUint32(14, crc, true);
		head.setUint32(18, data.length, true);
		head.setUint32(22, data.length, true);
		head.setUint16(26, name.length, true);
		parts.push(new Uint8Array(head.buffer), name, data);
		// Запись в оглавлении архива (46 байт + имя)
		const dir = new DataView(new ArrayBuffer(46));
		dir.setUint32(0, 0x02014b50, true);
		dir.setUint16(4, 20, true);
		dir.setUint16(6, 20, true);
		dir.setUint16(8, 0x0800, true);
		dir.setUint32(16, crc, true);
		dir.setUint32(20, data.length, true);
		dir.setUint32(24, data.length, true);
		dir.setUint16(28, name.length, true);
		dir.setUint32(42, offset, true);
		central.push(new Uint8Array(dir.buffer), name);
		offset += 30 + name.length + data.length;
	}
	const size = central.reduce((n, p) => n + p.length, 0);
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, files.length, true);
	end.setUint16(10, files.length, true);
	end.setUint32(12, size, true);
	end.setUint32(16, offset, true);
	return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}
