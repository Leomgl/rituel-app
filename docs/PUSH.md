# RITUEL — Activer les notifications push iPhone (V1.4)

Cette V1.4 sépare le site GitHub Pages (PWA) du serveur d'envoi Cloudflare Workers. **Ne pas confondre** : l'interface de réglages est déjà sur GitHub, mais aucune notification n'est envoyée tant que le Worker n'est pas déployé et relié à l'app.

## État du déploiement (10 novembre 2026)

- Worker Cloudflare existant : `rituel-app`.
- URL du Worker : `https://rituel-app.q9pfwtztsc.workers.dev`.
- Dépôt GitHub connecté et build déployé avec succès à partir de `/push-worker`.
- Base D1 `rituel-push-db` et son binding `DB` configurés ; horaire Cron `*/5 * * * *` déployé.
- RITUEL est relié à cette URL dans `push-config.js`.
- **Blocage actuel :** le connecteur Cloudflare n'a pas la permission d'ajouter des secrets de Worker. Il reste à définir `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` dans les paramètres du Worker, ou à reconnecter Cloudflare avec l'autorisation Workers Editor/Workers Admin.
- Ne pas recréer le Worker ou la base D1. Ne pas renommer le Worker sans modifier simultanément `wrangler.toml`.

## Prérequis

- RITUEL installée sur l'écran d'accueil d'un iPhone iOS 16.4+ (ouverte depuis son icône, pas dans un simple onglet Safari).
- Un compte Cloudflare. L'offre gratuite suffit normalement à ce volume personnel, dans la limite des quotas Cloudflare.
- Un compte GitHub connecté à Cloudflare Workers Builds.

## Installation 100 % navigateur / iPhone (déjà effectuée pour les étapes 1 à 3 et 6)

**Seules les étapes 4, 5, 7 et 8 restent à finaliser.**

1. Dans Cloudflare > **Storage & databases > D1**, créer une base **rituel-push-db** (Cloudflare propose souvent la région Europe). Copier son **database_id** (UUID public de configuration, ne pas confondre avec une clé secrète).
2. Ouvrir `push-worker/wrangler.toml` sur GitHub et remplacer `REPLACE_WITH_D1_DATABASE_UUID` par cet UUID. Le dépôt RITUEL contient déjà le code. Si besoin, demander à ChatGPT de mettre ce seul ID à jour.
3. Dans Cloudflare > **Workers & Pages > Create application > Connect to GitHub**, choisir `Leomgl/rituel-app`. Définir le **Root directory : push-worker**, le nom du Worker : **rituel-app**, la branche `main`, le **Build command : npm install**, le **Deploy command : npx wrangler deploy**. Sauver et déployer. Le Worker initialise automatiquement ses tables D1 lors de la première requête.
4. Générer les clés VAPID depuis un navigateur sur **https://leomgl.github.io/rituel-app/tools/vapid.html**. La génération est locale, dans le navigateur ; elle ne transmet pas tes clés. Une seule paire de clés pour toute l'installation.
5. Dans Cloudflare > Worker `rituel-push` > **Settings > Variables and Secrets**, créer :
   - `VAPID_PUBLIC_KEY` : texte fourni par la page
   - `VAPID_PRIVATE_KEY` : **secret**, jamais à mettre sur GitHub ou dans une capture
   - `VAPID_SUBJECT` : `https://leomgl.github.io`
   Ces valeurs doivent être disponibles au Worker en production. Ne jamais envoyer la clé privée à ChatGPT.
6. Copier l'adresse publique du Worker, par exemple `https://rituel-push.<ton-sous-domaine>.workers.dev`. **Ce n'est pas un secret**. La fournir à ChatGPT pour qu'il renseigne `push-config.js` dans GitHub.
7. Vérifier que `https://TON-WORKER.workers.dev/api/health` renvoie `{"ok":true,...}` et que `/api/config` (appel depuis RITUEL) annonce `ready:true`.
8. Fermer puis rouvrir RITUEL depuis son icône sur l'accueil, aller dans **Réglages > Notifications iPhone** et toucher **Activer les notifications**. Autoriser dans la boîte iOS et envoyer une notification test.

## Types proposés

- **Matin** : par défaut 07:30 (horaire personnalisable dans RITUEL)
- **Soir** : par défaut 21:30
- **Rappel doux** : 45 minutes après, uniquement si la routine n'est pas indiquée terminée ; désactivé par défaut
- **Stock** : dimanche 18:00, si un produit est à 25 % ou moins sans réserve ; désactivé par défaut
- **Soins spéciaux** : 08:00 lundi/mercredi/vendredi pour le shampooing, mardi/jeudi/samedi pour l'huile ; désactivé par défaut

La programmation utilise le fuseau IANA du téléphone et une tâche toutes les 5 minutes. L'envoi réel peut varier de quelques minutes. Aucune notification n'est garantie à la seconde près.

## Vie privée

Le suivi principal reste local dans RITUEL. Lorsque l'utilisateur **active explicitement** les push, le Worker reçoit la souscription Web Push, les horaires, les préférences, l'état terminé ou non pour les deux routines du jour et le **nombre** de produits en stock faible (pas les noms, prix ou pourcentages). Une identité aléatoire du téléphone protège l'accès aux réglages. La paire de clés VAPID est conservée dans les paramètres secrets de Cloudflare. La désinscription depuis RITUEL retire la souscription côté Worker.

## Diagnostic

- `/api/health` est inaccessible : Worker non déployé ou mauvaise URL.
- Le bouton « Activer » est grisé : URL Worker absente de `push-config.js`, clés VAPID manquantes, ou app non lancée depuis l'icône d'accueil.
- Autorisation iOS refusée : vérifier Réglages iPhone > Notifications > RITUEL.
- `Database not ready` : vérifier la liaison D1 `DB` et son UUID dans `wrangler.toml`.
- Aucun push après inscription : utiliser le bouton **Envoyer une notification test**, attendre au moins 90 secondes entre tests et examiner les logs du Worker.
- Push désactivés après suppression de l'icône : réinstaller et réautoriser la PWA ; ne jamais supprimer l'icône pour une simple mise à jour si possible.
- PWA non à jour : utiliser Réglages > Mises à jour de RITUEL.

## Développement

Les sources du Worker sont sous `push-worker/src/index.js`. La base D1 est décrite dans `push-worker/migrations/0001_init.sql` ; le Worker applique automatiquement le même schéma au démarrage. Pour l'installation CLI, les migrations restent disponibles.

### Note

Ce backend est une première implémentation préparée et vérifiée statiquement. **Il n'a pas encore été déployé ni testé en conditions réelles avec le service push d'Apple**. Ne pas le considérer opérationnel avant le premier test effectué depuis un vrai iPhone.
