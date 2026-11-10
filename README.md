# RITUEL — mini-app de soins, version 1.5

Une application web iPhone installable (PWA) pour les routines matin/soir de 9 produits Rituals. **Projet sans App Store ni frais récurrents**, avec fonctions hors ligne et données de suivi conservées sur l’appareil. Les notifications Web Push passent par Cloudflare Workers.

## Notre architecture réutilisable pour les prochaines apps

**[Lire le guide de création d’apps personnelles 100 % gratuites](docs/ARCHITECTURE-APPS-GRATUITES.md)** : prototype/test → GitHub → GitHub Pages (PWA iPhone) → Cloudflare Workers/D1 seulement si besoin de push ou d’automatisation → validation sur iPhone, sans abonnement Apple ni renouvellement de signature.

## Nouveautés RITUEL 1.5

- **Notifications intelligentes** : plusieurs formulations selon le jour ; pas de rappel de routine déjà terminée ; délai du second rappel au choix (30, 45, 60, 90 minutes), désactivé par défaut.
- **Stock intelligent** : historique des niveaux manuels, estimation d'autonomie à partir de deux relevés datés espacés (jamais de consommation inventée), avertissement dès qu'il reste environ 7 jours sans réserve. L'alerte hebdomadaire utilise aussi ces prévisions après synchronisation.
- **Statistiques** : nouvel onglet Stats, vues sur 7 ou 30 jours, régularité matin et soir, jours complets et série de jours consécutifs. Les jours antérieurs au premier soin coché ne sont pas imputés au suivi.
- **Migration sans perte** : ancienne clé localStorage `rituel_personal_v1` préservée, nouveaux champs facultatifs initialisés automatiquement ; cache Service Worker `rituel-v1.5`. Export JSON recommandé avant toute désinstallation.

## Push iPhone (V1.5 — Worker Cloudflare actif)

RITUEL utilise un Worker Cloudflare `rituel-app` relié à la base D1 `rituel-push-db`. Le premier push a été validé sur iPhone. Les horaires, options et souscriptions sont conservés côté Worker ; les cases et niveaux détaillés restent locaux.

- Sources : [push-worker](push-worker)
- Configuration iPhone sans Mac : [Guide complet](docs/PUSH.md)
- Générateur local de clés VAPID : [tools/vapid.html](tools/vapid.html)
- Le site reste fonctionnel hors ligne ; l’autorisation de notifications n’est demandée qu’après action explicite.
- Ne jamais mettre la clé privée VAPID dans le dépôt public.

## Stock et liens officiels

- Inventaire des 9 produits avec niveau restant renseigné manuellement (0–100 %, par pas de 5 %).
- Suivi des flacons de réserve (+ / −) et alertes de rachat à 25 % ou moins si aucune réserve.
- Liens directs vers les fiches officielles Rituals ; les formats différents et anciennes références sont explicitement indiqués.
- Les soins cochés ne déduisent pas automatiquement le stock, faute de dosage mesuré.
- Les valeurs inconnues restent « À renseigner » : aucun niveau initial n'est inventé.
- Bouton de vérification des mises à jour dans Réglages pour rafraîchir sans désinstaller l'application.
- Le suivi et le stock restent locaux au navigateur/app. Sauvegarde JSON recommandée avant toute suppression de l'icône iOS.

## Fonctions

- Deux routines matin / soir, étapes expliquées et quantités recommandées.
- Plan hebdomadaire avec shampooing lundi/mercredi/vendredi et huile à barbe mardi/jeudi/samedi (optionnelle).
- Adaptation peau mixte et barbe moyenne 1–3 cm.
- Déplacement des soins de douche entre matin et soir.
- Option « rasage aujourd'hui » pour afficher le gel après-rasage.
- Checklist persistante par date, progression journalière et semaine.
- Fiches des 9 produits.
- Réglages des horaires de rappel, export de 2 événements Calendrier quotidiens (.ics) avec alarmes.
- Installation sur écran d'accueil iPhone ; cache hors ligne via service worker.
- Sauvegarde et restauration manuelles des données en JSON.

## Publication sur GitHub Pages (sans Mac)

1. Créer le dépôt **public** `Leomgl/rituel-app` dans GitHub (cocher « Add README » au départ).
2. Ajouter à la racine du dépôt `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js` et le dossier `icons/`. **Attention : un ZIP déposé tel quel dans le dépôt ne publie pas le site : il faut les fichiers décompressés.**
3. Sur GitHub : **Settings > Pages > Build and deployment > Source: Deploy from a branch > main / (root) > Save**.
4. Après la première publication, ouvrir `https://leomgl.github.io/rituel-app/` dans Safari iPhone et utiliser **Partager > Sur l'écran d'accueil**.

Les ressources utilisent des URL relatives, adaptées au sous-dossier `/rituel-app/` de GitHub Pages. Le code et l'URL sont publics, mais les coches et réglages sont stockés dans `localStorage` de l'appareil. Changer d'adresse web ou effacer les données du site peut faire perdre le suivi ; une exportation JSON est disponible dans les réglages. GitHub Pages n'ajoute pas de notifications push ni de widget natif.

## Installation et mise à jour depuis l'iPhone

1. Ouvrir **https://leomgl.github.io/rituel-app/** dans Safari.
2. **Partager → Sur l'écran d'accueil → Ajouter** ; puis ouvrir RITUEL depuis son icône.
3. Pour recevoir les dernières versions, utiliser **Réglages → Mises à jour de RITUEL** et rouvrir l'app.
4. Ne pas supprimer l'icône pour mettre à jour : iOS peut perdre les données locales et la souscription push. Exporter le JSON si une désinstallation est indispensable.

## Mettre en place les rappels

Dans **Réglages** de l'application, choisir les heures puis toucher **Exporter 2 rappels Calendrier**. Le fichier `.ics` crée deux événements quotidiens avec alerte à l'heure de l'événement. L'import peut s'effectuer sur Mac via Calendrier, avec le calendrier synchronisé par iCloud. Selon les versions d'iOS, l'import direct d'une pièce jointe `.ics` sur iPhone n'est pas toujours disponible. Alternative plus simple : créer manuellement deux rappels récurrents dans l'application Rappels d'Apple.

**Important :** l'application ne déclenche pas elle-même de notification lorsqu'elle est fermée. Les événements Calendrier donnent des alertes natives indépendantes de l'app. Chaque nouvel export du `.ics` peut créer des doublons si tu réimportes sans retirer les anciens événements.

## Limitations et prochaine étape

- Ce n'est **pas** un widget interactif iOS. Une PWA peut placer une **icône** sur l'écran d'accueil. Un vrai widget nécessite WidgetKit et une application native iOS.
- Pour de vraies **notifications push depuis l'app**, il faut intégrer l'API Web Push à un serveur HTTPS, stocker les abonnements et programmer les envois. iOS permet le Web Push pour les web apps installées sur l'écran d'accueil depuis iOS 16.4.
- Pas de synchronisation entre appareils : les tâches sont stockées dans `localStorage`, propre à chaque installation. Ne pas supprimer les données du site sans sauvegarde.
- Les soins proposés sont des repères d'organisation, pas des instructions médicales. Adapter à la tolérance, notamment en cas d'irritation.

## Tester localement sur Mac / PC

À la racine du dossier :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080/` dans le navigateur. En mode `file://`, le cache hors ligne n'est pas actif.

## Structure

- `index.html` — interface.
- `styles.css` — design responsive.
- `app.js` — routines, stockage, navigation et génération Calendrier.
- `manifest.webmanifest` — définition de l'application installable.
- `sw.js` — mise en cache hors ligne.
- `icons/` — icônes.

Le projet est indépendant et n'est ni une application officielle ni affilié à Rituals.
