# Bastion Route — Tower Defense

Jeu de défense de tours **jouable, en français**, créé avec Phaser 3, Vite, TypeScript et Capacitor. Projet indépendant : aucun autre dossier du dépôt n'est nécessaire.

## Jouer

- Dans le menu, choisissez un secteur débloqué. Trois secteurs et 6, 7 puis 8 vagues.
- Choisissez une tour à droite, puis touchez/cliquez une **case libre hors du chemin**. Le mode placement reste actif pour placer plusieurs tours ; retouchez la carte ou la tour choisie pour changer de mode.
- Touchez une tour déjà construite pour voir sa portée, l'améliorer (jusqu'au niveau 3) ou la vendre (65 % du coût investi).
- Lancez la vague quand vos défenses sont prêtes. Éliminez les drones, coureurs et blindés avant qu'ils atteignent la base. Les ennemis donnent des pièces et des points ; chaque vague terminée donne un bonus. La base perd des vies quand un ennemi passe.
- Commandes : souris ou toucher ; boutons **pause**, **son**, **vitesse 1×/2×** ; `Échap` pour suspendre/reprendre sur ordinateur.
- La progression (secteurs déverrouillés, meilleurs scores, son) est conservée dans le stockage local du navigateur / de la WebView. Une partie en cours n'est **pas** sauvegardée.

## Lancer / compiler le Web

Pré-requis : Node.js 20.19+ ou 22.12+ et npm.

```bash
cd tower-defense
npm ci
npm run dev          # développement : http://localhost:5173
npm run typecheck    # vérification TypeScript
npm test             # tests Vitest
npm run build        # dist/ : version Web autonome
npm run preview      # teste dist/ : http://localhost:4173
```

Pour un hébergement statique, publiez le contenu de `dist/` à la racine du site. Aucun serveur de jeu ni compte n'est nécessaire. Les captures de vérification sont dans `screenshots/`.

## Générer un APK Android avec Android Studio

**Un APK n'a pas été généré dans l'environnement de livraison** : il n'y a ni Java/JDK ni Android SDK. Le projet Android Capacitor est déjà créé dans `android/` et les ressources graphiques de l'application sont personnalisées.

1. Installez **Android Studio**, son **JDK intégré 17**, Android SDK Platform **35** et Android SDK Build-Tools **35.x** (Android Studio > SDK Manager). Activez les licences du SDK si nécessaire. Installez Node.js et npm aux versions ci-dessus.
2. Décompressez l'archive, ouvrez un terminal **dans `tower-defense/`**, puis :
   ```bash
   npm ci
   npm run android:sync
   ```
   Cette commande construit le Web et copie les ressources compilées dans le projet Android. À refaire après chaque changement de code.
3. Ouvrez `tower-defense/android/` dans Android Studio (`File > Open`) ou exécutez `npm run android:open`. Configurez le **Gradle JDK** sur le JDK 17 intégré et laissez Gradle synchroniser (connexion Internet requise pour ses dépendances). Le wrapper fourni utilise Gradle 8.11.1 et le plugin Android 8.7.2.
4. Dans Android Studio : **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Récupérez l'APK debug installable dans `tower-defense/android/app/build/outputs/apk/debug/app-debug.apk` (avec les options par défaut).
5. Pour installer : `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` ou copiez l'APK sur l'appareil et ouvrez-le en autorisant l'installation. Android **6.0 / API 23** minimum.
6. Pour une distribution publique, utilisez **Build > Generate Signed Bundle / APK**, créez une clé privée conservée en lieu sûr, signez une variante release et respectez les politiques de confidentialité et de publication du magasin. Ne publiez pas l'APK debug comme version de production.

Il n'y a **pas** de kit publicitaire intégré. `src/platform/ads.ts` définit uniquement le contrat d'injection d'un futur fournisseur d'interstitiels et de publicités récompensées. Un ajout futur exigera un vrai SDK, une gestion du consentement et des politiques de confidentialité. Aucun bouton de publicité factice n'est affiché.

## Structure

- `src/core/config.ts` : cartes, statistiques, vagues, économie et fonctions testables.
- `src/core/progression.ts` : sauvegarde locale tolérante aux erreurs.
- `src/game/GameScene.ts` : simulation Phaser, pathfinding sur itinéraire fixe, combat, projectiles, effets et sons synthétisés.
- `src/main.ts`, `src/style.css` : interface et commandes responsives.
- `src/platform/ads.ts` : port d'intégration publicitaire non utilisé.
- `tests/` : tests automatisés ; `android/` : projet Capacitor natif ; `dist/` : build Web (fourni dans l'archive).

## Limites

Pas de backend, multijoueur ou synchronisation cloud ; pas de sauvegarde d'une bataille en cours. L'APK et les performances sur un véritable appareil Android n'ont pas pu être vérifiés ici faute de SDK et d'appareil. Phaser représente l'essentiel du poids JavaScript (environ 342 Ko compressés pour le bundle). Consultez `RAPPORT.md` pour les contrôles réellement effectués.
