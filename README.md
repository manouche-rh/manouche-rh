# Man'ouché RH — MVP V1

Application RH installable (PWA) pour la gestion du planning, des pointages et de l'équipe Man'ouché.

## Fichiers du projet

| Fichier | Rôle |
|---|---|
| `index.html` | Page principale (markup + design system CSS) |
| `app.js` | Logique applicative (auth, Firebase, vues, anomalies) |
| `manifest.webmanifest` | Manifeste PWA (nom, icônes, couleurs) |
| `sw.js` | Service worker (cache + offline) |
| `icon.svg` | Icône vectorielle |
| `icon-192.png` | Icône Android (192px) |
| `icon-512.png` | Icône Android/iOS (512px) |

## Fonctionnalités MVP V1

### Côté admin (toi)
- Tableau de bord avec KPI temps réel
- Construction du planning hebdomadaire (clic sur cellule → édition shift)
- Gestion des salariés (CRUD : créer, éditer, supprimer)
- Historique des pointages sur 14 jours
- **Détection automatique d'anomalies** (5 règles métier)
- Navigation par sidebar (desktop) ou menu déroulant (mobile)

### Côté salarié (mobile-first)
- Pointage en 1 clic (entrée / sortie)
- Vue planning de la semaine
- Compteur d'heures du mois (réel vs planifié)
- Profil personnel (contrat, congés)
- Signalement de modification de pointage

### Règles d'anomalies détectées
1. **Oubli de pointage** — planning prévu mais aucun pointage
2. **Pointage hors planning** — pointage sans shift prévu
3. **Pointage incomplet** — entrée sans sortie sur un jour passé
4. **Écart contrat/réel** — différence ≥ 1h entre planning et réel
5. **Heures sup non déclarées** — dépassement > 3h du contrat hebdo

## Déploiement sur GitHub Pages

### Option 1 — Remplacer ton dépôt actuel

Si tu utilises déjà `kozbarijad.github.io` :

1. Connecte-toi à GitHub
2. Va dans le dépôt `kozbarijad.github.io` (ou crée un nouveau dépôt dédié `manouche-rh`)
3. Upload les 7 fichiers à la racine
4. Active GitHub Pages dans **Settings → Pages → Branch: main → Save**
5. L'URL est `https://kozbarijad.github.io/` (ou `https://kozbarijad.github.io/manouche-rh/`)

### Option 2 — Sous-dossier dédié

1. Dans ton dépôt actuel, crée un dossier `rh/`
2. Upload les 7 fichiers dans `rh/`
3. URL : `https://kozbarijad.github.io/rh/`

### Lien à partager avec tes salariés

Un seul lien (ex: `https://kozbarijad.github.io/rh/`). Sur leur téléphone :
- **iOS Safari** : Partager → "Ajouter à l'écran d'accueil"
- **Android Chrome** : menu ⋮ → "Ajouter à l'écran d'accueil"

Une icône M apparaît, et l'app s'ouvre en plein écran comme une vraie app.

## Identifiants par défaut

**Admin** : `admin` / `0000`

**Salariés** (mot de passe `1234` pour tous au démarrage — à modifier dans Salariés)
- johnny, ahmad.y, jeremie, oussama, dababo, omar

## Important — Règles Firebase

Le projet `manouche75003` utilise l'authentification anonyme. Vérifie que tes règles Firebase ressemblent à :

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Si tu vois encore des avertissements "lecture publique", va dans la console Firebase → Realtime Database → Rules → applique les règles ci-dessus.

## Données existantes

L'app utilise le même projet Firebase que RH_ULTIME.html (`manouche75003`). **Tes salariés et plannings existants sont automatiquement repris.** Au premier lancement, si la base est vide, elle sera initialisée avec les 6 salariés actifs par défaut.

## Limitations connues (à venir en V2)

- Pas d'export Excel paie pour l'instant (V2)
- Pas de génération de contrats Word (V2)
- Pas de génération de planning IA (V2)
- Pas de notifications push (V2)
- Pas de gestion complète des congés (V2)
