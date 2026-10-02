# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## API Cinéma

La clé API se met dans `.env.local` (ignoré par git), **sans** préfixe `VITE_` :

```
CINEMA_API_KEY=ac_live_...
```

En dev, le proxy Vite (`vite.config.ts`) redirige `/api/cinema/*` vers `https://api.api-cinema.com/v1/*` et ajoute le header `Authorization`. La clé n'arrive jamais dans le bundle. En production, un proxy équivalent (reverse proxy ou backend) est nécessaire.

## Ticketmaster (spectacles)

Ajouter la clé dans `.env.local`, toujours sans préfixe `VITE_` :

```
TICKETMASTER_KEY=...
```

Le proxy `/api/ticketmaster/*` → `https://app.ticketmaster.com/discovery/v2/*` ajoute le paramètre `apikey` côté serveur. Quota par défaut : 5000 appels/jour, 5 requêtes/seconde. Même remarque qu'au-dessus pour la production.

## Équipements sportifs

Catégorie Sport : données ouvertes du ministère des Sports (`equipements.sports.gouv.fr`, aucune clé). Le proxy `/api/sports/*` redirige vers l'API Opendatasoft. On croise trois jeux : `data-es-equipement` (position, tri par distance), `data-es-installation` (nom du lieu) et `data-es-activite` (sports pratiqués). Ces données n'ont pas d'horaires : l'heure choisie n'est pas utilisée.
