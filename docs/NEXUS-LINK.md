# RITUEL ↔ NEXUS LINK — préparation

Le client commun `link-core.js` est maintenant présent dans ce dépôt **sans être chargé dans l'application**. Aucune routine ni donnée de stock n'est lue ou envoyée.

La future connexion utilisera le relais chiffré `nexus-link-api`, les scopes prévus dans NEXUS (`restock_purchase`, `restock_task`, `product_paid`, `routine_schedule`, `routine_summary`) et la validation manuelle des propositions dans NEXUS.

**Précondition avant toute activation RITUEL :** isoler son origine HTTPS de celle de NEXUS. Actuellement, les deux PWA GitHub Pages utilisent des chemins de `leomgl.github.io` : cela ne suffit pas à isoler les données web. La migration devra préserver les installations iPhone, sauvegardes et abonnements push par export/restauration vérifiés.

La connexion Gaming ↔ NEXUS est actuellement la seule prise en charge par une interface de jumelage ; elle ne partage pas de données métier.
