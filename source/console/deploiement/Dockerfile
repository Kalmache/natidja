# ============================================================================
# Image de la console de publication
# ----------------------------------------------------------------------------
# Construite depuis le dossier « source/ » (voir docker-compose.yml). Elle
# contient uniquement ce dont la console a besoin : ses fichiers, les outils
# partagés d'import (scripts/lib) et les modules Node de production.
# ============================================================================
FROM node:22-alpine

# Bonne pratique : le programme ne tourne JAMAIS en administrateur (root).
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev : pas d'outils de développement ; --ignore-scripts : aucun script d'installation exécuté.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY console ./console
COPY scripts/lib ./scripts/lib
# La règle de normalisation des noms (accents, majuscules) et la lecture des dates sont les MÊMES que
# celles du site : l'import et la recherche doivent les partager, d'où ces deux fichiers du site.
COPY src/lib/search.js src/lib/dates.js ./src/lib/

# Dossiers qui contiennent les vraies données (montés comme volumes, voir docker-compose.yml)
RUN mkdir -p /donnees /console-data && chown -R node:node /donnees /console-data /app
USER node

ENV NODE_ENV=production \
    CONSOLE_HOST=0.0.0.0 \
    CONSOLE_PORT=8787 \
    CONSOLE_DATA=/console-data \
    PUBLISH_DATA=/donnees \
    CONSOLE_TRUST_PROXY=1

# Santé : le serveur répond-il ? (Docker redémarre le conteneur s'il ne répond plus.)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/etat >/dev/null || exit 1

CMD ["node", "console/serveur.mjs"]
