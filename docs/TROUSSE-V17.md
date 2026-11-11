# RITUEL — Trousse 1.7 · livraison et suite NEXUS

Mise à jour : 2026-11-11. Ce document est un **handoff de contexte** pour les prochains threads. Il ne remplace pas la documentation NEXUS LINK.

## Frontières de responsabilité

- **RITUEL** conserve la vérité sur les routines et les produits, leurs photos et leurs stocks, ainsi que les modèles de trousses. Les routines historiques restent codées dans `app.js`.
- **NEXUS** conserve la vérité sur l'agenda et les dépenses, et ne reçoit des achats RITUEL que par le relais chiffré et après validation.
- **Gaming** est une troisième app indépendante : ne pas modifier son dépôt, ni réutiliser ses libellés, scopes ou gestionnaires d'import.

## Livraison 1.7 — implémenté

- Onglet `Produits` renommé `Trousse` (ID interne `products-view` conservé pour compatibilité).
- Sous-onglet Collection : neuf produits initiaux + produits personnalisés hors routine. Création, édition, suppression des produits personnalisés ; filtres existants + recherche.
- Chaque produit personnalisé utilise les mêmes `products`, `state.stock`, `stockHistory` et `purchaseLog` que les produits historiques. Les routines ne sont jamais altérées ni enrichies automatiquement.
- Une photo par produit dans `state.trousse.photos` (JPEG local compressé). Affichage sur fiches produit et cartes de stock. Photos dans l'export JSON ; aucune photo transmise via le relais LINK.
- Sous-onglet Mes trousses : modèles `kits`, références produits + `extras` en texte, état `packed` par modèle ; création, modification, suppression, remise à zéro, checklist hors ligne.
- Démonstration initiale : parfum **Silver Suede** (The Founder's Collection) et trousse « Week-end · 2 nuits ». Les deux sont de vraies entrées locales de départ, libres à modifier/supprimer. Le parfum n'est associé à aucune routine.
- Fichiers : `trousse.js` nouveau ; `index.html`, `styles.css`, `app.js`, `sw.js`, `edge-web/worker.js` modifiés.
- Version 1.7.0, cache PWA `rituel-v1.7.0`, autorisation `/trousse.js` sur l'origine Cloudflare isolée.
- `window.RITUEL_TROUSSE.hydrate()`, `.kits()` et `.hasProduct(id)` accessibles localement pour la future intégration.

## Données / compatibilité

Même clé : `rituel_personal_v1`. Le nouveau sous-arbre `state.trousse` est **facultatif** et les anciennes sauvegardes restent acceptées au format `rituel-v1`.

```js
trousse: {
  items: [{id, name, brand, group, amount, why, use, tip, shopUrl, tags, travel}],
  photos: {"productId": "data:image/jpeg;base64,..."},
  kits: [{id, name, productIds: ["foam", "trousse-silver-suede"], extras: ["Brosse à dents"], packed: {"p:foam": true}}],
  nexusTrips: []
}
```

*Attention :* l'export JSON contient les photos : le fichier grossit avec le nombre de produits. Stockage local iOS limité, ne pas promettre une photothèque illimitée. Ne pas prétendre que les photos sont sauvegardées dans Cloudflare. Sauvegarde JSON recommandée avant désinstallation.

## Prochaine étape — événement NEXUS → suggestion de trousse

**Pas encore déployé**. La liaison RITUEL → NEXUS actuelle ne fournit pas un flux retour prêt à l'emploi. Ne pas exposer un faux bouton « synchronisé » ni déduire un voyage d'une heure de routine.

1. Dans NEXUS, examiner le schéma réel des événements : `start` est présent mais pas de `end` fiable pour les voyages. Définir durée / fin du séjour et type d'événement, puis permettre confirmation du contexte avant envoi.
2. Dans NEXUS LINK, spécifier explicitement un flux **NEXUS → RITUEL**, une autorisation `trip_context`, la destination RITUEL, les droits de lecture et d'écriture ; **ne pas réutiliser** aveuglément les scopes ou permissions de Gaming.
3. Message chiffré minimal : `{eventId, revision, startDate, endDate, title?, tripType?}`. Vérifier dates, taille, signature/pair, origine, dédoublonnage et révocation. Pas de données d'invités, d'adresse ou de géolocalisation par défaut.
4. Dans RITUEL, proposer un modèle de trousse de durée appropriée et créer une checklist spécifique au voyage **seulement après accord**. Un changement / annulation d'événement ne doit ni supprimer une trousse personnelle ni effacer des cases de routine.
5. Tester : pas de migration silencieuse, pas de notification dupliquée, hors ligne, doublons, refus, révocation, restauration JSON, iPhone installé. Ne rien écrire dans Gaming.

## Vérifications déjà effectuées

- Syntaxe `app.js`, `trousse.js` validée.
- Montage simulé de l'état, injection initiale Silver Suede, modèle « Week-end · 2 nuits » et hydratation idempotente.
- IDs requis du DOM, import de tous les scripts, pré-cache SW, routage Worker autorisé, bindings `NEXUS_API` et `RITUEL_PUSH` vérifiés.
- **Test utilisateur iPhone requis** avant de déclarer la livraison totalement validée : naviguer dans Collection, tester ajout / photo / stock et cocher la trousse.
