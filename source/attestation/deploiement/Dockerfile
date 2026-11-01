# ============================================================================
# Image du service d'attestation (protection réelle de la moyenne et de la date de naissance)
# ----------------------------------------------------------------------------
# Construite depuis le dossier « source/ » (voir console/deploiement/docker-compose.yml).
# Aucune dépendance npm : uniquement Node et trois petits fichiers partagés avec le site
# (la règle de normalisation des numéros, la lecture des dates, la comparaison d'identité).
# ============================================================================
FROM node:22-alpine
WORKDIR /app
COPY attestation ./attestation
COPY src/lib/search.js src/lib/dates.js src/lib/identite.js ./src/lib/
# Le dossier des données privées est monté en LECTURE SEULE (voir docker-compose.yml).
RUN mkdir -p /prive && chown -R node:node /app /prive
USER node
ENV NODE_ENV=production ATTESTATION_PORT=8790 ATTESTATION_DONNEES=/prive FAIRE_CONFIANCE_PROXY=1
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8790/sante >/dev/null || exit 1
CMD ["node", "attestation/serveur.mjs"]
