# NOKI Operations — standard UI NOKI Admin (refonte en un lot)

Référence : `Agrismartchain/noki-admin` · `release/admin-prod-01` · `130eb808a5cc581bdb2edf55167003b7a818742c`.
Baseline Operations : `cloud/continuation-2026-10-29` · `7aeb27526872ae7e9e41f9019132c6f2d71f4590`
(image GHCR `sha256:45c3226a968fd09ee8ca5b704819cc5b56f17c50bcfa400782694027b5a36833`, produite par le run « Container Image » n°14
sur ce commit : vérifié dans les logs GitHub). **Limite :** la version réellement déployée dans Coolify n'est pas consultable depuis
cette session ; la correspondance baseline ↔ déploiement repose sur GitHub/GHCR.

Le design system partagé (`@agrismartchain/noki-design-system@0.2.1`) n'est pas modifié ; tout vit dans la couche applicative.
Aucun changement d'API, de permissions, d'authentification/MFA ni de flux opérationnel.

## Ce qui a été porté
| Domaine | Fichiers |
|---|---|
| Logo NOKI jaune (login, sidebar), favicon | `src/components/brand/noki-logo.*`, `src/assets/brand/noki-logo-sidebar.png`, `src/app/{icon.png,apple-icon.png,favicon.ico}` |
| Login split-screen (FR/EN/AR, RTL, 4 largeurs, clair/sombre) | `src/components/auth/auth-split-layout.*`, `operations-auth-layout.tsx`, `login-form.*`, page `(auth)/login` |
| Fond de login propre au métier | `src/assets/brand/login/operations-dashboard-bg.svg` (plan d'entrepôt : racks, palettes, parcours de picking, quais — illustration vectorielle originale) |
| Sidebar (plate, 48 px, icônes 20 px, actif lisible, 18,5 rem) | `src/components/shell/admin-sidebar-view.*`, `admin-sidebar.tsx`, icône Food ajoutée (`src/domains/icons.tsx`) |
| Pied de page dynamique `© <année> NOKI — Tous droits réservés` | `src/components/shell/app-footer.*`, slot `footer` de `admin-shell.tsx`, layout `(protected)` |
| Contrôles 48/44 px, bordures ≥ 3:1, texte d'erreur ≥ 4,5:1, réserve de défilement des notifications | `src/app/globals.css` (variables `--admin-control-height(-compact)`, filet de sécurité boutons/champs, bordures par thème, `--admin-danger-text`, toast clearance) |
| Spécifique Operations | actions de ligne des tableaux 44 px (`ops-tables.module.css`), déclencheur du menu mobile du design system 44×44 px |

## Écarts volontaires avec Admin
- Navigation **plate** (pas de sections) : pas de règles de sections/imbriqués.
- Le déclencheur du menu mobile (2,5 rem = 37,5 px) est corrigé ici ; **Admin a le même défaut non corrigé** (à reporter).
- Textes de marque du login propres à Operations (clés `auth.branding.highlights.*`, FR/EN/AR).

## Tests
- Unitaires : `pnpm test` (90). Contrat CSS, favicon, logo, layout, pied de page, parité des 3 catalogues.
- UI (API simulée, hors CI comme la suite de recette) : `pnpm test:ui` → `playwright.ui.config.ts`, 51 tests :
  login × 3 langues × 4 largeurs × 2 thèmes, sidebar/pied/tiroir, MFA (vérification + enrôlement, clair/sombre, RTL),
  balayage de 17 routes (contrôles ≥ 44 px, bordures ≥ 3:1, aucun débordement, aucun `[object Object]`), formulaire d'ajustement
  de stock + notifications, états des champs (repos/survol/focus/erreur) et contraste du texte d'erreur.
- Pile de test : `e2e-ui/support/stub-api-server.mjs` (généré depuis l'OpenAPI des contrats partagés ; MFA, typage des champs
  nullables, détail d'expédition entrante, stocks/mouvements/expéditions) et `origin-proxy.mjs` (présente l'origine publique
  configurée pour les routes `/api/auth/*` ; **la garde CSRF de l'application n'est ni modifiée ni contournée**).

## Accessibilité des actions de tableau (correction fonctionnelle)
Le tableau partagé masque ses colonnes de priorité moyenne à ≤ 767 px et basse à ≤ 1023 px ; l'action « Ajuster » de l'inventaire
(formulaire en ligne dans une colonne moyenne) disparaissait donc sur téléphone, et débordait sur portable étroit.
- **Inventaire :** jusqu'à 1279 px, chaque ligne affiche un bouton **Ajuster** (≥ 44 px) qui ouvre une boîte de dialogue contenant
  **le même formulaire réel** (`AdjustStockFields`, même action serveur, mêmes champs, mêmes validations) ; elle se ferme sur
  succès. À partir de 1280 px la colonne en ligne est inchangée.
- **Tableaux (≤ 1279 px)** : les colonnes de priorité basse sont masquées (`globals.css`) pour que l'action de fin de ligne
  (« Voir ») reste dans l'écran avec la sidebar élargie. Les autres listes utilisent la colonne d'actions du design system, toujours
  visible ; leurs actions critiques vivent sur les pages de détail (vérifiées aux 4 largeurs).
- **Garde-fou** (`e2e-ui/table-actions.spec.ts`) : aucune ligne ne peut contenir un contrôle interactif dans une cellule masquée sans
  alternative visible ouvrant une boîte de dialogue ; l'action de ligne de chaque liste est visible, ≥ 44 px et dans l'écran
  (FR/AR × 390/768/1024/1440) ; le vrai formulaire est soumis et la requête vers l'API est vérifiée (type, quantité, motif, produit).

## Limites connues (existantes avant la refonte, identiques à la baseline)
- Libellés hors champ de ce lot : « Shipping Orders » non traduit en FR, statuts bruts (`CONFIRMED`…), titre de la barre
  supérieure statique (« Tableau de bord »).
- Fond de login : illustration vectorielle, remplaçable par une photographie sans changement de code.
- La référence visuelle « Wakama » n'a pas été disponible pour cette session ; l'architecture suit celle d'Admin validée.
