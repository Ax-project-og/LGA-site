# CLAUDE.md — Site LG Advisory

Ce fichier guide Claude Code sur ce dépôt. C'est une ébauche : à enrichir au fil du projet.

## Le projet
- **LG Advisory** (Laurent Gayet Advisory) : cabinet de conseil patrimonial et fiscal indépendant
  fondé en 2026 par Laurent Gayet (docteur en droit, ancien inspecteur des impôts, avocat fiscaliste,
  ancien Deputy CEO d'AXA Wealth Europe).
- Expertises : fiscalité et droit du patrimoine, transmission, assurance-vie FR/LU, mobilité internationale.
- Public : familles, dirigeants, professionnels du patrimoine. Ton sobre, précis, haut de gamme, sans jargon marketing.
- Domaine prévu : https://lg-advisory.eu/ — hébergement et déploiement : **à définir**.
- Choix assumé : site codé à la main (pas de WordPress), maintenu avec Claude Code, et qui doit
  pouvoir évoluer (nouvelles pages, contenus réguliers, fonctionnalités) sans devenir lourd.

## État actuel
- `index.html` : page d'accueil one-page (hero avec portrait, chiffres clés, bandeau presse, Expertise,
  Démarche, Parcours, bandeau citation, 3 dernières publications, Contact, footer).
- `publications.html` : liste complète des publications par année, avec filtres par type (tribune / entretien / intervention).
  Même design que l'index : en-tête vert, barre de filtres qui chevauche, cartes par année, bandeau presse.
- `portrait.jpg` : photo de Laurent Gayet (carrée, 1149 px), utilisée dans le hero et la signature du Parcours.
- `mentions-legales.html` et `confidentialite.html` : pages légales (sommaire latéral, sections numérotées).
  Les informations manquantes sont balisées `<mark class="todo">[À compléter : …]</mark>` (surlignées en jaune).
- `fonts/` : polices auto-hébergées (woff2, sous-ensemble latin) déclarées en `@font-face` en tête du CSS
  de chaque page. **Ne pas réintroduire Google Fonts** ni aucun service tiers (CDN, statistiques, cookies)
  sans mettre à jour `confidentialite.html`, qui affirme que le site ne dépose aucun cookie ni ne contacte de tiers.
- Pas de build, pas de dépendances, pas de tests. Aperçu local : ouvrir le fichier dans un navigateur.

## Design (index.html, référence pour les autres pages)
- Identité **fixe**, sans bascule automatique en mode sombre : sections vert profond (`--deep` #1F3A32 :
  header, hero, citation, contact ; `--deepest` : footer) alternées avec des sections ivoire (`--ivory`)
  et sable (`--sand`), accents laiton (`--brass`, `--brass-light` sur fond vert). Le vert est apprécié
  du client (« finance premium ») : le garder dominant.
- Typo : `--serif` Libre Caslon Display (titres), `--serif-italic` Libre Caslon Text italique pour les
  mots mis en valeur via `<em>` dans les titres, `--sans` Figtree (texte).
- Composants récurrents : `.eyebrow` (sur-titre laiton avec filet), cartes blanches à bordure fine qui se
  soulèvent au survol, `.btn-brass` / `.btn-ghost` (fond vert) / `.btn-dark` (fond clair), icônes SVG
  en trait inline, rosace guillochée `#rosace` (définie une fois en haut du `<body>`, réutilisée via `<use>`).
- Animations : `.reveal` (apparition au défilement, IntersectionObserver) pour le contenu sous la ligne
  de flottaison ; le hero et les chiffres clés ont une animation CSS au chargement. Respect de `prefers-reduced-motion`.
- Points de rupture : 900px (nav mobile, grilles hero/parcours/stats), 800px (grilles de sections), 480px.
- Typographie française : `&nbsp;` avant `: ; ? !` et à l'intérieur des guillemets « ».
- Vérification visuelle : si l'extension Chrome n'est pas connectée, utiliser Chrome headless
  (`chrome.exe --headless=new --screenshot=… --window-size=1440,6400 file:///…/index.html`) ;
  la largeur minimale de fenêtre headless est ~500 px, tester le mobile via une iframe de 375 px.

## Points d'attention techniques
- **CSS, en-tête, footer et JS sont dupliqués dans chaque page.** Toute modification commune
  (tokens, nav, footer, mentions légales, scripts) doit être reportée dans chaque page tant que ce
  n'est pas factorisé.
- Liens de nav : ancres `#section` dans `index.html`, `index.html#section` depuis les autres pages ;
  `aria-current="page"` sur la page active.
- Utiliser les variables CSS, pas de couleurs en dur.
- Nouvelle page : partir d'une page existante (en-tête, rosace, footer, script commun) et ajouter le lien
  dans la nav et/ou le footer de toutes les pages.
- Accessibilité à préserver : lien d'évitement, `:focus-visible`, `aria-expanded` sur le menu,
  `aria-pressed` sur les filtres, `prefers-reduced-motion`, `lang="fr"`, `alt` sur les images de contenu.
- Liens externes : `target="_blank" rel="noopener"`.

## Ajouter une publication
1. Dans `publications.html`, ajouter un `<li class="pub" data-type="tribune|entretien|intervention">`
   (copier une carte existante, lien « Lire » compris) dans le bon `.year-group` (créer le groupe si l'année
   est nouvelle, ordre décroissant, avec la classe `reveal`).
2. Mettre à jour les compteurs des boutons de filtre (`.count`) et le résumé `.filter-summary`
   (nombre total et plage d'années), ainsi que le chiffre « 18 » des chiffres clés de `index.html`.
3. Si elle fait partie des 3 plus récentes, mettre à jour la liste `.articles` de `index.html`
   (et le « près de vingt » de l'intro si besoin).

## Règles de contenu
- Site d'un professionnel du conseil financier : **ne jamais inventer** de faits (dates, postes,
  chiffres, citations, publications). Ce qui n'est pas confirmé se signale par un commentaire `<!-- à vérifier -->`.
- Pas de promesse de rendement ni de formulation pouvant passer pour un conseil personnalisé ;
  conserver l'avertissement du footer.
- Rédaction en français soigné, typographie française (espaces avant `: ; ? !`, guillemets « »).

## À faire / éléments en attente
- Compléter tous les `[À compléter]` des pages légales (`grep -n "class=\"todo\"" *.html`) : forme juridique,
  SIREN, siège, ORIAS, statut CIF et association AMF, RC pro, médiateur, hébergeur, photographe, date de mise en ligne.
  **Aucune mise en ligne tant qu'il en reste.** Reporter aussi les mentions réglementaires dans le footer (bloc commenté).
- Téléphone (bloc commenté dans Contact).
- Dates à vérifier : fin de période AXA Wealth Europe (timeline) et publications marquées « année à vérifier ».
- Sitemap, `robots.txt`, image de partage `og:image` au format 1200×630.

## Pistes d'évolution (non décidées)
- Factoriser le CSS commun dans un fichier partagé (`styles.css`) dès qu'une 3e page arrive.
- Si le site grandit (actualités, articles, versions EN) : passer à un générateur statique léger
  (Eleventy ou Astro) avec gabarits partagés et publications en données (JSON/Markdown).
- Formulaire de contact / prise de rendez-vous (service tiers ou fonction serverless), à arbitrer selon l'hébergement.
- Version anglaise (clientèle internationale, Luxembourg).

Toute décision prise sur ces sujets doit être reportée ici.
