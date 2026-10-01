/* v037 : COURBURE DU MONDE (perspective « runner mobile »). La géométrie et les collisions restent parfaitement droites ; seul le rendu est
 * déformé : dans le vertex shader, chaque sommet est abaissé (dans le repère de la caméra) de  k × d²  où d est sa distance à la caméra au-delà
 * de `near`. Près de la caméra rien ne bouge ; au loin le terrain « plonge » vers l'horizon.
 * Un seul réglage : CC.CONFIG.render.curve (0 = aucune courbure ; 0,0001 = très discret ; 0,0003 = marqué). Modifiable par l'URL : ?curve=0.0002.
 * Le chunk de shader est patché UNE FOIS, avant la première compilation (la valeur est donc lue au chargement). Les passes d'ombre sont exclues
 * (les ombres restent calées sur la vraie géométrie) ; les ShaderMaterial maison (ciel, post-traitement) et les sprites ne sont pas touchés. */
(function () {
  const R = CC.CONFIG.render;
  const q = new URLSearchParams(location.search).get('curve');
  if (q !== null && Number.isFinite(parseFloat(q))) R.curve = parseFloat(q);
  const near = R.curveNear, cap = R.curveCap;
  const f = (n) => n.toFixed(6);
  const k = Math.max(0, R.curve || 0);
  const code = k > 0 ? `
#if !defined( DEPTH_PACKING ) && !defined( DISTANCE )
  { float cd = clamp( -mvPosition.z - ${f(near)}, 0.0, ${f(cap)} ); mvPosition.y -= ${f(k)} * cd * cd; }
#endif
  gl_Position = projectionMatrix * mvPosition;` : null;
  if (code && THREE.ShaderChunk.project_vertex.indexOf('gl_Position = projectionMatrix * mvPosition;') >= 0) {
    THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace('gl_Position = projectionMatrix * mvPosition;', code);
  }
  const up = new THREE.Vector3(), fw = new THREE.Vector3();
  // même abaissement côté JavaScript : les repères du HUD (cibles, missiles) suivent les objets tels qu'ils sont dessinés
  CC.Curve = {
    k,
    apply(v, cam) {
      if (!k) return v;
      fw.set(0, 0, -1).applyQuaternion(cam.quaternion); up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const d = Math.min(cap, Math.max(0, (v.x - cam.position.x) * fw.x + (v.y - cam.position.y) * fw.y + (v.z - cam.position.z) * fw.z - near));
      return v.addScaledVector(up, -k * d * d);
    },
  };
})();
