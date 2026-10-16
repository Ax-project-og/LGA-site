# Déploiement — GitHub privé + Cloudflare Workers

Le site est publié comme un **Worker Cloudflare avec fichiers statiques** : les pages HTML sont servies
telles quelles, et `worker/index.js` traite uniquement le formulaire de rendez-vous (`POST /api/rendez-vous`).
Configuration : `wrangler.jsonc` ; fichiers exclus de la publication : `.assetsignore`.

Deux temps :
- **Phase A (maintenant)** : site de préproduction sur une adresse `….workers.dev`, protégée par mot de passe
  (Cloudflare Access). Le domaine lg-advisory.eu garde sa page « en construction ».
- **Phase B (plus tard)** : rattacher lg-advisory.eu, une fois tous les `[À compléter]` des pages légales renseignés.

---

## Phase A — Préproduction sur workers.dev

### A1. Pousser le code sur GitHub
Le dépôt `Ax-project-og/LGA-site` doit contenir la dernière version (dont `wrangler.jsonc` et `worker/`).

### A2. Créer le Worker relié au dépôt
1. Créer un compte gratuit sur https://dash.cloudflare.com/sign-up (puis valider l'e-mail).
2. Menu de gauche : **Compute (Workers)** → **Workers & Pages** → bouton **Create** (Créer).
3. Choisir **Import a repository** (Importer un dépôt) → **Connect GitHub**.
4. Sur GitHub, l'application « Cloudflare Workers and Pages » demande l'autorisation :
   choisir le compte `Ax-project-og`, cocher **Only select repositories** → `LGA-site` → **Install & Authorize**.
5. De retour sur Cloudflare, sélectionner le dépôt `LGA-site` puis renseigner :
   - **Project name** : `lg-advisory` (doit être identique au `"name"` de `wrangler.jsonc`) ;
   - **Build command** : laisser vide ;
   - **Deploy command** : `npx wrangler deploy` (valeur par défaut) ;
   - **Root directory** : `/` ; **Production branch** : `main`.
6. **Create and deploy** (ou *Save and Deploy*). Au premier Worker, Cloudflare demande de choisir un
   sous-domaine `workers.dev` (ex. `lga`) : le site sera alors sur `https://lg-advisory.lga.workers.dev`.
7. Le suivi du déploiement s'affiche (onglet **Deployments** / **Builds**). Ensuite, **chaque push sur `main`
   redéploie automatiquement** le site.

### A3. Protéger l'adresse de préproduction
L'adresse `workers.dev` est publique : tant que les pages légales ne sont pas complètes, la réserver aux personnes autorisées.
1. Worker `lg-advisory` → **Settings** → **Domains & Routes** → ligne `workers.dev` → activer **Cloudflare Access**.
2. Cloudflare crée l'application d'accès ; dans **Zero Trust** → **Access** → **Applications** → cette application →
   **Policies**, autoriser uniquement les adresses e-mail voulues (ex. la vôtre et celle de Laurent Gayet).
   Pour entrer sur le site, on saisit son e-mail et on reçoit un code à usage unique.
   (L'offre gratuite Zero Trust suffit ; un écran de choix d'offre s'affiche à la première utilisation.)

### A4. Anti-robots Turnstile
1. Menu de gauche : **Turnstile** → **Add widget**.
2. Nom : `LG Advisory – rendez-vous` ; **Hostnames** : l'adresse workers.dev (ex. `lg-advisory.lga.workers.dev`),
   puis plus tard `lg-advisory.eu` ; mode **Managed** → **Create**.
3. Copier la **Site key** : elle remplace la clé de test `1x00000000000000000000AA` dans `rendez-vous.html`
   (attribut `data-sitekey`), puis commit + push.
4. Copier la **Secret key** : Worker `lg-advisory` → **Settings** → **Variables and Secrets** → **Add** →
   type **Secret**, nom `TURNSTILE_SECRET`, valeur = la clé secrète → **Deploy**.

### A5. Envoi des e-mails avec Brevo
La messagerie `contact@` reste chez OVH : les demandes sont envoyées par **Brevo** (société française,
offre gratuite : 300 e-mails/jour), sans toucher aux enregistrements MX d'OVH.
1. Créer un compte sur https://www.brevo.com (offre gratuite).
2. **Paramètres** → **Expéditeurs, domaines et IP dédiées** → **Domaines** → **Ajouter un domaine** : `lg-advisory.eu`.
   Brevo affiche des enregistrements DNS à créer (code Brevo, DKIM, DMARC).
3. Dans l'espace client OVH : **Web Cloud** → **Noms de domaine** → `lg-advisory.eu` → **Zone DNS** →
   **Ajouter une entrée** pour chacun (type TXT ou CNAME, sous-domaine et valeur copiés depuis Brevo).
   Ne pas modifier les entrées MX existantes. Revenir sur Brevo et cliquer **Authentifier** (la propagation peut prendre quelques heures).
4. **Expéditeurs** → **Ajouter un expéditeur** : nom `LG Advisory (site)`, e-mail `site@lg-advisory.eu`
   (constante `EXPEDITEUR` de `worker/index.js` ; l'adresse n'a pas besoin d'exister comme boîte).
5. **SMTP & API** → **Clés API** → **Générer une nouvelle clé API**, la copier.
6. Worker `lg-advisory` → **Settings** → **Variables and Secrets** → **Add** → type **Secret**,
   nom `BREVO_API_KEY` → **Deploy**.
7. Si Brevo signale que l'envoi transactionnel doit être activé pour un nouveau compte, suivre sa procédure.

### A6. Tester
Ouvrir `https://lg-advisory.<sous-domaine>.workers.dev/rendez-vous`, envoyer une demande et vérifier la réception
sur contact@lg-advisory.eu (et que « Répondre » écrit bien au demandeur). En cas d'échec : Worker → **Logs**
(ou `npx wrangler tail`), le message d'erreur de Brevo ou de Turnstile y apparaît.

---

## Phase B — Mise en ligne sur lg-advisory.eu (plus tard)
> Aucune mise en ligne tant qu'il reste des `[À compléter]` dans les pages légales (voir CLAUDE.md).

1. Ajouter `lg-advisory.eu` à Cloudflare (**Add a domain**) et remplacer, chez OVH, les serveurs DNS du domaine
   par ceux indiqués par Cloudflare. Vérifier avant que Cloudflare a bien repris **toutes** les entrées de la zone OVH
   (MX, SPF, entrées Brevo…), sinon la messagerie serait coupée.
2. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** : `lg-advisory.eu` (et `www` si souhaité).
3. Ajouter `lg-advisory.eu` aux hostnames du widget Turnstile.
4. Retirer la page « en construction » actuelle et, si on le souhaite, désactiver l'adresse workers.dev.

---

## Tester en local
Créer un fichier `.dev.vars` (non versionné) :

```
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
ENVOI_EMAIL_SIMULE=1
```

puis `npx wrangler dev` et ouvrir http://localhost:8787/rendez-vous. Avec `ENVOI_EMAIL_SIMULE=1`, l'e-mail
n'est pas envoyé : son contenu s'affiche dans la console.
