// Small safe expression compiler for the custom equation generator (no eval).
const FN: Record<string, (...a: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: Math.sqrt, exp: Math.exp, log: Math.log, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, sign: Math.sign, atan: Math.atan, asin: Math.asin, acos: Math.acos, sinh: Math.sinh,
  cosh: Math.cosh, tanh: Math.tanh, pow: Math.pow, min: Math.min, max: Math.max, atan2: Math.atan2,
  fract: (x) => x - Math.floor(x), mod: (a, b) => ((a % b) + b) % b,
};
const CONST: Record<string, number> = { pi: Math.PI, PI: Math.PI, tau: Math.PI * 2, e: Math.E };
type F = (e: Record<string, number>) => number;

function compile(src: string): F {
  const tk = src.match(/\d*\.?\d+(?:e[+-]?\d+)?|[A-Za-z_]\w*|\*\*|[-+*/^(),%]|\S/g) || [];
  let i = 0;
  const pk = () => tk[i], nx = () => tk[i++];
  const want = (t: string) => { if (nx() !== t) throw Error(`Expected "${t}"`); };
  function add(): F {
    let l = mul();
    while (pk() === '+' || pk() === '-') { const op = nx(), r = mul(), L = l; l = op === '+' ? (e) => L(e) + r(e) : (e) => L(e) - r(e); }
    return l;
  }
  function mul(): F {
    let l = pw();
    while (pk() === '*' || pk() === '/' || pk() === '%') {
      const op = nx(), r = pw(), L = l;
      l = op === '*' ? (e) => L(e) * r(e) : op === '/' ? (e) => L(e) / r(e) : (e) => L(e) % r(e);
    }
    return l;
  }
  function pw(): F {
    const b = un();
    if (pk() === '^' || pk() === '**') { nx(); const x = pw(); return (e) => Math.pow(b(e), x(e)); }
    return b;
  }
  function un(): F {
    if (pk() === '-') { nx(); const v = un(); return (e) => -v(e); }
    if (pk() === '+') { nx(); return un(); }
    return pr();
  }
  function pr(): F {
    const t = nx();
    if (t === undefined) throw Error('Unexpected end');
    if (/^[\d.]/.test(t)) { const v = parseFloat(t); return () => v; }
    if (t === '(') { const v = add(); want(')'); return v; }
    if (/^[A-Za-z_]/.test(t)) {
      if (pk() === '(') {
        nx();
        const f = FN[t];
        if (!f) throw Error(`Unknown function ${t}`);
        const args: F[] = [];
        if (pk() !== ')') { args.push(add()); while (pk() === ',') { nx(); args.push(add()); } }
        want(')');
        return (e) => f(...args.map((a) => a(e)));
      }
      if (t in CONST) { const v = CONST[t]; return () => v; }
      if (t.length === 1 && 'tabcdT'.includes(t)) return (e) => e[t];
      throw Error(`Unknown name ${t}`);
    }
    throw Error(`Unexpected "${t}"`);
  }
  const f = add();
  if (i < tk.length) throw Error(`Unexpected "${tk[i]}"`);
  return f;
}

const cache = new Map<string, { f: F | null; err: string }>();
export function compiled(src: string) {
  let c = cache.get(src);
  if (!c) {
    try { c = { f: compile(src), err: '' }; } catch (e: any) { c = { f: null, err: e.message }; }
    if (cache.size > 200) cache.clear();
    cache.set(src, c);
  }
  return c;
}
