# V1/V4 Neuron Explorer — frozen static site

A self-contained, **frozen snapshot** of the neuron auto-interpretation viewer for
20 neurons in each of V1 and V4. No server needed — it's plain HTML/CSS/JS plus
pre-exported images and JSON, so it runs anywhere static files can be hosted
(GitHub Pages, Netlify, S3, `python -m http.server`, …).

## Contents

```
frozen_site/
  index.html        # entry point
  app.js            # renders the explorer from data/
  style.css
  .nojekyll         # tells GitHub Pages to serve files as-is
  data/
    manifest.json   # list of areas / neurons / percentiles
    V4/n{id}_p{pct}/ , V1/n{id}_p{pct}/
        meta.json   # hypothesis + per-image activations & descriptions
        natural/    # top-15 natural ImageNet images
        generated/  # masked diffusion-generated images
        augmented/  # best augmentation images
```

Neurons included: `4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 17, 18, 22, 23, 25, 27, 28, 29, 30, 31`
(both V1 and V4, percentiles 100/MEI and 0/LEI).

Tabs: **Hypothesis**, **Natural Images** (top 15), **Generated**, **All Images**
(3-column natural / generated / augmented comparison).

## Preview locally

```bash
cd frozen_site
python3 -m http.server 8099
# open http://localhost:8099
```

(Open it through a web server, not `file://`, so `fetch()` can read the JSON.)

## Deploy to GitHub Pages

1. Create a repo and put the **contents of this `frozen_site/` folder at the repo root**
   (so `index.html` is at the top level), then push.
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick your branch and `/ (root)`, save.
3. The site goes live at `https://<user>.github.io/<repo>/` within a minute or two.

Alternatively keep this folder named `docs/` at the repo root and choose
**Source: branch `main`, folder `/docs`** in the Pages settings.

The full site is ~32 MB, well within GitHub Pages limits.

## Regenerating the data

The snapshot is produced by `../export_static.py` (needs the project venv with
`torch` and the `translate` package, and access to `/theoryanalysis/…`):

```bash
cd ..
source .venv/bin/activate
python export_static.py        # rewrites frozen_site/data/
```

Edit `NEURONS`, `PERCENTILES`, or `TOP_K` at the top of `export_static.py` to
change which neurons are exported.
