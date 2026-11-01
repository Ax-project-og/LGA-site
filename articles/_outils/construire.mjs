// Génère les pages des articles archivés et leur liste dans publications.html.
// Usage (depuis la racine du site) : node articles/_outils/construire.mjs
//
// Une source = articles/_sources/<slug>.html :
//   - un commentaire HTML initial contenant les métadonnées en JSON (titre, revue, date, scans…) ;
//   - puis le texte retranscrit, en HTML (p, h2, h3, ul, blockquote.pull, aside.comment, div.example, div.footnotes…).
// Les scans sont dans articles/scans/ : <pdf>.jpg (ou <pdf>-p<n>.jpg si le PDF a plusieurs pages) et <…>-vignette.jpg.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.resolve(here, "..");
const siteDir = path.resolve(articlesDir, "..");
const sourcesDir = path.join(articlesDir, "_sources");
const scansDir = path.join(articlesDir, "scans");
const listPage = path.join(siteDir, "publications.html");
const template = fs.readFileSync(path.join(here, "modele.html"), "utf8");

const THEMES = {
  "assurance-vie": "Assurance-vie",
  fiscalite: "Fiscalité",
  transmission: "Transmission",
  international: "International et Luxembourg",
  gestion: "Gestion de patrimoine",
};
const TYPES = { article: "Article de revue", tribune: "Tribune", entretien: "Entretien" };

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nb = s => esc(s).replace(/ ([:;?!»])/g, "&nbsp;$1").replace(/« /g, "«&nbsp;");
const initials = name => name.replace(/^(\S)\S*\s+/, "$1. ");
const warnings = [];

// ---------- Lecture des sources ----------
const articles = fs.readdirSync(sourcesDir)
  .filter(f => f.endsWith(".html"))
  .map(f => {
    const raw = fs.readFileSync(path.join(sourcesDir, f), "utf8");
    const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
    if (!m) throw new Error(`${f} : métadonnées manquantes`);
    const meta = JSON.parse(m[1]);
    const slug = f.replace(/\.html$/, "");
    const counts = {};
    meta.scans.forEach(s => { counts[s.pdf] = (counts[s.pdf] || 0) + 1; });
    const images = meta.scans.map(s => ({
      src: `${s.pdf}${counts[s.pdf] > 1 ? `-p${s.page}` : ""}.jpg`,
      label: s.label,
    }));
    const thumb = images[0].src.replace(/\.jpg$/, "-vignette.jpg");
    [...images.map(i => i.src), thumb].forEach(img => {
      if (!fs.existsSync(path.join(scansDir, img))) warnings.push(`${slug} : image absente ${img}`);
    });
    return { ...meta, slug, body: raw.slice(m[0].length).trim(), images, thumb, year: meta.date.slice(0, 4) };
  })
  // "masque": true met un article de côté : ni page ni entrée dans la liste (sa page éventuelle est supprimée)
  .filter(a => {
    if (!a.masque) return true;
    fs.rmSync(path.join(articlesDir, `${a.slug}.html`), { force: true });
    console.log(`Mis de côté : ${a.slug}`);
    return false;
  })
  .sort((a, b) => b.date.localeCompare(a.date));

const bySlug = Object.fromEntries(articles.map(a => [a.slug, a]));

// ---------- Fragments communs ----------
function issueLine(a) {
  return [a.numero && `n°&nbsp;${esc(a.numero)}`, esc(a.dateLabel).replace(/^1er /, "1<sup>er</sup>&nbsp;"), a.pages && `p.&nbsp;${esc(a.pages)}`]
    .filter(Boolean).join(", ");
}
function revueHtml(a) {
  return a.revue ? `<i>${esc(a.revue)}</i>` : `<mark class="todo">[À compléter&nbsp;: revue]</mark>`;
}
function citation(a) {
  const who = a.authors.map(initials).join(", ");
  return `${esc(who)}, «&nbsp;${nb(a.title)}&nbsp;», ${revueHtml(a)}, ${issueLine(a)}.`;
}

// ---------- Page d'un article ----------
function head(a) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    author: a.authors.map(name => ({ "@type": "Person", name })),
    datePublished: a.date,
    inLanguage: "fr",
    image: `https://lg-advisory.eu/articles/scans/${a.images[0].src}`,
    about: a.themes.map(t => THEMES[t]),
    keywords: a.keywords,
    ...(a.revue && { isPartOf: { "@type": "Periodical", name: a.revue } }),
  };
  const year = a.year;
  return `  <title>${esc(a.title)} | Laurent Gayet${a.revue ? `, ${esc(a.revue)}` : ""} (${year})</title>
  <meta name="description" content="${esc(a.summary)}">
  <meta name="theme-color" content="#1F3A32">
  <meta property="og:title" content="${esc(a.title)}">
  <meta property="og:description" content="${esc(a.summary)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://lg-advisory.eu/articles/scans/${a.thumb}">
  <link rel="canonical" href="https://lg-advisory.eu/articles/${a.slug}">
  <script type="application/ld+json">
  ${JSON.stringify(ld, null, 2).replace(/</g, "\\u003c").replace(/\n/g, "\n  ")}
  </script>`;
}

function main(a, prev, next) {
  const tags = a.themes.map(t => `<a href="../publications.html?theme=${t}">${THEMES[t]}</a>`).join("\n                ");
  const meta = [
    `<span><strong>${a.authors.map(esc).join(" et ")}</strong></span>`,
    a.revue ? `<span>${esc(a.revue)}</span>` : `<span><mark class="todo">[Revue à compléter]</mark></span>`,
    a.numero && `<span>N°&nbsp;${esc(a.numero)}</span>`,
    `<span><time datetime="${a.date}">${esc(a.dateLabel).replace(/^1er /, "1<sup>er</sup>&nbsp;")}</time></span>`,
    a.pages && `<span>p.&nbsp;${esc(a.pages)}</span>`,
  ].filter(Boolean).join("\n            ");
  const related = a.related && bySlug[a.related]
    ? `\n            <p class="related">Ce texte a également été publié dans une autre version&nbsp;: <a href="${a.related}.html">${nb(bySlug[a.related].title)}</a> (${esc(bySlug[a.related].revue)}, ${esc(bySlug[a.related].dateLabel)}).</p>`
    : "";
  const nav = [
    prev && `<a href="${prev.slug}.html" rel="prev"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H3M7 4 3 8l4 4"/></svg> ${nb(prev.title)}</a>`,
    next && `<a href="${next.slug}.html" rel="next">${nb(next.title)} <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg></a>`,
  ].filter(Boolean).join("\n              ");
  const pagesCount = a.images.length;
  const verify = a.verify ? `\n          <!-- à vérifier : ${esc(a.verify)} -->` : "";
  if (a.essai !== false) return mainEssai(a, prev, next, verify);
  return `  <main id="contenu">
    <article>
      <header class="page-head on-deep">
        <svg class="guilloche" viewBox="-320 -320 640 640" aria-hidden="true"><use href="#rosace" /></svg>
        <div class="wrap">
          <nav class="crumb" aria-label="Fil d'Ariane">
            <a href="../index.html">Accueil</a> <span aria-hidden="true">/</span>
            <a href="../publications.html">Publications</a> <span aria-hidden="true">/</span>
            <a href="../publications.html#annee-${a.year}">${a.year}</a>
          </nav>${verify}
          <p class="eyebrow">${esc(a.rubrique || TYPES[a.type])}</p>
          <h1>${nb(a.title)}</h1>
          <p class="article-meta">
            ${meta}
          </p>
          <p class="byline">${esc(a.byline)}</p>
        </div>
      </header>

      <section class="article-section">
        <div class="wrap article-grid">
          <div>
            <p class="notice">
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4.5M8 4.6v.1"/></svg>
              <span>Transcription de l'article paru dans ${revueHtml(a)}. Le texte reflète l'état du droit à la date
              de publication&nbsp;; il ne constitue pas un conseil personnalisé. ${pagesCount > 1 ? `Les ${pagesCount} pages originales sont consultables` : "La page originale est consultable"} en fac-similé.</span>
            </p>

            <div class="article-body">
${a.body.replace(/^/gm, "              ")}
            </div>${related}

            <nav class="article-foot" aria-label="Navigation entre les articles">
              <a href="../publications.html">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H3M7 4 3 8l4 4"/></svg>
                Toutes les publications
              </a>
            </nav>${nav ? `
            <nav class="article-foot article-siblings" aria-label="Articles précédent et suivant">
              ${nav}
            </nav>` : ""}
          </div>

          <aside class="article-aside">
            <figure class="facsimile">
              <p class="aside-label">Fac-similé</p>
              <button class="facsimile-open" type="button" data-viewer aria-label="Agrandir la page originale">
                <img src="scans/${a.thumb}" alt="Page originale de l'article ${esc(a.title)}" width="640" height="453">
                <span class="zoom-hint" aria-hidden="true"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5M7 5v4M5 7h4"/></svg></span>
              </button>
              <figcaption>${revueHtml(a)}, ${issueLine(a)}.</figcaption>
              <button class="btn btn-dark" type="button" data-viewer>
                ${pagesCount > 1 ? `Consulter l'original (${pagesCount} pages)` : "Consulter l'original"}
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>
              </button>
            </figure>

            <div class="ref">
              <p class="aside-label">Référence</p>
              <cite id="citation">${citation(a)}</cite>
              <button class="copy" type="button" id="copy">
                <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1"/><path d="M11 5V2.5H2.5V11H5"/></svg>
                <span>Copier la référence</span>
              </button>
            </div>

            <div class="ref">
              <p class="aside-label">Thèmes</p>
              <div class="tags">
                ${tags}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </article>
  </main>

  <!-- Visionneuse : une entrée par page scannée (src, libellé) -->
  <dialog class="viewer" id="viewer" aria-label="Fac-similé de l'article"
    data-pages='${JSON.stringify(a.images.map(i => ({ src: `scans/${i.src}`, label: i.label }))).replace(/'/g, "&#39;")}'>
    <div class="viewer-bar">
      <p class="viewer-title"><strong>${esc(a.revue || a.title)}</strong>${a.revue ? `, ${issueLine(a)}` : ""}</p>
      <div class="viewer-tools">
        <button type="button" data-act="prev" aria-label="Page précédente"><svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5"/></svg></button>
        <span class="viewer-page" aria-live="polite"></span>
        <button type="button" data-act="next" aria-label="Page suivante"><svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5"/></svg></button>
        <span class="sep" aria-hidden="true"></span>
        <button type="button" data-act="out" aria-label="Dézoomer"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5M5 7h4"/></svg></button>
        <button type="button" data-act="fit">Ajuster</button>
        <button type="button" data-act="in" aria-label="Zoomer"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5M7 5v4M5 7h4"/></svg></button>
        <span class="sep" aria-hidden="true"></span>
        <button type="button" data-act="close" aria-label="Fermer"><svg viewBox="0 0 16 16"><path d="m3.5 3.5 9 9M12.5 3.5l-9 9"/></svg></button>
      </div>
    </div>
    <div class="viewer-stage">
      <img alt="Page originale de l'article ${esc(a.title)}" draggable="false">
    </div>
  </dialog>`;
}

// ---------- Mise en page des articles : en-tête au-dessus du texte, navigation en cartes ----------
// (main() garde l'ancienne mise en page, utilisée ici seulement pour en extraire la colonne latérale et la visionneuse)
function readingTime(a) {
  const words = a.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
function siblingCard(b, rel) {
  const label = rel === "prev"
    ? `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H3M7 4 3 8l4 4"/></svg> Article précédent`
    : `Article suivant <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>`;
  return `<a class="sibling" href="${b.slug}.html" rel="${rel}">
                  <span class="sibling-label">${label}</span>
                  <span class="sibling-title">${nb(b.title)}</span>
                  <span class="sibling-meta">${b.revue ? `<i>${esc(b.revue)}</i>, ` : ""}${esc(b.dateLabel)}</span>
                </a>`;
}
function mainEssai(a, prev, next, verify) {
  // Colonne latérale et visionneuse reprises telles quelles de la version standard
  const std = main({ ...a, essai: false }, prev, next);
  const asideHtml = std.slice(std.indexOf("          <aside"), std.indexOf("</aside>") + "</aside>".length);
  const viewerHtml = std.slice(std.indexOf("  <!-- Visionneuse"));
  const facts = [
    [a.authors.length > 1 ? "Auteurs" : "Auteur", a.authors.map(esc).join(" et ")],
    ["Paru dans", a.revue ? `<i>${esc(a.revue)}</i>` : `<mark class="todo">[À compléter]</mark>`],
    ["Date", `<time datetime="${a.date}">${esc(a.dateLabel).replace(/^1er /, "1<sup>er</sup>&nbsp;")}</time>`],
    a.numero && ["Numéro", `n°&nbsp;${esc(a.numero)}${a.pages ? `, p.&nbsp;${esc(a.pages)}` : ""}`],
    ["Lecture", `${readingTime(a)}&nbsp;min`],
  ].filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("\n                ");
  const related = a.related && bySlug[a.related]
    ? `\n              <p class="related">Ce texte a également été publié dans une autre version&nbsp;: <a href="${a.related}.html">${nb(bySlug[a.related].title)}</a> (${esc(bySlug[a.related].revue)}, ${esc(bySlug[a.related].dateLabel)}).</p>`
    : "";
  const siblings = [prev && siblingCard(prev, "prev"), next && siblingCard(next, "next")].filter(Boolean).join("\n                ");
  return `  <main id="contenu" class="essai">
    <article>
      <div class="page-band on-deep">
        <div class="wrap">
          <nav class="crumb" aria-label="Fil d'Ariane">
            <a href="../index.html">Accueil</a> <span aria-hidden="true">/</span>
            <a href="../publications.html">Publications</a> <span aria-hidden="true">/</span>
            <a href="../publications.html#annee-${a.year}">${a.year}</a>
          </nav>${verify}
        </div>
      </div>

      <section class="article-section">
        <div class="wrap article-grid">
          <header class="article-head">
            <p class="kicker"><span>${esc(a.rubrique || TYPES[a.type])}</span>${a.revue ? ` <i>${esc(a.revue)}</i>` : ""}</p>
            <h1>${nb(a.title)}</h1>
            <p class="byline">${esc(a.byline)}</p>
            <dl class="facts">
              ${facts}
            </dl>
          </header>

          <div class="article-main">
            <div class="article-body">
${a.body.replace(/^/gm, "              ")}
            </div>${related}

            <p class="notice">
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4.5M8 4.6v.1"/></svg>
              <span>Transcription de l'article paru dans ${revueHtml(a)}. Le texte reflète l'état du droit à la date
              de publication&nbsp;; il ne constitue pas un conseil personnalisé. ${a.images.length > 1 ? `Les ${a.images.length} pages originales sont consultables` : "La page originale est consultable"} en fac-similé.</span>
            </p>

            <nav class="siblings" aria-label="Articles précédent et suivant">
                ${siblings}
            </nav>
            <a class="back" href="../publications.html">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h8"/></svg>
              Toutes les publications
            </a>
          </div>

${asideHtml}
        </div>
      </section>
    </article>
  </main>

${viewerHtml}`;
}

// Liste chronologique : « précédent » = plus ancien, « suivant » = plus récent
const chrono = [...articles].reverse();
chrono.forEach((a, i) => {
  const html = template.replace("{{HEAD}}", head(a)).replace("{{MAIN}}", main(a, chrono[i - 1], chrono[i + 1]));
  fs.writeFileSync(path.join(articlesDir, `${a.slug}.html`), html);
});

// ---------- Liste dans publications.html ----------
function listItem(a) {
  const source = a.revue || "Revue à préciser";
  return `              <!-- archive:${a.slug} -->
              <li class="pub" data-type="${a.type}" data-themes="${a.themes.join(" ")}" data-source="${esc(source)}" data-keywords="${esc(a.keywords)}">
                <a href="articles/${a.slug}.html">
                  <span class="pub-thumb" aria-hidden="true"><img src="articles/scans/${a.thumb}" alt="" width="72" height="51" loading="lazy"></span>
                  <span class="pub-body">
                    <span class="pub-meta"><span class="pub-type">${esc(a.rubrique || TYPES[a.type])}</span> <span class="pub-source">${esc(source)}</span> <span>${issueLine(a)}</span></span>
                    <h3>${nb(a.title)}</h3>
                    <span class="pub-summary">${nb(a.summary)}</span>
                  </span>
                  <span class="pub-avail">
                    <span class="archive-badge"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h6l3 3v9H4zM6 8h5M6 11h5"/></svg> Texte intégral</span>
                    <span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v10H2zM2 11l4-4 3 3 2-2 3 3"/></svg> Fac-similé${a.images.length > 1 ? ` (${a.images.length}&nbsp;p.)` : ""}</span>
                  </span>
                </a>
              </li>
              <!-- /archive -->
`;
}

let list = fs.readFileSync(listPage, "utf8");
// Retire les articles archivés déjà insérés, puis les groupes d'années devenus vides
list = list.replace(/ *<!-- archive:[^>]*-->[\s\S]*?<!-- \/archive -->\n/g, "");
list = list.replace(/ *<div class="year-group" id="annee-\d{4}" data-year="\d{4}">\s*<div class="year-head">.*<\/div>\s*<ul class="pub-list">\s*<\/ul>\s*<\/div>\n\n?/g, "")
  .replace(/\n{3,}/g, "\n\n");

const years = [...new Set(articles.map(a => a.year))];
for (const y of years) {
  const items = articles.filter(a => a.year === y).map(listItem).join("");
  const open = `<div class="year-group" id="annee-${y}" data-year="${y}">`;
  if (!list.includes(open)) {
    const group = `          ${open}
            <div class="year-head"><h2 class="year">${y}</h2> <span class="year-count"></span></div>
            <ul class="pub-list">
            </ul>
          </div>

`;
    const after = [...list.matchAll(/ *<div class="year-group" id="annee-(\d{4})"/g)].find(m => +m[1] < +y);
    const at = after ? after.index : list.indexOf('          <div class="empty" id="empty"');
    list = list.slice(0, at) + group + list.slice(at);
  }
  const ulAt = list.indexOf('<ul class="pub-list">\n', list.indexOf(open)) + '<ul class="pub-list">\n'.length;
  list = list.slice(0, ulAt) + items + list.slice(ulAt);
}

// Compteur et période affichés avant l'exécution du script de la page
const total = (list.match(/<li class="pub" data-type/g) || []).length;
const allYears = [...list.matchAll(/data-year="(\d{4})"/g)].map(m => +m[1]);
list = list.replace(/<strong id="n">\d+<\/strong>/, `<strong id="n">${total}</strong>`)
  .replace(/<span id="result-label">[^<]*<\/span>/, `<span id="result-label">publications de ${Math.min(...allYears)} à ${Math.max(...allYears)}</span>`);
fs.writeFileSync(listPage, list);

// Sitemap : bloc des articles régénéré entre les commentaires <!-- articles --> et <!-- /articles -->
const sitemapFile = path.join(siteDir, "sitemap.xml");
const today = new Date().toISOString().slice(0, 10);
const urls = chrono.map(a => `  <url>\n    <loc>https://lg-advisory.eu/articles/${a.slug}</loc>\n    <lastmod>${today}</lastmod>\n  </url>\n`).join("");
let sitemap = fs.readFileSync(sitemapFile, "utf8");
if (/<!-- articles -->[\s\S]*<!-- \/articles -->\n/.test(sitemap)) {
  // lastmod conservé si la liste d'articles n'a pas changé
  const old = sitemap.match(/<!-- articles -->\n([\s\S]*)  <!-- \/articles -->\n/)[1];
  if (old.replace(/<lastmod>.*<\/lastmod>/g, "") !== urls.replace(/<lastmod>.*<\/lastmod>/g, "")) {
    sitemap = sitemap.replace(/<!-- articles -->[\s\S]*<!-- \/articles -->\n/, `<!-- articles -->\n${urls}  <!-- /articles -->\n`);
  }
} else {
  sitemap = sitemap.replace("</urlset>", `  <!-- articles -->\n${urls}  <!-- /articles -->\n</urlset>`);
}
fs.writeFileSync(sitemapFile, sitemap);

console.log(`${articles.length} articles générés, ${total} publications dans la liste.`);
warnings.forEach(w => console.warn("Attention : " + w));
