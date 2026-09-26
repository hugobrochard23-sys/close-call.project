/* Outils d'inspection visuelle (développement uniquement, jamais chargés par le jeu).
 * Dans la console d'une page ?test=1 : await import('/tools/devhelpers.js') puis __multi / __side / __look / __grid. */
const V = THREE.Vector3;

// capture synchrone (3D + HUD) dans un petit canvas : pas de décodage d'image (bloquant quand le volet est masqué)
window.__cap = () => {
  const g = CC.game, c = document.createElement('canvas'); c.width = 640; c.height = 360;
  const x = c.getContext('2d'); x.drawImage(g.canvas, 0, 0, 640, 360); x.drawImage(g.hudCanvas, 0, 0, 640, 360);
  return c;
};
window.__grid = (shots, cols = 2) => {
  const w = 640, h = 360, rows = Math.ceil(shots.length / cols);
  const c = document.createElement('canvas'); c.width = w * cols; c.height = h * rows;
  const g = c.getContext('2d');
  shots.forEach((im, i) => g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h));
  let d = document.getElementById('__g');
  if (!d) { d = document.createElement('canvas'); d.id = '__g'; d.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:auto;z-index:99999;background:#000'; document.body.appendChild(d); }
  d.width = c.width; d.height = c.height; d.getContext('2d').drawImage(c, 0, 0); d.hidden = false;
  return [c.width, c.height];
};
window.__hide = () => { const d = document.getElementById('__g'); if (d) d.hidden = true; };
window.__step = (n) => { for (let i = 0; i < n; i++) { CC.harness.step(1); if (CC.harness.state().done) break; } };
window.__multi = async (levels, frames, cols) => {
  const out = [];
  for (const L of levels) {
    CC.game.startLevel(L);
    let f = 0;
    for (const n of frames) { while (f < n) { CC.harness.step(1); f++; if (CC.harness.state().done) break; } out.push(__cap()); }
  }
  return __grid(out, cols || frames.length);
};
// vue libre autour de la roquette : dx à droite, back en arrière, up au-dessus, visée à `look` m derrière le centre
window.__side = (dx, back, up, look) => {
  const g = CC.game, rk = g.rocket, cam = g.camera;
  const side = new V().crossVectors(rk.fwd, new V(0, 1, 0)).normalize();
  cam.position.copy(rk.pos).addScaledVector(side, dx).addScaledVector(rk.fwd, -back).add(new V(0, up, 0));
  cam.lookAt(rk.pos.clone().addScaledVector(rk.fwd, -(look || 0)));
  cam.updateMatrixWorld();
  g.effects.update(0, cam); g.trails.update(0, rk, cam);
  g.render(performance.now() / 1000);
  return __cap();
};
// vue libre : caméra en `from`, regarde `to` (tableaux [x,y,z])
window.__look = (from, to, fov) => {
  const g = CC.game, cam = g.camera;
  cam.position.fromArray(from); cam.lookAt(new V().fromArray(to));
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  g.effects.update(0, cam);
  g.render(performance.now() / 1000);
  return __cap();
};
// objet à inspecter : `obj` (Object3D) vu depuis une direction [x,y,z] à `dist` m
window.__orbit = (obj, dir, dist, fov) => {
  const c = new V(); new THREE.Box3().setFromObject(obj).getCenter(c);
  const d = new V().fromArray(dir).normalize();
  return __look(c.clone().addScaledVector(d, dist).toArray(), c.toArray(), fov || 40);
};
