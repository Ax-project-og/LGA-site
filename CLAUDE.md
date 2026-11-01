# CLAUDE.md — Site LG Advisory

Ce fichier guide Claude Code sur ce dépôt. C'est une ébauche : à enrichir au fil du projet.

## Le projet
- **LG Advisory** (Laurent Gayet Advisory) : cabinet de conseil patrimonial et fiscal indépendant
  fondé en 2026 par Laurent Gayet (docteur en droit, ancien inspecteur des impôts, avocat fiscaliste,
  ancien Deputy CEO d'AXA Wealth Europe).
- Expertises : fiscalité et droit du patrimoine, transmission, assurance-vie FR/LU, mobilité internationale.
- Public : familles, dirigeants, professionnels du patrimoine. Ton sobre, précis, haut de gamme, sans jargon marketing.
- Domaine prévu : https://lg-advisory.eu/ — hébergement décidé : **dépôt GitHub privé + Cloudflare Workers**
  (fichiers statiques + petit Worker pour le formulaire). Procédure : `DEPLOIEMENT.md`.
- Choix assumé : site codé à la main (pas de WordPress), maintenu avec Claude Code, et qui doit
  pouvoir évoluer (nouvelles pages, contenus réguliers, fonctionnalités) sans devenir lourd.

## État actuel
- `index.html` : page d'accueil one-page (hero avec portrait, chiffres clés, bandeau presse, Expertise,
  Démarche, Parcours, bandeau citation, 3 dernières publications, Contact, footer).
- Menu de l'en-tête : Expertise, Parcours, Publications, Contact (« Démarche » retiré du menu le 31/10/2026, conservé dans le footer
  et comme section de l'accueil).
- `publications.html` (ex-`publications2.html`, devenue officielle le 31/10/2026 ; l'ancienne version a été supprimée) :
  publications et archives, pour plusieurs dizaines d'articles. Liste compacte par année, recherche (sans accents, surlignage), filtres
  thème / type / revue, tri, frise des années (bande horizontale sur mobile), filtres conservés dans l'URL (`?theme=…`).
  Chaque `<li class="pub">` porte `data-type` (article|tribune|entretien|intervention), `data-themes`, `data-source`, `data-keywords`.
- `articles/` : une page par article de revue archivé (texte retranscrit + fac-similé dans une visionneuse avec zoom
  et plusieurs pages), JSON-LD `Article`. **Pages générées, ne pas les modifier à la main** :
  source = `articles/_sources/<slug>.html` (commentaire JSON de métadonnées : titre, revue, date, thèmes, scans,
  `verify` pour ce qui reste à vérifier, puis le texte en HTML), gabarit = `articles/_outils/modele.html`,
  génération = `node articles/_outils/construire.mjs` (régénère les pages et les entrées `<!-- archive:… -->` de `publications.html`, et le bloc `<!-- articles -->` de `sitemap.xml`).
  `"masque": true` dans les métadonnées met un article de côté (ni page ni entrée) : c'est le cas de « Paquet fiscal » (2007),
  signé par C. Bellivier et C. Gomez, en attente de la réponse de Laurent Gayet.
  Mise en page des articles (`mainEssai` dans le générateur, styles `.essai` du gabarit) : bande verte réduite au fil d’Ariane,
  en-tête d’article (rubrique, titre, fonction, fiche auteur/revue/date/numéro/lecture) juste au-dessus du texte, fac-similé
  aligné sur le titre, avertissement en fin de texte, cartes « Article précédent / suivant ». `"essai": false` dans une source
  rétablit l’ancienne mise en page (en-tête vert).
  Bouton « Liste / Cartes » (barre de résultats) : `#list[data-view="grille"]` affiche les mêmes `<li class="pub">` en cartes
  (piste 3 de `test.html`) ; choix conservé dans l’adresse (`?vue=grille`) et dans le navigateur (`localStorage`).
  Mise en forme de la liste : zone sable, une carte blanche par année, frise des années simple (filet vertical, version d'origine), titres en Figtree 600
  (Caslon Display est illisible en petit corps), bouton vert « Texte intégral » pour les archives, lien encadré pour les sites externes.
  Scans web dans `articles/scans/` (`<slug-du-pdf>[-p<n>].jpg`, portrait 2000 px / double page 3200 px, qualité 78, + `-vignette.jpg` 640 px).
- `LG article scan/` : PDF scannés d'origine (non publiés), renommés `AAAA-revue-sujet[-n].pdf` ; `_correspondance.tsv` garde les noms d'origine.
  Ajouter un article : scanner, renommer, exporter les JPEG, écrire la source, lancer le script.
- `test.html` : page de travail (non publiée, dans `.assetsignore`) comparant 6 pistes d'encadrés pour la liste des publications.
- `portrait.jpg` : photo de Laurent Gayet (carrée, 1149 px), utilisée dans le hero et la signature du Parcours.
- `contact.html` (ex-`rendez-vous.html`) : page « Contact » (bouton du menu ; les boutons de l'accueil gardent « Prendre rendez-vous ») (en-tête vert, formulaire de demande dans une carte blanche,
  colonne « Comment se déroule le premier échange » + carte coordonnées). Page plus large que les autres :
  en-tête, contenu et footer utilisent `.wrap-wide` (`--wrap-wide` 86rem au lieu de 74rem). Tous les liens vers le formulaire
  y mènent. Le formulaire poste vers `/api/rendez-vous` (envoi `fetch`, repli sans JS par redirection `?envoye=1` / `?erreur=1`).
- `worker/index.js` + `wrangler.jsonc` : Worker Cloudflare qui sert les fichiers (binding `ASSETS`) et traite le formulaire
  (pot-de-miel, vérification Turnstile avec le secret `TURNSTILE_SECRET`, e-mail à contact@ via l'API Brevo, secret `BREVO_API_KEY`).
  Rien n'est stocké. `.assetsignore` liste les fichiers à ne pas publier (y ajouter tout nouveau fichier interne).
- `mentions-legales.html` et `confidentialite.html` : pages légales (sommaire latéral, sections numérotées).
  Les informations manquantes sont balisées `<mark class="todo">[À compléter : …]</mark>` (surlignées en jaune).
- `robots.txt` et `sitemap.xml` : adresses propres sans `.html` (Cloudflare redirige `/page.html` vers `/page`), comme les `<link rel="canonical">`.
  **Toute nouvelle page doit être ajoutée au sitemap** (et `lastmod` mis à jour lors d'un changement notable).
- `fonts/` : polices auto-hébergées (woff2, sous-ensemble latin) déclarées en `@font-face` en tête du CSS
  de chaque page. **Ne pas réintroduire Google Fonts** ni aucun service tiers (CDN, statistiques, cookies)
  sans mettre à jour `confidentialite.html`, qui affirme que le site ne dépose aucun cookie et que le seul tiers
  est Cloudflare (hébergeur, et Turnstile chargé uniquement sur `contact.html`), Brevo relayant les e-mails du formulaire côté serveur.
- `logos/` : pistes de monogramme LG (SVG laiton et vert + `planche.html` de comparaison), non publié
  (listé dans `.assetsignore`). Aucune piste choisie pour l'instant ; le site utilise toujours le carré `.brand-mark`.
- `motifs/planche.html` : 9 pistes de motif de fond pour le hero (alternatives à la rosace), non publié (listé dans `.assetsignore`). Aucune décision.
- Pas de build, pas de dépendances, pas de tests. Aperçu local : ouvrir le fichier dans un navigateur ;
  pour tester le formulaire : `.dev.vars` + `npx wrangler dev` (voir `DEPLOIEMENT.md`).

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
- **Article de revue archivé** (texte + fac-similé) : voir `articles/` ci-dessus ; le script met à jour la liste, le compteur et le sitemap.
- **Publication externe** (tribune, entretien, vidéo…) : dans `publications.html`, copier un `<li class="pub">` sans commentaire
  `archive` dans le bon `.year-group` (créer le groupe si l'année est nouvelle, ordre décroissant), puis relancer le script pour le compteur.
- Puis mettre à jour le chiffre des chiffres clés de `index.html` (33 au 31/10/2026) et l'intro « Plus de trente… », et la liste
  `.articles` de l'accueil si la publication fait partie des 3 plus récentes.

## Règles de contenu
- Site d'un professionnel du conseil financier : **ne jamais inventer** de faits (dates, postes,
  chiffres, citations, publications). Ce qui n'est pas confirmé se signale par un commentaire `<!-- à vérifier -->`.
- Pas de promesse de rendement ni de formulation pouvant passer pour un conseil personnalisé ;
  conserver l'avertissement du footer.
- Rédaction en français soigné, typographie française (espaces avant `: ; ? !`, guillemets « »).
- Positionnement : « stratégie patrimoniale » / « consultant en stratégie patrimoniale », et non « conseil patrimonial »
  dans les accroches (titre, sur-titre, `brand-tag`, footer, balises meta). Les pages légales et avertissements gardent leur vocabulaire réglementaire.

## À faire / éléments en attente
- Compléter tous les `[À compléter]` des pages légales (`grep -n "class=\"todo\"" *.html`) : forme juridique,
  SIREN, siège, ORIAS, statut CIF et association AMF, RC pro, médiateur, hébergeur, photographe, date de mise en ligne.
  **Aucune mise en ligne tant qu'il en reste.** Reporter aussi les mentions réglementaires dans le footer (bloc commenté).
- Téléphone (bloc commenté dans Contact).
- Dates à vérifier : fin de période AXA Wealth Europe (timeline) et publications marquées « année à vérifier ».
- Image de partage `og:image` au format 1200×630.
- Avant la mise en ligne du formulaire (voir `DEPLOIEMENT.md`) : remplacer la clé Turnstile de test
  (`data-sitekey` de `contact.html`), définir les secrets `TURNSTILE_SECRET` et `BREVO_API_KEY`,
  et configurer Brevo (domaine authentifié dans la zone DNS OVH, clé API). La messagerie contact@ reste chez OVH.

## Pistes d'évolution (non décidées)
- Factoriser le CSS commun dans un fichier partagé (`styles.css`) dès qu'une 3e page arrive.
- Si le site grandit (actualités, articles, versions EN) : passer à un générateur statique léger
  (Eleventy ou Astro) avec gabarits partagés et publications en données (JSON/Markdown).
- Version anglaise (clientèle internationale, Luxembourg).

Toute décision prise sur ces sujets doit être reportée ici.
