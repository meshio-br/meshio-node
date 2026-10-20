// Gera src/generated/events.ts a partir dos esquemas JSON em openapi/events/data.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'json-schema-to-typescript';

const dir = 'openapi/events/data';
const files = readdirSync(dir).filter((f) => f.endsWith('.schema.json') && !f.includes('common'));
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

// Resolve $ref locais (arquivos irmãos) por inclusão direta.
function inline(node) {
  if (Array.isArray(node)) return node.map(inline);
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string' && node.$ref.endsWith('.schema.json')) {
      const { $ref, ...rest } = node;
      const target = load($ref);
      delete target.$id;
      delete target.$schema;
      return inline({ ...target, ...rest });
    }
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = inline(v);
    return out;
  }
  return node;
}

const pascal = (s) =>
  s
    .split(/[._]/)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');

const emitted = new Set();
// Mantém só a primeira declaração de cada nome (esquemas comuns aparecem em vários arquivos).
function uniqueDecls(ts) {
  const chunks = ts.split(/\n(?=(?:\/\*\*[\s\S]*?\*\/\n)?export )/);
  return chunks
    .filter((chunk) => {
      const m = /export (?:interface|type) (\w+)/.exec(chunk);
      if (!m) return true;
      if (emitted.has(m[1])) return false;
      emitted.add(m[1]);
      return true;
    })
    .join('\n');
}

let out = '/* Arquivo gerado por scripts/generate-events.mjs. Não edite manualmente. */\n\n';
const map = [];
for (const f of files.sort()) {
  const type = f.replace('.schema.json', '');
  const name = `${pascal(type)}Data`;
  const schema = inline(load(f));
  delete schema.$id;
  schema.title = name;
  const ts = await compile(schema, name, {
    bannerComment: '',
    additionalProperties: true,
    declareExternallyReferenced: true,
    unknownAny: true,
    format: true,
  });
  // Remove assinaturas de índice duplicadas geradas ao mesclar allOf.
  const dedup = ts.replace(
    /(\n\s*\[k: string\]: unknown;)(?:\n\s*\[k: string\]: unknown;)+/g,
    '$1',
  );
  out += `${uniqueDecls(dedup)}\n`;
  map.push(`  '${type}': ${name};`);
}
out += `/** Mapa event_type → tipo de \`data\`. */\nexport interface EventDataMap {\n${map.join('\n')}\n}\n`;
writeFileSync('src/generated/events.ts', out);
console.log(`events.ts: ${map.length} tipos`);
