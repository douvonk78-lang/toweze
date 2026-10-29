# Rapport de livraison — Bastion Route

Date : 29 octobre 2026.

## Livré

- Projet indépendant `tower-defense/` avec code TypeScript, Phaser 3, Vite, dépendances et verrouillage npm, tests, documentation et projet Android Capacitor.
- Trois cartes, trois tours (tir rapide, explosion de zone, ralentissement), trois familles d'ennemis, amélioration (3 niveaux), vente, ressources, score, vies, bonus de vague, pause, vitesse 1×/2×, écrans de victoire et défaite, sons synthétisés, commandes tactiles, progression locale.
- Version Web compilée dans `dist/`, captures dans `screenshots/` et icônes Android personnalisées.
- Architecture publicitaire future : **interface uniquement**, sans SDK ni fausse publicité.

## Vérifications réellement effectuées

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` | Réussi (TypeScript strict) |
| `npm test` | Réussi : 5 tests (cartes, statistiques, vagues, sauvegarde et récupération) |
| `npm run build` | Réussi (Vite) ; bundle JS ≈ 342 Ko gzip |
| `npx cap add android` puis `npx cap sync android` | Réussis, projet Android et ressources Web copiées |
| Chromium réel, bureau 1440×900 | Menu, canvas, placement, coût, amélioration, vente, première vague, pause, reprise et vitesse vérifiés ; 0 erreur JS |
| Chromium réel, mobile simulé 390×844 | Interface et commandes visibles, aucun débordement horizontal ; capture enregistrée |
| Chromium réel, scénario sans tours | Vagues 1 à 3, défaite, écran de résultat, bouton rejouer : vérifiés |
| Chromium réel, scénario avec tours | Six vagues du secteur 1 jouées jusqu'à **VICTOIRE** (20 vies restantes), sans erreur JS |
| Chromium réel, transition de vague | Bonus attribué **une seule fois**, démarrage de la vague 2 vérifié |
| Chromium réel, sauvegarde | Rechargement du navigateur avec progression locale : niveau 2 déverrouillé et record affiché |

## Limites et points d'attention

- **Aucun APK livré** : `java`, Gradle système et SDK Android absents de cet environnement. Le projet Android est prêt pour une compilation avec Android Studio suivant `README.md` ; aucune compilation native ni essai sur appareil physique ne sont revendiqués.
- Aucun SDK publicitaire, aucune publicité, aucune télémétrie ni consentement sont inclus. La monétisation devra être ajoutée et validée ultérieurement.
- La sauvegarde couvre la progression, pas une bataille interrompue. Le stockage local peut être effacé par le navigateur.
- Une alerte Vite signale un chunk JavaScript supérieur à 500 Ko : il s'agit principalement du moteur Phaser, environ 342 Ko gzip. Les graphiques du jeu sont procéduraux, sans chargement d'images externes en cours de partie.
- Test mobile en émulation de viewport Chromium, **pas** sur téléphone Android réel. Le son dépend des restrictions audio du navigateur/WebView.
