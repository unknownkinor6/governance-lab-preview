# The Governance Lab website: design note

Client: Susana Rodrigues, Registered Nurse, founder of The Governance Lab
(Clinical Quality & PoCT Compliance Consultancy Ltd). Built by Sisco Solutions.
Source: her email of 9 Nov 2026 with `The_Governance_Lab_Website_Brief.docx` and
`The_Governance_Lab_Fictional_PoCT_Website_Examples.docx`, plus her LinkedIn profile.

## What the site must do (her words, condensed)
- Help independent healthcare providers understand her services, trust her expertise, contact her.
- Lead with clinical governance, quality and patient safety. PoCT is a dedicated specialism.
- Present the business accurately as an independent consultancy led by her.
- Sage and deep green, white and charcoal. Readable text, simple navigation, excellent mobile layout.
- Her photograph and document previews; healthcare stock imagery used sparingly (none in this draft).
- Fictional examples clearly labelled on every preview: "Illustrative example using fictional
  information. This is not a client case study and does not represent completed work or achieved outcomes."
- Resources: product page layout for the PoCT Governance Self-Assessment, wording for her approval,
  purchasing inactive until she confirms assessment, previews, price, licence and delivery.
- No fixed consultancy prices. No implied endorsement, regulatory approval or inspection results.

## Stage
Review draft. She asked to see the page structure and homepage (desktop and mobile) before all
pages are developed. All pages are built as drafts so she can see the whole journey, but the
homepage and structure are what we ask her to approve first. Every page carries `noindex` until launch.

## Visual system
- Palette sampled from her tick logo: deep green `#446251`, sage `#a8c4a2`, logo charcoal `#3e4448`.
  Extended for contrast: forest `#22382c` (dark sections), green `#2f4b3c` (buttons, links),
  sage tints `#e3ebdf` / `#f2f6f0`, text charcoal `#2c3236`.
- Type: Newsreader (serif, headings, italic accent phrases), Mulish (body and UI; close to the
  lettering in her logo), IBM Plex Mono (small reference labels like F01, Day 0).
- Motif: the grid and tick from her logo. Graph-paper grid lines = evidence and method ("Lab");
  the tick = assurance. Used in the hero, process timeline and section dividers.

## Design references (Awwwards)
- Function Health (Honourable Mention): serif headings with an italic accent phrase; a membership
  card with a ticked "what's included" list. Used for the hero heading and the product card.
- Oregon Health Leadership Council (Nominee): healthcare leadership audience; deep teal and sage,
  serif headings, ruled lists, labelled article cards. Used for problem rows and Insights cards.
- Outsource Consultants Inc. (Site of the Day): visible grid lines, numbered sections, expanding
  service list, mono micro-labels. Used for the process timeline and reference labels.
- Heva Health (Site of the Day): calm sage and olive palette, pill navigation and buttons.
- Institute of Health (Honourable Mention): oversized wordmark in the footer.

## Pages
Home, Services, PoCT Consultancy, About, Insights, Resources, Contact (main navigation, plus a
"Discuss your needs" button on every page). Supporting pages: findings report preview, action
plan preview, PoCT Governance Self-Assessment product page, insights article template, privacy,
terms, 404, and an unlinked review pack at /review/.

## Technical
Plain HTML, CSS and a little JavaScript. No platform, no tracking, no cookies.
`node tools/build.mjs` copies the shared header and footer (partials/) into every page.
`node tools/shot.mjs <url> <out> [--mobile] [--full]` screenshots pages with headless Chrome.
`node tools/check.mjs` checks links, labels, headings and the fictional-example label.
