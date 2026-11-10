# Notre méthode — applications iPhone personnelles 100 % gratuites

> Référence de travail réutilisable pour RITUEL et les prochaines applications perso / entre amis. Ne pas confondre **PWA installable** et application native distribuée hors App Store.

## Principes non négociables

1. **0 €** : pas d'abonnement Apple Developer, pas de signature à renouveler tous les 7 jours, pas d'App Store, pas de service payant, pas de domaine personnalisé obligatoire.
2. **Vraie PWA iPhone** : installation Safari → Ajouter à l'écran d'accueil, manifeste `display: standalone`, icônes, service worker pour le hors ligne, gestion des safe areas iOS.
3. **Vraies notifications iOS** si nécessaire : Web Push (iOS/iPadOS 16.4+) après consentement explicite de l'utilisateur, quand l'app est installée sur l'accueil ; pas de fausses promesses de notifications locales persistantes en navigateur.
4. **Simple et pérenne** : HTML / CSS / JS quand cela suffit, peu de dépendances, configuration explicite, code source versionné.
5. **Vie privée** : données locales par défaut (`localStorage` ou IndexedDB), sauvegarde/restauration exportables, secrets uniquement dans Cloudflare, information claire de ce qui part au serveur.
6. **Gratuit sous les quotas** : rester volontairement sur GitHub Free (Pages/public repository), Workers Free et D1 Free. Si un besoin risque de dépasser les limites, réduire la fréquence, optimiser le code ou revoir le périmètre — **ne jamais activer un service payant sans accord explicite**.

## Architecture de référence

```text
Prototype / base de test (navigateur + écran mobile)
                 |
                 v
Dépôt GitHub public (branche main)
    |                           |
    v                           v
GitHub Pages HTTPS             Cloudflare Workers Builds
PWA HTML/CSS/JS                /push-worker (Wrangler)
Service Worker offline         Worker + Cron / API sécurisée
Stockage local et sauvegarde   D1 si états/push nécessaires
    |                           |
    +---- HTTPS/CORS/Web Push ---+
                 |
       iPhone écran d'accueil
```

## Workflow systématique

### 1 — Définir et prototyper
- Écrire objectif, écrans, données, interactions et critères de réussite.
- Faire fonctionner une V0 de test sur mobile : portrait, safe areas, menu bas, accessibilité, mise en veille, sans compte obligatoire.
- Garder un jeu de données de test séparé des données personnelles.
- Faire les tests de syntaxe, clics, stockage et actualisation (service worker).

### 2 — Versionner sur GitHub
- Un dépôt **par app**, par défaut public pour GitHub Pages gratuit ; aucun secret ni donnée privée dans le dépôt.
- Branches / commits lisibles, `README.md`, `index.html`, `manifest.webmanifest`, `sw.js`, icônes et `.nojekyll`.
- GitHub Pages : source `main /(root)`. URL `https://<utilisateur>.github.io/<nom-repo>/`.
- Chaque modification doit préserver la version existante du stockage (migrations sans perte), et incrémenter le cache Service Worker pour actualisation.
- **Ne pas demander de désinstaller l'icône pour mettre à jour** : risque de perdre les données locales et les abonnements Web Push.

### 3 — Cloudflare uniquement pour les besoins serveur
- Si l'app est autonome, inutile d'ajouter un Worker.
- Pour Web Push ou automatisations : Worker et **Cron Trigger**, base **D1** facultative pour abonnements/préférences, connexion Cloudflare Builds à GitHub.
- Worker dans `/push-worker` avec `wrangler.toml`, build/deploy depuis ce dossier. Réutiliser le compte Free.
- Authentifier les actions de préférences ; limiter les appels, valider le JSON, régler CORS au domaine de l'app, ne jamais accepter d'endpoint push arbitraire.
- Secrets VAPID privés dans **Workers > Settings > Runtime variables and secrets** ; la section « Build variables and secrets » ne rend PAS les secrets disponibles au runtime. **Jamais de clé privée GitHub ou ChatGPT.**
- Raccorder l'URL `https://...workers.dev` dans un fichier public de configuration côté client ; l'adresse publique n'est pas un secret.
- Déployer, vérifier endpoint santé et `/api/config`, puis test réel sur écran verrouillé, iPhone verrouillé et application fermée.
- Consentement explicite pour Web Push (après clic), options marche/arrêt + suppression de souscription.

### 4 — Livraison et maintenance
- Vérifier un parcours complet **avant** de déclarer une fonctionnalité « opérationnelle » (test iPhone requis pour les push).
- Tester sauvegarde et restauration, bascule hors ligne, contrôle de mise à jour dans l'app, réinstallation.
- Surveiller les quotas Free. Ne jamais activer Workers Paid, D1 Paid, noms de domaine payants, Apple Developer payant ou fournisseur tiers facturé.
- Pour partage à des amis : chacun installe la PWA depuis Safari ; authentification/partitionnement des données avant synchronisation multiutilisateur.
- Utiliser de nouvelles clés VAPID uniquement en connaissance de cause : cela peut imposer la réinscription des abonnements.

## Référence concrète actuelle

- App : [RITUEL](https://leomgl.github.io/rituel-app/)
- Dépôt : [Leomgl/rituel-app](https://github.com/Leomgl/rituel-app)
- Backend : `push-worker/` via Cloudflare Workers Builds, Worker `rituel-app`.
- BDD : `rituel-push-db` (D1).
- Sans coûts hors éventuels futurs dépassements des limites de l'offre gratuite ; choisir délibérément de rester sous ces limites.

## Limites à garder en tête

- Une PWA ne possède pas toutes les API natives iOS (les widgets natifs, par exemple, ne sont pas garantis).
- Les push nécessitent une connexion réseau, l'autorisation iOS et un abonnement valide ; la livraison à la seconde près n'est pas garantie.
- Les données localStorage sont **propres à chaque installation/appareil** ; la sauvegarde et l'export restent importants.
- Les offres gratuites et leurs quotas sont susceptibles d'évoluer : vérifier avant chaque nouveau déploiement.

### Sources de tarification / documentation à vérifier

- GitHub Pages : https://docs.github.com/en/pages/getting-started-with-github-pages
- Workers Free : https://developers.cloudflare.com/workers/platform/limits/
- D1 Free : https://developers.cloudflare.com/d1/platform/pricing/
- Apple Web Push : https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers

**Règle d'équipe : test → dépôt GitHub → publication PWA → Cloudflare (si utile) → push/automations → contrôle iPhone → maintien gratuit.**
