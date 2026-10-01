/* Police pixel originale 5x7 (monospace, cellules 1,2:1) + rendu avec contour et italique.
 * Aspect MESURÉ sur la vidéo : capitales ~7 px de haut, avance ~8,4 unités, contour sombre. */
(function () {
  const G = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'J': ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    ':': ['.', '#', '.', '.', '.', '#', '.'],
    ',': ['..', '..', '..', '..', '..', '##', '##', '.#', '#.'],   // OBSERVÉ : la virgule descend sous la ligne
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
    ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '[': ['###', '#..', '#..', '#..', '#..', '#..', '###'],
    ']': ['###', '..#', '..#', '..#', '..#', '..#', '###'],
    '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
    '∞': ['.......', '.......', '.##.##.', '#..#..#', '.##.##.', '.......', '.......'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    'É': ['...#.', '#####', '#....', '####.', '#....', '#....', '#####'],   // v032 : accents du générateur de missions (GÉNÉRATION…)
    'È': ['.#...', '#####', '#....', '####.', '#....', '#....', '#####'],
  };

  const Font = {};
  const cache = new Map();
  const ROWS = 7;

  Font.cellW = 1.2;                 // largeur d'un pixel de police relative à sa hauteur
  Font.advance = 7;                 // avance monospace en pixels de police (5 + 2)

  function glyphCanvas(ch, px, color, outline, cw) {
    const key = ch + '|' + px.toFixed(2) + '|' + color + '|' + (outline || '') + '|' + (cw || '');
    let c = cache.get(key);
    if (c) return c;
    const rows = G[ch] || G['?'];
    const gw = rows[0].length;
    const pw = px * (cw || Font.cellW), ph = px;
    const o = outline ? Math.max(1, Math.round(px * 0.55)) : 0;
    c = document.createElement('canvas');
    c.width = Math.ceil(gw * pw + o * 2 + 1);
    c.height = Math.ceil(rows.length * ph + o * 2 + 1);
    const g = c.getContext('2d');
    const paint = (col, grow) => {
      g.fillStyle = col;
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < gw; x++) {
        if (rows[y][x] !== '#') continue;
        g.fillRect(Math.floor(o + x * pw - grow), Math.floor(o + y * ph - grow), Math.ceil(pw + grow * 2), Math.ceil(ph + grow * 2));
      }
    };
    if (outline) paint(outline, o);
    paint(color, 0);
    c.glyphW = gw; c.o = o;
    if (cache.size > 4000) cache.clear();
    cache.set(key, c);
    return c;
  }

  Font.measurePixel = function (text, px) {
    return text.length * Font.advance * px * Font.cellW - 2 * px * Font.cellW;
  };

  /* Dessine un texte. segments : chaîne, ou tableau [{t:'TEXTE', c:'#fff'}] pour les couleurs multiples.
   * opts : align ('left'|'center'|'right'), outline (couleur), skew (italique), alpha. */
  Font.drawPixel = function (ctx, segments, x, y, px, color, opts) {
    opts = opts || {};
    if (typeof segments === 'string') segments = [{ t: segments, c: color }];
    let total = 0;
    for (const s of segments) total += s.t.length;
    const cwv = opts.cw || Font.cellW;
    const adv = Font.advance * px * cwv;
    const width = total * adv - 2 * px * cwv;
    let cx = x;
    if (opts.align === 'center') cx = x - width / 2;
    else if (opts.align === 'right') cx = x - width;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.skew) { ctx.translate(0, y + ROWS * px); ctx.transform(1, 0, opts.skew, 1, 0, 0); ctx.translate(0, -(y + ROWS * px)); }
    for (const s of segments) {
      const col = s.c || color;
      for (const raw of s.t) {
        const ch = raw === 'x' ? 'X' : raw.toUpperCase();
        if (ch !== ' ') {
          const gc = glyphCanvas(ch, px, col, opts.outline === undefined ? CC.CONFIG.hud.colors.outline : opts.outline, opts.cw);
          const gw = gc.glyphW * px * cwv;
          const off = (5 * px * cwv - gw) / 2;   // centre les glyphes étroits dans la cellule
          ctx.drawImage(gc, Math.round(cx + off - gc.o), Math.round(y - gc.o));
        }
        cx += adv;
      }
    }
    ctx.restore();
    return width;
  };


  /* v034 : police MODERNE des menus et du HUD du CLASSIQUE — capitales grasses et italiques, contour sombre épais (lisible sur
   * n'importe quel décor, comme les jeux mobiles), remplace la police pixel qui jurait avec les graphismes. Mêmes règles de taille :
   * `px` reste « un pixel de la police 5×7 » (capitales ≈ 7 px de haut), donc toute la mise en page existante est conservée.
   * Le HUD des niveaux d'origine (DÉFI) garde la police pixel (opts.pixel) : il reproduit celui de la vidéo. */
  const STACK = '"Arial Black","Segoe UI Black","Helvetica Neue",Impact,"Trebuchet MS",sans-serif';
  const FS = 9.4;                                    // taille de police pour 1 px de « pixel »
  let mctx = null; const mcache = new Map();
  const wAt100 = (t) => {
    let w = mcache.get(t);
    if (w === undefined) { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = '900 italic 100px ' + STACK; w = mctx.measureText(t).width; if (mcache.size > 3000) mcache.clear(); mcache.set(t, w); }
    return w;
  };
  // v038j : habillage PIXEL — la police 5×7 en pixels CARRES (cw = 1) à taille entière devient la police de toute l'interface du CLASSIQUE
  Font.skinPixel = false;
  const snap = (px) => (px >= 3 ? Math.floor(px) : Math.max(1, Math.floor(px * 2) / 2));   // jamais plus large que la taille demandée (les mises en page s'appuient sur measure(texte, 1) × px)
  Font.measure = function (text, px, pixel) {
    if (pixel) return Font.measurePixel(text, px);
    if (Font.skinPixel) { const p = snap(px); return String(text).length * Font.advance * p - 2 * p; }
    return wAt100(String(text).toUpperCase()) * (px * FS / 100);
  };
  Font.draw = function (ctx, segments, x, y, px, color, opts) {
    opts = opts || {};
    if (opts.pixel) return Font.drawPixel(ctx, segments, x, y, px, color, opts);
    if (Font.skinPixel) return Font.drawPixel(ctx, segments, x, y, snap(px), color, Object.assign({}, opts, { cw: 1, skew: 0 }));
    if (typeof segments === 'string') segments = [{ t: segments, c: color }];
    const size = px * FS, widths = segments.map((s) => wAt100(s.t.toUpperCase()) * size / 100);
    let width = 0; for (const w of widths) width += w;
    let cx = x; if (opts.align === 'center') cx = x - width / 2; else if (opts.align === 'right') cx = x - width;
    const outline = opts.outline === undefined ? CC.CONFIG.hud.colors.outline : opts.outline;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.font = '900 italic ' + size.toFixed(1) + 'px ' + STACK; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const base = y + px * 7.2;
    if (opts.skew) { ctx.translate(0, base); ctx.transform(1, 0, opts.skew * 0.6, 1, 0, 0); ctx.translate(0, -base); }
    let px0 = cx;
    segments.forEach((sg, i) => {
      const t = sg.t.toUpperCase();
      if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = Math.max(2, px * 2.6); ctx.strokeText(t, px0, base); }
      ctx.fillStyle = sg.c || color; ctx.fillText(t, px0, base);
      px0 += widths[i];
    });
    ctx.restore();
    return width;
  };

  Font.glyphs = G;
  CC.Font = Font;
})();
