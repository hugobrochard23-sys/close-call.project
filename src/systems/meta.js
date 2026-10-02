/* v082 : MÉTA-PROGRESSION — tout ce qui donne envie de revenir en dehors des parties :
 *   ETOILES par niveau (1 = fini, 2 = 65 % des cibles, 3 = 90 %) · PASS DE SAISON (40 paliers, piste gratuite et piste premium, XP gagnée en jouant)
 *   · MODULES d'équipement (5 modules à 5 niveaux, 2 emplacements ; trouvés dans des caisses vertes lâchées par les hélicoptères dorés, dans le pass et les cadeaux)
 *   · QUOTIDIEN : cadeau de connexion sur 7 jours, 3 missions du jour, coffre gratuit toutes les 4 h.
 * Données : game.save.meta. Aucune horloge serveur : la date et l'heure du téléphone. */
(function () {
  const U = CC.U;
  const MODS = {
    warhead: { name: 'OGIVE', rar: 'EPIQUE', w: 1, icon: 'flame', col: '#ff9a3a', desc: (l) => 'DETRUIT TOUT A ' + (12 + 4 * l) + ' M' },
    shield:  { name: 'BOUCLIER', rar: 'RARE', w: 2, icon: 'shield', col: '#8fd0ff', desc: (l) => 'ARRETE ' + (1 + Math.floor(l / 3)) + ' MISSILE' + (l >= 3 ? 'S' : '') },
    siphon:  { name: 'SIPHON', rar: 'RARE', w: 2, icon: 'tank', col: '#6aff9a', desc: (l) => '+' + 15 * l + '% ESSENCE / CIBLE' },
    radar:   { name: 'RADAR', rar: 'COMMUN', w: 3, icon: 'target', col: '#ff6a5a', desc: (l) => 'REPERAGE A ' + (150 + 40 * l) + ' M' },
    fortune: { name: 'FORTUNE', rar: 'COMMUN', w: 3, icon: 'nut', col: '#ffd23a', desc: (l) => '+' + 10 * l + '% ECROUS' },
  };
  const RAR = { COMMUN: '#9ad0ff', RARE: '#c07aff', EPIQUE: '#ffb040' };
  const IDS = Object.keys(MODS), TIERS = 40, XP_PER = 100, SLOTS = 2;
  const pad = (n) => String(n).padStart(2, '0');
  const dayStr = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dayNum = (s) => Math.floor(Date.parse(s + 'T12:00:00') / 86400000);
  const need = (lvl) => [2, 4, 8, 16][lvl - 1] || 0;

  // missions du jour : kind = événement de jeu
  const DM = {
    kills:  { text: (n) => 'DETRUIS ' + n + ' CIBLES', gen: (r) => 14 + Math.floor(r() * 4) * 6 },
    golden: { text: (n) => 'ABATS ' + n + ' HELICO' + (n > 1 ? 'S' : '') + ' DORE' + (n > 1 ? 'S' : ''), gen: (r) => 1 + Math.floor(r() * 2) },
    wins:   { text: (n) => 'TERMINE ' + n + ' NIVEAU' + (n > 1 ? 'X' : ''), gen: (r) => 1 + Math.floor(r() * 2) },
    boss:   { text: (n) => 'VAINCS ' + n + ' BOSS', gen: () => 1 },
    stars:  { text: (n) => 'GAGNE ' + n + ' ETOILES', gen: (r) => 3 + Math.floor(r() * 3) },
  };
  const GIFT = [{ t: 'nuts', n: 30 }, { t: 'nuts', n: 50 }, { t: 'crate', n: 1 }, { t: 'nuts', n: 90 }, { t: 'nuts', n: 140 }, { t: 'crate', n: 2 }, { t: 'nuts', n: 300 }];

  class Meta {
    constructor(game) {
      this.game = game; const S = game.save, d = { stars: {}, pass: { season: '', xp: 0, premium: false, free: {}, prem: {} }, gift: { last: '', streak: 0 }, dm: { day: '', list: [] }, chest: { next: 0 }, mods: { owned: {}, eq: [] } };
      S.meta = S.meta || {};
      for (const k of Object.keys(d)) S.meta[k] = Object.assign({}, d[k], S.meta[k] || {});
      this.M = S.meta; this.drops = [];
      this.season(); this.dailyRoll();
      if (/[?&]premium=1/.test(location.search)) this.M.pass.premium = true;
    }
    save() { this.game.writeSave(); }

    // ---------- étoiles ----------
    starsOf(n) { return this.M.stars[n] || 0; }
    total() { let t = 0; for (const k in this.M.stars) t += this.M.stars[k]; return t; }
    starsFor(win, ratio) { return win ? 1 + (ratio >= 0.65 ? 1 : 0) + (ratio >= 0.9 ? 1 : 0) : 0; }
    setStars(n, s) { const old = this.starsOf(n); if (s > old) { this.M.stars[n] = s; this.event('stars', s - old); return s - old; } return 0; }

    // ---------- pass de saison ----------
    season() { const cur = dayStr().slice(0, 7), P = this.M.pass; if (P.season !== cur) { P.season = cur; P.xp = 0; P.free = {}; P.prem = {}; P.premium = false; } }
    get tier() { return Math.min(TIERS, Math.floor(this.M.pass.xp / XP_PER)); }
    get passXp() { return this.M.pass.xp; }
    addPassXp(n) { n = Math.max(0, Math.round(n)); if (n) this.M.pass.xp = Math.min(TIERS * XP_PER, this.M.pass.xp + n); return n; }
    // récompenses du palier t (1‥40) : { free, prem }
    rewards(t) {
      const free = t % 10 === 0 ? { t: 'crate', n: 2 } : t % 5 === 0 ? { t: 'crate', n: 1 } : { t: 'nuts', n: 20 + 3 * t };
      let prem;
      if (t % 10 === 0) { const sk = (CC.Skins && CC.Skins.list.filter((s) => s.tier !== 'base' && s.id !== 'stock')) || [], s = sk[(t / 10 - 1) * 3 % Math.max(1, sk.length)]; prem = s ? { t: 'skin', id: s.id } : { t: 'nuts', n: 500 }; }
      else if (t % 5 === 0) prem = { t: 'crate', n: 3 };
      else if (t === 1) prem = { t: 'mod', id: 'shield', n: 1 };
      else prem = { t: 'nuts', n: 40 + 6 * t };
      return { free, prem };
    }
    claimed(track, t) { return !!this.M.pass[track][t]; }
    canClaim(track, t) { return t <= this.tier && !this.claimed(track, t) && (track === 'free' || this.M.pass.premium); }
    claim(track, t) { if (!this.canClaim(track, t)) return null; this.M.pass[track][t] = 1; const out = this.give(this.rewards(t)[track]); this.save(); return out; }
    claimAll() { const out = []; for (let t = 1; t <= this.tier; t++) for (const tr of ['free', 'prem']) { const r = this.claim(tr, t); if (r) out.push(r); } return out; }
    claimableCount() { let n = 0; for (let t = 1; t <= this.tier; t++) for (const tr of ['free', 'prem']) if (this.canClaim(tr, t)) n++; return n; }
    buyPremium() { const link = CC.CONFIG.shop.passLink; if (!link) return 'no-link'; this.game.save.pendingPurchase = 'pass'; this.save(); try { window.location.href = link + (link.indexOf('?') < 0 ? '?' : '&') + 'client_reference_id=pass&utm_content=pass&utm_source=coldimpact'; } catch (e) { /* ignoré */ } return 'redirect'; }

    // ---------- modules ----------
    lvl(id) { const o = this.M.mods.owned[id]; return o ? o.lvl : 0; }
    dup(id) { const o = this.M.mods.owned[id]; return o ? o.dup : 0; }
    need(id) { return need(this.lvl(id)); }
    addMod(id, n) {
      const O = this.M.mods.owned; n = n || 1; let up = false;
      if (!O[id]) { O[id] = { lvl: 1, dup: n - 1 }; up = true; } else O[id].dup += n;
      let o = O[id]; while (o.lvl < 5 && o.dup >= need(o.lvl)) { o.dup -= need(o.lvl); o.lvl++; up = true; }
      if (o.lvl >= 5) o.dup = Math.min(o.dup, 99);
      return { id, lvl: o.lvl, up };
    }
    eq() { const E = this.M.mods.eq = (this.M.mods.eq || []).filter((id) => this.lvl(id) > 0); return E; }
    isEq(id) { return this.eq().indexOf(id) >= 0; }
    toggle(id) { if (this.lvl(id) <= 0) return false; const E = this.eq(), i = E.indexOf(id); if (i >= 0) E.splice(i, 1); else { E.push(id); while (E.length > SLOTS) E.shift(); } this.save(); return true; }
    eqLvl(id) { return this.isEq(id) ? this.lvl(id) : 0; }
    rollMod() {   // pioche pondérée par rareté ; favorise les modules pas encore au maximum
      let sum = 0; const w = IDS.map((id) => { const x = MODS[id].w * (this.lvl(id) >= 5 ? 0.15 : 1); sum += x; return x; });
      let r = Math.random() * sum; for (let i = 0; i < IDS.length; i++) { r -= w[i]; if (r <= 0) return IDS[i]; } return IDS[0];
    }
    // effets en vol
    warRadius() { const l = this.eqLvl('warhead'); return l ? 12 + 4 * l : 0; }
    shieldCharges() { const l = this.eqLvl('shield'); return l ? 1 + Math.floor(l / 3) : 0; }
    fuelK() { return 1 + 0.15 * this.eqLvl('siphon'); }
    radarRange() { return 150 + 40 * this.eqLvl('radar'); }
    nutsK() { return 1 + 0.1 * this.eqLvl('fortune'); }

    // ---------- donner une récompense ----------
    give(r) {
      const g = this.game, P = g.progress.P;
      if (r.t === 'nuts') { P.materials = (P.materials || 0) + r.n; return { text: '+' + r.n + ' ECROUS', kind: 'nuts', n: r.n }; }
      if (r.t === 'skin') { g.save.owned[r.id] = true; const s = CC.Skins.list.find((q) => q.id === r.id); return { text: 'APPARENCE ' + (s ? (s.short || s.name) : ''), kind: 'skin' }; }
      if (r.t === 'mod') { const x = this.addMod(r.id, r.n || 1); return { text: MODS[r.id].name + ' +' + (r.n || 1), kind: 'mod', id: r.id, lvl: x.lvl, up: x.up }; }
      if (r.t === 'crate') { const got = []; for (let i = 0; i < (r.n || 1); i++) { const id = this.rollMod(), x = this.addMod(id, 1); got.push({ id, up: x.up, lvl: x.lvl }); } return { text: 'CAISSE : ' + got.map((q) => MODS[q.id].name).join(' + '), kind: 'crate', got }; }
      return { text: '', kind: 'none' };
    }

    // ---------- quotidien ----------
    today() { return dayStr(); }
    dailyRoll() {
      const D = this.M.dm, t = dayStr(); if (D.day === t) return;
      D.day = t; const rng = U.makeRng(dayNum(t) * 7919 + 13), keys = Object.keys(DM).sort(() => rng() - 0.5).slice(0, 3);
      D.list = keys.map((k, i) => { const target = DM[k].gen(rng); return { type: k, target, progress: 0, claimed: false, nuts: 40 + 20 * i + 10 * Math.floor(rng() * 3), xp: 40 }; });
    }
    missions() { this.dailyRoll(); return this.M.dm.list; }
    missionText(m) { return DM[m.type].text(m.target); }
    event(kind, n) { n = n === undefined ? 1 : n; for (const m of this.missions()) if (m.type === kind && m.progress < m.target) m.progress = Math.min(m.target, m.progress + n); }
    claimMission(i) { const m = this.missions()[i]; if (!m || m.claimed || m.progress < m.target) return null; m.claimed = true; this.addPassXp(m.xp); const out = this.give({ t: 'nuts', n: m.nuts }); this.save(); return out; }
    missionsReady() { return this.missions().filter((m) => !m.claimed && m.progress >= m.target).length; }
    giftReady() { return this.M.gift.last !== dayStr(); }
    giftNextIndex() { const G = this.M.gift, y = dayStr(new Date(Date.now() - 86400000)); const s = G.last === y ? G.streak : G.last === dayStr() ? G.streak - 1 : 0; return s % 7; }
    claimGift() {
      const G = this.M.gift, t = dayStr(), y = dayStr(new Date(Date.now() - 86400000)); if (G.last === t) return null;
      G.streak = G.last === y ? G.streak + 1 : 1; G.last = t; const out = this.give(GIFT[(G.streak - 1) % 7]); this.addPassXp(25); this.save(); return out;
    }
    giftRewards() { return GIFT; }
    chestReady() { return Date.now() >= (this.M.chest.next || 0); }
    chestIn() { return Math.max(0, (this.M.chest.next || 0) - Date.now()); }
    openChest() {
      if (!this.chestReady()) return null; this.M.chest.next = Date.now() + 4 * 3600 * 1000;
      const out = [this.give({ t: 'nuts', n: 40 + Math.floor(Math.random() * 80) })]; if (Math.random() < 0.3) out.push(this.give({ t: 'crate', n: 1 })); this.addPassXp(15); this.save(); return out;
    }
    // ---------- records par niveau, fantômes, défis d'amis (sans serveur : tout passe par des liens) ----------
    rec(n) { return (this.M.rec && this.M.rec[n]) || null; }
    recordRun(n, score, time, win) {   // retourne ce qui est battu
      const R = (this.M.rec = this.M.rec || {}), o = R[n] || (R[n] = { score: 0, time: 0 }), out = { score: score > o.score, time: win && (!o.time || time < o.time) };
      if (out.score) o.score = score; if (out.time) o.time = Math.round(time * 10) / 10; return out;
    }
    ghosts() { if (!this._gh) { try { this._gh = JSON.parse(localStorage.getItem('coldimpact.ghosts') || '{}'); } catch (e) { this._gh = {}; } } return this._gh; }
    ghost(n) { return this.ghosts()[n] || null; }
    // un nouveau fantôme remplace l'ancien s'il va plus loin, ou (les deux ont fini) s'il est plus rapide
    setGhost(n, g) {
      const old = this.ghost(n); if (old && !(g.win && !old.win) && !(g.win && old.win && g.time < old.time) && !(!g.win && !old.win && g.d > old.d)) return false;
      this.ghosts()[n] = g; if (!this.game.testMode) { try { localStorage.setItem('coldimpact.ghosts', JSON.stringify(this._gh)); } catch (e) { /* stockage plein */ } } return true;
    }
    challengeLink(n, score, time) { const base = location.origin + location.pathname; return base + '?c=' + n + '.' + Math.round(score) + '.' + Math.round(time); }
    readChallenge() {   // lien reçu d'un ami : ?c=niveau.score.temps
      const m = /[?&]c=(\d+)\.(\d+)\.(\d+)/.exec(location.search); if (!m) return null;
      const ch = { n: Math.max(1, parseInt(m[1], 10)), score: parseInt(m[2], 10), time: parseInt(m[3], 10) };
      try { const P = new URLSearchParams(location.search); P.delete('c'); history.replaceState(null, '', location.pathname + (P.toString() ? '?' + P : '') + location.hash); } catch (e) { /* adresse inchangée */ }
      this.M.challenge = ch; this.save(); return ch;
    }
    // le défi est-il relevé par ce résultat ? (récompense : une caisse, une seule fois)
    checkChallenge(n, score) { const c = this.M.challenge; if (!c || c.n !== n || score < c.score) return null; this.M.challenge = null; const out = this.give({ t: 'crate', n: 1 }); this.save(); return out; }
    // ---------- sans pub ----------
    get noAds() { return !!this.M.noAds; }
    buyNoAds() { const link = CC.CONFIG.shop.noAdsLink; if (!link) return 'no-link'; this.game.save.pendingPurchase = 'noads'; this.save(); try { window.location.href = link + (link.indexOf('?') < 0 ? '?' : '&') + 'client_reference_id=noads&utm_content=noads&utm_source=coldimpact'; } catch (e) { /* ignoré */ } return 'redirect'; }
    // ---------- code de sauvegarde (changer de téléphone sans serveur) ----------
    exportCode() { const s = Object.assign({}, this.game.save); try { return 'CI1' + btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch (e) { return ''; } }
    importCode(str) {
      try { if (!/^CI1/.test(str.trim())) return false; const o = JSON.parse(decodeURIComponent(escape(atob(str.trim().slice(3))))); if (!o || typeof o !== 'object' || !o.prog) return false; localStorage.setItem('coldimpact.save', JSON.stringify(o)); return true; } catch (e) { return false; }
    }
    // pastille rouge de l'accueil
    badge() { return this.giftReady() || this.chestReady() || this.missionsReady() > 0 || this.claimableCount() > 0; }
  }
  Meta.MODS = MODS; Meta.IDS = IDS; Meta.RAR = RAR; Meta.TIERS = TIERS; Meta.XP_PER = XP_PER; Meta.SLOTS = SLOTS; Meta.need = need;
  CC.Meta = Meta;
})();
