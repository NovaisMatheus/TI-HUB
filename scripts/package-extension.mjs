import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const source = resolve('extensions/chrome-1doc');
const manifest = JSON.parse(readFileSync(resolve(source, 'manifest.json'), 'utf8'));
const names = readdirSync(source)
  .filter((name) => /\.(?:js|json|html|css)$/.test(name))
  .sort();
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
const local = [],
  central = [];
let offset = 0;
for (const name of names) {
  const filename = Buffer.from(name),
    data = readFileSync(resolve(source, name)),
    crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(33, 12); // Fixed DOS date 1980-01-01 makes the package reproducible.
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(filename.length, 26);
  local.push(header, filename, data);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(33, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(filename.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, filename);
  offset += header.length + filename.length + data.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(names.length, 8);
end.writeUInt16LE(names.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const output = resolve('apps/web/public/downloads');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'ugb-ti-hub-1doc.zip'), Buffer.concat([...local, directory, end]));
writeFileSync(
  resolve(output, 'extensao.json'),
  JSON.stringify({ version: manifest.version, filename: 'ugb-ti-hub-1doc.zip' }) + '\n',
);
console.log(
  `Extensão ${manifest.version}: pacote público gerado com ${names.length} arquivos, sem credenciais.`,
);
import { Buffer } from 'node:buffer';
