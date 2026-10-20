/**
 * Converte um valor em micros (string, 1 real = 1.000.000 micros) para reais
 * como string decimal exata, sem passar por ponto flutuante.
 * Ex.: microsToReais("1234500") === "1.2345"; microsToReais("-500000", 2) === "-0.50".
 */
export function microsToReais(micros: string | bigint, decimals?: number): string {
  const s = typeof micros === 'bigint' ? micros.toString() : String(micros).trim();
  if (!/^-?\d+$/.test(s)) throw new TypeError(`Valor em micros inválido: ${s}`);
  let value = BigInt(s);
  const negative = value < 0n;
  if (negative) value = -value;
  let intPart = value / 1_000_000n;
  let frac = (value % 1_000_000n).toString().padStart(6, '0');
  if (decimals !== undefined) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
      throw new RangeError('decimals deve estar entre 0 e 6');
    }
    // Arredondamento meio-para-cima sobre o valor absoluto.
    const scale = 10n ** BigInt(6 - decimals);
    let scaled = value / scale;
    if ((value % scale) * 2n >= scale) scaled += 1n;
    const unit = 10n ** BigInt(decimals);
    intPart = scaled / unit;
    frac = decimals === 0 ? '' : (scaled % unit).toString().padStart(decimals, '0');
  } else {
    frac = frac.replace(/0+$/, '');
  }
  const body = frac ? `${intPart}.${frac}` : `${intPart}`;
  return negative && body !== '0' && !/^0\.?0*$/.test(body) ? `-${body}` : body;
}

/** Converte reais (string decimal, ex. "12.34") para micros (string). */
export function reaisToMicros(reais: string): string {
  const s = String(reais).trim();
  const m = /^(-?)(\d+)(?:\.(\d{1,6}))?$/.exec(s);
  if (!m) throw new TypeError(`Valor em reais inválido: ${s}`);
  const v = BigInt(m[2]!) * 1_000_000n + BigInt((m[3] ?? '').padEnd(6, '0') || '0');
  return (m[1] && v !== 0n ? -v : v).toString();
}
