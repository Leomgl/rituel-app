# RITUEL — mini-app de soins, version 1.0

Une application web installable (PWA) pour un suivi matin/soir de 9 produits Rituals. Le projet fonctionne sans dépendances externes et les données restent sur l'appareil.

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

## Mettre l'application sur iPhone

1. Décompresser le ZIP sur un ordinateur, sans changer l'arborescence.
2. Déployer le **contenu du dossier `rituel-v1`**, en glissant ce dossier sur <https://app.netlify.com/drop>. On obtient une URL HTTPS. Les fichiers statiques n'ont pas besoin de compilation. L'URL sera publique par défaut, mais les cases cochées restent enregistrées localement sur le téléphone.
3. Ouvrir l'URL dans **Safari sur l'iPhone**.
4. Appuyer sur **Partager** → **Sur l'écran d'accueil** → activer « Ouvrir comme app » si proposé → **Ajouter**.
5. Ouvrir l'icône RITUEL. Sans connexion après le premier chargement, le suivi reste utilisable grâce au cache hors ligne.

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
