/* v034b : MUR A CASSER — le collectible « actif » du mode CLASSIQUE. Un mur plein (briques, planches, tôle, pierre…) fait de gros
 * blocs barre le couloir jusqu'à ~24 m de haut : on le traverse (la roquette y perd 12 % de vitesse) ou on passe par-dessus.
 * Les blocs touchés (et leurs voisins dans ~7 m) éclatent en morceaux, et chacun libère des MATERIAUX : des écrous dorés qui
 * volent jusqu'au compteur du HUD (Game.onSmash → Game.flyers). Un seul objet instancié par mur (un appel de dessin) ;
 * chaque bloc a sa boîte de collision (kind 'brick', ref → cette classe) : Rocket.resolveHit la brise sans rien savoir d'elle. */
(function () {
  const V = THREE.Vector3;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  class SmashWall {
    /* o = { blocks: [[x,y,z], …] centres, size: [w,h,d], yaw (degrés), mat, shatter: 'brick'|'planks', reward (matériaux par bloc) } */
    constructor(builder, o) {
      this.o = o; this.reward = o.reward || 4; this.kind = o.shatter || 'brick';
      const geo = builder.soloBoxGeometry(o.size, o.mat), mat = builder.mat(o.mat);
      const n = o.blocks.length;
      this.mesh = new THREE.InstancedMesh(geo, mat, n); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
      this.object = this.mesh;
      _q.copy(builder.quatFrom([0, o.yaw, 0]));
      this.centers = []; this.colliders = []; this.alive = new Array(n).fill(true);
      this.size = new V().fromArray(o.size);
      o.blocks.forEach((p, i) => {
        const c = new V().fromArray(p); this.centers.push(c);
        _m.compose(c, _q, _s.set(1, 1, 1)); this.mesh.setMatrixAt(i, _m);
        this.colliders.push(builder.world.addBox({ center: c, size: o.size, quat: _q, kind: 'brick', ref: { breakApart: (game, vel) => this.smash(i, game, vel) } }));
      });
      this.mesh.instanceMatrix.needsUpdate = true;
      this.quat = _q.clone();
    }

    // brise le bloc i et ses voisins proches (un trou de la taille de la roquette + un peu) ; récompense par bloc
    smash(i, game, vel) {
      if (!this.alive[i]) return;
      const c0 = this.centers[i], total = [];
      this.centers.forEach((c, j) => { if (this.alive[j] && c.distanceTo(c0) < 7.6) total.push(j); });
      let n = 0;
      for (const j of total) {
        this.alive[j] = false; this.colliders[j].active = false; this.mesh.setMatrixAt(j, _zero);
        game.effects.shatter(this.centers[j], this.size, vel, this.kind);
        n += this.reward;
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      game.audio.play('brick', c0); game.audio.play('boomSmall', c0);
      game.onSmash(c0, n);
    }
    reset() { this.alive.fill(true); this.centers.forEach((c, i) => { _m.compose(c, this.quat, _s.set(1, 1, 1)); this.mesh.setMatrixAt(i, _m); this.colliders[i].active = true; }); this.mesh.instanceMatrix.needsUpdate = true; }
  }

  CC.SmashWall = SmashWall;
  CC.LevelBuilder.prototype.smashWall = function (o) { const w = new SmashWall(this, o); return this.entity(w); };
})();
