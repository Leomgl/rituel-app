# RITUEL ↔ NEXUS LINK — migration sécurisée

Le client RITUEL est actif **uniquement** sur `https://rituel-web.q9pfwtztsc.workers.dev/`. La version GitHub Pages ne traite aucun jumelage et conserve sa base locale d'origine.

## Migration depuis l'iPhone
1. Ouvrir l'ancienne RITUEL → Réglages → Ton suivi → **Sauvegarder mes données (.json)**.
2. Dans Safari, ouvrir la nouvelle origine RITUEL sur Cloudflare, l'ajouter à l'écran d'accueil.
3. Dans la nouvelle RITUEL → Réglages → Ton suivi → **Restaurer une sauvegarde**.
4. Vérifier stock, historique et routines. Activer et tester les notifications iPhone sur la **nouvelle** installation.
5. Dans NEXUS → Applications & connexions → RITUEL, activer les scopes souhaités et jumeler. Coller le code privé NXL1 dans RITUEL isolé → Réglages → NEXUS LINK.
6. Tester un produit à racheter et vérifier sa proposition dans NEXUS. N'effacer l'ancienne installation qu'après vérification des données et push.

## Flux
- `restock_purchase` : produit faible (stock ≤25%, réserve=0, ou prévision ≤7j) → Achats, montant non renseigné.
- `restock_task` : stock faible → Rappels, date du premier signalement.
- `product_paid` : **achat explicitement enregistré** avec date et prix → dépense réelle *à confirmer* dans NEXUS, jamais inférée par la hausse du stock.
- `routine_schedule` : routines du matin/soir en événements ponctuels, pas des récurrences automatiques.
- `routine_summary` : bilan 7 jours → note NEXUS.

Toutes les propositions transitent chiffrées par NEXUS LINK, subissent une validation et sont dédoublonnées. Envoi manuel par défaut, automatique facultatif. Pas de clés supplémentaires pour la liaison. Les données locales des anciennes installations ne migrent pas automatiquement entre origines et un abonnement Web Push doit être réactivé sur la nouvelle origine.
