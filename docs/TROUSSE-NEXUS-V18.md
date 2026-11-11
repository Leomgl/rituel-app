# RITUEL 1.8 — photos Rituals & réception des voyages Nexus

Date : 2026-11-11. Document de reprise pour tout nouveau thread.

## Nouveautés
- Visuels produits : `trousse.js` expose `officialSkus` pour les 9 soins initiaux et le parfum Silver Suede (référence 1120736). URL de photo officielle construite à partir du SKU : `https://www.rituals.com/assets/<SKU>/packshot/product%3ASquare?fmt=webp-alpha&resMode=sharp2`. Les photos personnelles locales ont priorité ; si une URL officielle expire, l'image est masquée sans casser la fiche. L'image distante n'est pas mise dans la sauvegarde JSON ni copiée sur Cloudflare. Certains SKU peuvent pointer vers un nouveau packaging.
- Un produit personnalisé peut renseigner une référence Rituals à 7–10 chiffres. Les produits personnalisés restent indépendants des routines.
- Nouveau module `rituel-travel.js` : réception **Nexus → RITUEL** via une **seconde connexion NXL1** qui transporte uniquement `trip_context`. Ne pas confondre avec la connexion RITUEL → Nexus existante.
- Le panneau « Mes voyages » est sous `Trousse → Mes trousses`. Une saisie de code de jumelage, un bouton `Recevoir les séjours`, puis une acceptation manuelle vers un modèle de trousse. Dates modifiées : révision proposée sans écraser les cases cochées de la trousse déjà créée. Ignorer possible.
- Le relais reste chiffré en AES-GCM (module partagé `link-core.js`), sans texte lisible par Cloudflare. Pas de consommation de produit, dépense ou notification générée par ce canal.
- `state.trousse.nexusTrips` suit les confirmations et révisions ; les trousses créées possèdent `tripRef`. Sauvegarde JSON compatible avec l'existant.
- Le nouveau code est listé dans `index.html`, dans le Service Worker v1.8.0 et dans l'allowlist du Worker Cloudflare `rituel-web`.
- **Gaming n'a pas été modifiée.**

## Mise en place sur iPhone

1. Dans **NEXUS → Réglages → Voyages → Trousse RITUEL**, crée la liaison et copie le code privé NXL1.
2. Dans **RITUEL → Trousse → Mes trousses → Mes voyages**, colle ce code et accepte le jumelage.
3. Dans NEXUS → Agenda, crée ou modifie un événement ; coche « Voyage / week-end » et renseigne la date de retour.
4. Dans NEXUS → Réglages → Voyages → Trousse RITUEL, choisis « Proposer » pour ce séjour.
5. Dans RITUEL → Mes voyages, clique « Recevoir les séjours », choisis une trousse type et accepte.
6. Une checklist indépendante apparaît dans « Mes trousses ». L'ancien modèle n'est pas modifié.

Le transfert exige une connexion internet au moment de l'envoi/réception. Les modèles existants et les checklists sont utilisables hors ligne.

## Frontières de confiance

- Le `sourceApp` du deuxième canal reste `rituel` dans le contrat existant : l'identité désigne le domaine d'app associé ; le scope `trip_context` identifie **le sens inverse**. Ce scope est isolé dans un **autre ID de connexion** et ne peut pas lire des événements/achats du canal existant.
- NEXUS n'envoie que `{type, destination, eventId, title, startDate, endDate, nights}` après confirmation. Pas de participants, de lieu, d'adresse ou de détails d'agenda.
- Une simple entrée agenda n'est **jamais** transmise : il faut la marquer comme séjour, puis toucher « Proposer ». Une révision ne remplace pas automatiquement les articles cochés dans RITUEL.
- Le `NXL1` est un secret d'accès à cette connexion. Ne pas le coller dans un support public ni dans une issue GitHub.
- RITUEL confirme localement la sauvegarde avant d'accuser réception au relais.
- Le contrat nécessite un nouveau jumelage ; aucun ancien lien n'est révoqué.

## À tester sur l'iPhone installé

- Rafraîchir NEXUS et RITUEL ; vérifier images officielles, image personnelle prioritaire et ancien stock.
- Jumelage voyage, envoi d'un vrai week-end d'essai, réception et création de trousse.
- Modifier les dates dans NEXUS et envoyer à nouveau, puis vérifier que les cases déjà cochées restent.
- Tester hors ligne, suppression de trousse, sauvegarde/restauration, rejet de code Gaming, révocation de voyage sans toucher à l'import RITUEL.
- Vérifier la disponibilité réelle des packshots : les URL sont dérivées des références officielles et ne sont pas garanties par Rituals.

État : code et Workers publiés ; validation réelle iPhone de bout en bout encore nécessaire.
