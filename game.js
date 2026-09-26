/* CLOSE CALL — point d'entrée. Crée le jeu et démarre la boucle (ou le banc de test si ?test=1). */
(function () {
  function showError(msg) {
    let el = document.getElementById('cc-error');
    if (!el) { el = document.createElement('div'); el.id = 'cc-error'; document.body.appendChild(el); }
    el.textContent += msg + '\n';
  }
  window.addEventListener('error', (e) => showError('Erreur : ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));
  try {
    const game = new CC.Game(document.getElementById('game'));
    game.start();
  } catch (e) {
    showError('Démarrage impossible : ' + e.message + '\n' + (e.stack || ''));
    console.error(e);
  }
})();
