# 🐍 SERPENT

Un jeu Snake avec une esthétique dark arcade / cyberpunk, fait avec React + Vite.

## Lancer le projet

```bash
npm install
npm run dev
```

## Build pour la prod

```bash
npm run build
```

## Déployer sur GitHub Pages

1. Installe le plugin :
```bash
npm install --save-dev gh-pages
```

2. Ajoute dans `package.json` :
```json
"homepage": "https://TON_USERNAME.github.io/NOM_DU_REPO",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Dans `vite.config.js`, ajoute la base :
```js
export default defineConfig({
  base: '/NOM_DU_REPO/',
  plugins: [react()],
})
```

4. Déploie :
```bash
npm run deploy
```

## Contrôles

| Touche | Action |
|--------|--------|
| `↑ ↓ ← →` ou `WASD` | Déplacer |
| `P` | Pause |
| `R` | Restart |

## Stack

- React 18
- Vite 5
- Canvas API
