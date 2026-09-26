FROM node:20-alpine
WORKDIR /app

# /app es de root, asi que se entrega al usuario node antes de instalar:
# a partir de ahi la build y el runtime corren sin privilegios.
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
# Dependencias puras de JS: ningun postinstall necesita ejecutarse.
RUN npm ci --ignore-scripts

# Copia explicita en vez de "COPY . .": la imagen no depende de que el
# .dockerignore este completo para no arrastrar .env, .git ni PII.
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src

RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
