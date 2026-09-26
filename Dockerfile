FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copia explicita en vez de "COPY . .": la imagen no depende de que el
# .dockerignore este completo para no arrastrar .env, .git ni PII.
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
COPY public ./public

RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]
