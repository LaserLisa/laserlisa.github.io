# laserlisa.github.io

Engineering portfolio of Lisa Schneider, served by GitHub Pages at https://laserlisa.github.io

Plain HTML + CSS — no build step.

```
index.html                 About / Projects / Publications (single landing page)
projects/                  One detail page per project ("Detailed Description >>")
  snake-robot.html
  robot-competition.html
  z-bot.html
  solar-boat.html
assets/css/style.css       All styling
assets/img/profile.svg     Profile picture placeholder
assets/img/projects/       Project images: <project>.svg (card/cover) and <project>-1..3.svg (gallery)
assets/files/              Downloadable files, e.g. CV_Lisa_Schneider.pdf (Resume button)
```

## Updating content
- **Images:** drop your photo/JPG into `assets/img/...` and update the `src` in the HTML
  (or keep the same file name to replace a placeholder directly).
- **New project:** copy an `<article class="project">` block in `index.html` and one of the
  files in `projects/`, then adjust the prev/next links at the bottom of the detail pages.
- **Open TODOs:** search for `TODO` in the HTML files (email, LinkedIn URL, publication citation, results).

## Preview locally
```
python -m http.server 8000
```
then open http://localhost:8000
