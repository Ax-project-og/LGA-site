// Worker Cloudflare du site LG Advisory.
// Sert les fichiers statiques (binding ASSETS) et traite le formulaire de rendez-vous :
// POST /api/rendez-vous → vérification Turnstile → e-mail à contact@lg-advisory.eu.
// Aucune donnée n'est stockée : la demande est seulement relayée par e-mail.

const DESTINATAIRE = "contact@lg-advisory.eu";
// Adresse d'expédition : le domaine lg-advisory.eu doit être authentifié dans Brevo (voir DEPLOIEMENT.md).
const EXPEDITEUR = "site@lg-advisory.eu";

const CHAMPS = {
  prenom: { label: "Prénom", max: 80, requis: true },
  nom: { label: "Nom", max: 80, requis: true },
  email: { label: "E-mail", max: 160, requis: true },
  telephone: { label: "Téléphone", max: 40 },
  profil: { label: "Profil", max: 80 },
  sujet: { label: "Sujet", max: 80 },
  format: { label: "Format souhaité", max: 40 },
  disponibilites: { label: "Disponibilités", max: 200 },
  message: { label: "Message", max: 3000, requis: true, multiligne: true },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/rendez-vous") {
      if (request.method !== "POST") {
        return new Response("Méthode non autorisée", { status: 405, headers: { Allow: "POST" } });
      }
      return traiterRendezVous(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function traiterRendezVous(request, env) {
  const json = (request.headers.get("Accept") || "").includes("application/json");
  const repondre = (ok, erreur, status = ok ? 200 : 400) =>
    json
      ? Response.json(ok ? { ok: true } : { ok: false, error: erreur }, { status })
      : Response.redirect(new URL(ok ? "/rendez-vous?envoye=1#formulaire" : "/rendez-vous?erreur=1#formulaire", request.url), 303);

  let form;
  try {
    form = await request.formData();
  } catch {
    return repondre(false, "Requête invalide.");
  }

  // Pot-de-miel rempli : robot probable, on répond comme si tout allait bien.
  if (form.get("site_web")) return repondre(true);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!(await verifierTurnstile(form.get("cf-turnstile-response"), ip, env))) {
    return repondre(false, "La vérification anti-robots a échoué. Merci de réessayer.");
  }

  const donnees = {};
  for (const [nom, champ] of Object.entries(CHAMPS)) {
    let valeur = String(form.get(nom) || "").trim().slice(0, champ.max);
    if (!champ.multiligne) valeur = valeur.replace(/\s+/g, " ");
    if (champ.requis && !valeur) return repondre(false, "Merci de compléter les champs obligatoires.");
    donnees[nom] = valeur;
  }
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(donnees.email)) {
    return repondre(false, "L'adresse e-mail semble incorrecte.");
  }

  try {
    await envoyerEmail(env, donnees);
  } catch (erreur) {
    console.error("Envoi de l'e-mail impossible :", erreur);
    return repondre(false, "Votre demande n'a pas pu être envoyée.", 502);
  }
  return repondre(true);
}

async function verifierTurnstile(jeton, ip, env) {
  if (!jeton || !env.TURNSTILE_SECRET) return false;
  const corps = new FormData();
  corps.append("secret", env.TURNSTILE_SECRET);
  corps.append("response", jeton);
  if (ip) corps.append("remoteip", ip);
  try {
    const reponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: corps });
    const resultat = await reponse.json();
    return resultat.success === true;
  } catch {
    return false;
  }
}

// Envoi via l'API transactionnelle de Brevo (clé dans le secret BREVO_API_KEY).
// En local, ENVOI_EMAIL_SIMULE=1 (fichier .dev.vars) affiche l'e-mail dans la console au lieu de l'envoyer.
// Pour changer de service d'envoi, seule cette fonction est à remplacer.
async function envoyerEmail(env, d) {
  const lignes = Object.entries(CHAMPS)
    .filter(([, champ]) => !champ.multiligne)
    .map(([nom, champ]) => `${champ.label} : ${d[nom] || "non précisé"}`);
  const texte = [
    "Nouvelle demande de rendez-vous reçue depuis lg-advisory.eu.",
    "",
    ...lignes,
    "",
    "Message :",
    d.message,
    "",
    "Répondre à cet e-mail écrit directement au demandeur.",
  ].join("\n");

  const email = {
    sender: { name: "LG Advisory (site)", email: EXPEDITEUR },
    to: [{ email: DESTINATAIRE }],
    replyTo: { email: d.email, name: `${d.prenom} ${d.nom}` },
    subject: `Demande de rendez-vous : ${d.prenom} ${d.nom}`,
    textContent: texte,
  };

  if (env.ENVOI_EMAIL_SIMULE === "1") {
    console.log("E-mail simulé (non envoyé) :", JSON.stringify(email, null, 2));
    return;
  }
  if (!env.BREVO_API_KEY) throw new Error("Secret BREVO_API_KEY manquant");

  const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(email),
  });
  if (!reponse.ok) throw new Error(`Brevo ${reponse.status} : ${await reponse.text()}`);
}
