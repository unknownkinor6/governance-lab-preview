# The Governance Lab website (review draft)

Website for Susana Rodrigues' consultancy, The Governance Lab. Plain HTML, CSS and a little
JavaScript: no platform, no database, no cookies, no tracking. Design decisions are in `DESIGN.md`.

## Pages

| Address | Page |
|---|---|
| `/` | Home |
| `/services/` | Services (five services, ways to start) |
| `/poct-consultancy/` | PoCT Consultancy, illustrative PoCT review, sample documents |
| `/about/` | About Susana |
| `/insights/` and `/insights/article-template/` | Insights list and article layout |
| `/resources/` and `/resources/poct-governance-self-assessment/` | Resources and the product page (purchasing off) |
| `/contact/` | Enquiry form (not connected yet) |
| `/examples/findings-report/`, `/examples/action-plan/` | Larger versions of the sample previews |
| `/examples/full-sample/` | Full four-page sample, unlinked, for Susana's approval |
| `/privacy/`, `/terms/`, `/404.html` | Placeholders for her wording, and the not-found page |
| `/review/` | Review pack for Susana (unlinked). PDF: `review/The-Governance-Lab-website-review.pdf` |

## Working on it

```
node tools/serve.mjs          # preview at http://localhost:4410 (or the "governance-lab" preview)
node tools/build.mjs          # after editing anything in partials/
node tools/check.mjs          # links, anchors, headings, alt text, fictional-example label, no live purchase
node tools/shot.mjs <url> <out> [--mobile] [--full]   # screenshots with headless Chrome
```

- The header, footer, `<head>` and the two sample documents live in `partials/`. Edit them there,
  then run `build.mjs`: it copies them into every page between `<!-- @name -->` markers.
  Never edit inside those markers on a page; it will be overwritten.
- Everything else on a page is edited directly in that page's `index.html`.
- "For review" boxes (`class="flag"`) and the green "Review draft" bar are notes for Susana.
  Remove them once each point is settled.

## Before launch

1. Swap in Susana's logo files and photograph (portrait placeholders on Home and About).
2. Remove the draft bar (`partials/header.html`) and every `class="flag"` note.
3. Remove `noindex` from `partials/head.html`; make `og:image` an absolute URL on the final domain;
   set `<base href="/">` in `404.html` (the preview uses `/governance-lab-preview/`).
4. Connect the contact form: set `data-endpoint` on the form in `contact/index.html` to the form
   service (e.g. FormSubmit, activated to her business email), and test it on a phone.
5. Fill in company details, privacy notice and terms; add `sitemap.xml` and `robots.txt` for the domain.
6. Consider self-hosting the fonts (currently Google Fonts) so the site makes no third-party requests.
7. Resources: keep purchasing off until the assessment, previews, price, licence and delivery are
   confirmed; then add the payment provider's checkout (in her name) and test payment to download.
