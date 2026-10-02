# 🌙 Que faire ce soir ?

Une petite app pour trouver quoi faire ce soir près de chez soi : une pizza, un film, un spectacle, un concert, du sport ou un musée. On choisit une heure et une ou plusieurs envies, l'app liste ce qui est disponible autour de soi, trié par distance.

Stack : Vue 3 (`<script setup>`), TypeScript, Pinia, Vue Router, Tailwind CSS v4, Vite.

## Fonctionnalités

- **Choix de l'heure** : de 8h à minuit. Le sélecteur affiche 7 heures à la fois (18h → minuit au départ) ; des flèches ‹ › permettent de remonter dans la journée et de revenir.
- **Choix des envies** : plusieurs catégories possibles en même temps. Quatre blocs en vue (Pizza, Ciné, Spectacle, Concert), les autres (Sport, Musée…) sont sous « Plus de choix ».
- **Résultats près de vous** : position via la géolocalisation du navigateur, avec repli sur Paris 11e si elle est refusée. Un spinner s'affiche pendant le chargement de chaque liste.
- **Fenêtre horaire** : de l'heure choisie jusqu'à 3h du matin, calculée à l'heure de Paris quel que soit le fuseau du navigateur. Une heure déjà passée aujourd'hui démarre à maintenant.
- **Cartes** : titre (limité à 2 lignes), pastilles de genre, lieux triés par distance (3 par résultat, puis « Voir plus »).
- **Fiche détail** au clic sur une carte : image, genres, description, adresse, horaires, et les boutons « Réserver » (spectacles et concerts), « Appeler » et « Site officiel » (pizzerias, musées) et « Itinéraire ».
- **Responsive** : une colonne par liste sur PC (jusqu'à 6), listes empilées sur téléphone avec les 10 premiers résultats puis « Voir plus ».

| Catégorie | Source | Horaires | Clé |
|---|---|---|---|
| 🎬 Ciné | [API Cinéma](https://api.api-cinema.com) | séances | oui |
| 🎭 Spectacle | [Ticketmaster Discovery](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) (« Arts & Theatre ») | oui | oui |
| 🎵 Concert | Ticketmaster Discovery (« Music ») | oui | oui |
| 🏃 Sport | [Équipements sportifs](https://equipements.sports.gouv.fr) (ministère des Sports) | non | non |
| 🏛️ Musée | [Muséofile](https://www.data.gouv.fr/datasets/musees-de-france-base-museofile) (ministère de la Culture) + horaires [OpenStreetMap](https://www.openstreetmap.org) | si connus d'OSM | non |
| 🍕 Pizza | pizzerias d'[OpenStreetMap](https://www.openstreetmap.org) | si connus d'OSM | non |
| 🍝 Manger, 🍸 Sortir, 🎮 Jeux | pas encore | – | – |

Les catégories pas encore disponibles sont affichées grisées avec la mention « Bientôt ».

## Installation

Prérequis : **Node.js 20.19 ou plus récent** (ou 22.12+, version exigée par Vite 8) avec npm, et **Git**. Le projet a été développé avec Node 24.

### Linux

1. Installer Git et Node.js. Avec [nvm](https://github.com/nvm-sh/nvm) (n'importe quelle distribution) :

   ```bash
   # Git (Debian/Ubuntu ; sur Fedora : sudo dnf install git)
   sudo apt update && sudo apt install -y git

   # nvm, puis Node.js LTS (suivre les instructions du dépôt nvm, puis rouvrir le terminal)
   nvm install --lts
   node -v    # doit afficher v20.19 ou plus
   ```

2. Récupérer le projet et installer les dépendances :

   ```bash
   git clone https://github.com/julien-lav/que-faire-ce-soir.git
   cd que-faire-ce-soir
   npm install
   ```

3. Créer le fichier des clés (voir [Démarrage rapide](#démarrage-rapide)) :

   ```bash
   nano .env.local
   ```

4. Lancer l'app :

   ```bash
   npm run dev
   ```

   Puis ouvrir http://localhost:5173.

### Windows

Les commandes sont à lancer dans **PowerShell** (menu Démarrer → « PowerShell »).

1. Installer Git et Node.js avec `winget` (déjà présent sur Windows 10/11 à jour) :

   ```powershell
   winget install --id Git.Git -e
   winget install --id OpenJS.NodeJS.LTS -e
   ```

   **Fermer puis rouvrir PowerShell**, puis vérifier :

   ```powershell
   node -v    # doit afficher v20.19 ou plus
   git --version
   ```

   Sans `winget`, télécharger les installateurs sur [nodejs.org](https://nodejs.org) et [git-scm.com](https://git-scm.com).

2. Récupérer le projet et installer les dépendances :

   ```powershell
   git clone https://github.com/julien-lav/que-faire-ce-soir.git
   cd que-faire-ce-soir
   npm install
   ```

3. Créer le fichier des clés (voir [Démarrage rapide](#démarrage-rapide)) :

   ```powershell
   notepad .env.local
   ```

   Répondre « Oui » à la création du fichier. Dans l'enregistrement, choisir le type **« Tous les fichiers »** : sinon Windows crée `.env.local.txt`, qui n'est pas lu.

4. Lancer l'app :

   ```powershell
   npm run dev
   ```

   Puis ouvrir http://localhost:5173.

### Problèmes fréquents

| Problème | Solution |
|---|---|
| `npm : impossible de charger le fichier npm.ps1` (Windows) | PowerShell bloque les scripts. Lancer une fois `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou utiliser l'« Invite de commandes » (cmd) à la place. |
| Erreur de version de Node | Vérifier `node -v` (20.19+ ou 22.12+). Avec nvm : `nvm install --lts && nvm use --lts`. |
| Ciné, spectacles ou concerts : erreur 401 | `.env.local` absent, mal nommé ou clé fausse ; redémarrer `npm run dev` après l'avoir créé. |
| Le port 5173 est déjà utilisé | Vite choisit le port suivant et l'affiche dans le terminal ; utiliser l'adresse indiquée. |
| Tester sur un téléphone du même réseau | `npm run dev -- --host`, puis ouvrir l'adresse « Network » affichée. Le navigateur refuse la géolocalisation hors `localhost` sans HTTPS : l'app retombe alors sur Paris 11e. |

## Démarrage rapide

```bash
npm install
# créer .env.local à la racine avec les clés (voir ci-dessous)
npm run dev
```

Contenu de `.env.local` :

```
CINEMA_API_KEY=ac_live_...
TICKETMASTER_KEY=...
```

Sans clé, le sport et les musées fonctionnent (données ouvertes) mais le ciné, les spectacles et les concerts affichent une erreur 401.

Les clés n'ont **pas** de préfixe `VITE_` : elles restent côté serveur de dev et n'arrivent jamais dans le code envoyé au navigateur. `.env.local` est ignoré par git (règle `*.local`). Redémarrez `npm run dev` après toute modification.

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement avec proxys d'API |
| `npm run build` | vérification des types (`vue-tsc`) puis build de production |
| `npm run preview` | prévisualisation du build |

## Comment ça marche

Le navigateur n'appelle jamais directement les API. Il appelle `/api/...` et le serveur de dev Vite (`vite.config.ts`) redirige, en ajoutant la clé quand il y en a une :

| Chemin local | Destination | Authentification |
|---|---|---|
| `/api/cinema/*` | `https://api.api-cinema.com/v1/*` | header `Authorization: Bearer` |
| `/api/ticketmaster/*` | `https://app.ticketmaster.com/discovery/v2/*` | paramètre `apikey` ajouté côté serveur |
| `/api/sports/*` | `https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/*` | aucune |
| `/api/musees/*` | API tabulaire de data.gouv.fr (ressource Muséofile) | aucune |
| `/api/geo/*` | `https://geo.api.gouv.fr/*` | aucune |
| `/api/osm/*` | `https://overpass-api.de/api/*` | aucune |
| `/api/overpass-mirror/*` | `https://overpass.kumi.systems/api/*` (serveur de secours) | aucune |

### Sport : trois jeux de données croisés

Les données du ministère n'ont pas de coordonnées et d'activités au même endroit, on croise donc :

1. `data-es-equipement` : position, tri par distance (les 300 plus proches dans 3 km) ;
2. `data-es-installation` : vrai nom du lieu et adresse, et filtre des lieux fermés au public (établissements scolaires, pénitentiaires, militaires, CREPS) ;
3. `data-es-activite` : sports pratiqués dans les lieux restants.

Ces données n'ont pas d'horaires : l'heure choisie n'est pas utilisée pour le sport.

### Pizza : pizzerias OpenStreetMap

Les pizzerias sont les restaurants et fast-foods d'OpenStreetMap dont la cuisine (`cuisine`) contient « pizza », dans un rayon de 2 km. Chaque carte affiche des pastilles (Livraison, À emporter, Sur place, autres cuisines), la distance et les horaires du jour. La fiche détail ajoute le téléphone (« Appeler »), le site web et l'itinéraire. Comme pour les musées : les pizzerias confirmées ouvertes passent en premier, puis celles sans horaires renseignés, et celles que les horaires disent fermées sont masquées. Les données sont © contributeurs OpenStreetMap (ODbL), avec une couverture inégale (surtout pour le téléphone, la livraison et les horaires).

### Musées : liste du ministère + horaires OpenStreetMap

**La liste.** Muséofile (environ 1 200 « Musées de France »). L'ancienne API Opendatasoft de `data.culture.gouv.fr` ne répond plus, on passe donc par l'API tabulaire de data.gouv.fr. Les coordonnées y sont dans une seule colonne texte, donc la recherche par distance se fait en deux temps : `geo.api.gouv.fr` donne le département de l'utilisateur, on récupère ses musées, puis on calcule les distances dans le navigateur (rayon de 15 km). Un musée du département voisin peut manquer près d'une frontière.

**Les horaires.** Le jeu du ministère n'en contient pas. On les complète avec le champ `opening_hours` d'OpenStreetMap (API Overpass) : chaque musée est rapproché de sa fiche OSM par sa position et son nom. Un petit lecteur (`src/services/openingHours.ts`) comprend les horaires par jour de semaine ; ce qu'il ne comprend pas (mois, lever du soleil…) est affiché tel quel. Les jours fériés sont ignorés.

**L'affichage.**

1. D'abord les musées confirmés ouverts, triés par distance, avec les horaires du jour et, si une heure est choisie, « Ouvert à 20h ».
2. Ensuite ceux dont les horaires ne sont pas renseignés (« Horaires non renseignés »), avec un lien vers leur site officiel.
3. Les musées que les horaires disent fermés sont masqués : fermés à l'heure choisie, ou fermés toute la journée si aucune heure n'est choisie.

La couverture d'OSM est inégale. Les horaires sont © contributeurs OpenStreetMap (licence ODbL), ce qui est rappelé dans la fiche détail.

## Structure

```
src/
├─ views/          HomeView (lieu et heure), ChooseView (envies), SuggestionView (résultats)
├─ components/     ListingList (liste, spinner, « Voir plus »), ListingDetail (fiche),
│                  LocationPicker, TimeSelector (heures et flèches)
├─ stores/         search.ts : choix de l'utilisateur, position, chargement de chaque liste
├─ services/       cinema, ticketmaster, sports, museums, pizza,
│                  overpass (OpenStreetMap + serveur de secours), openingHours (lecteur d'horaires),
│                  placeHours (horaires d'une carte), timeWindow (fenêtre à l'heure de Paris),
│                  listing (forme commune)
└─ composables/    useIsMobile
```

Chaque source est convertie vers la même forme (`ListingItem` → `ListingPlace`, dans `services/listing.ts`), ce qui permet d'afficher toutes les listes avec un seul composant. Pour ajouter une catégorie : écrire un service qui renvoie des `ListingItem[]`, ajouter une fonction de chargement dans le store, puis l'ajouter à `AVAILABLE_CATEGORIES` pour la dégriser.

## Passage en production

Les proxys ci-dessus n'existent qu'en développement. Pour déployer, il faut un équivalent (reverse proxy ou petit backend) qui garde les clés côté serveur et ajoute les en-têtes. Sans cela, les appels Ciné et Ticketmaster échoueront.

Autres points à connaître :

- Ticketmaster : quota par défaut de 5000 appels par jour et 5 requêtes par seconde. Sa couverture est surtout forte hors de France, donc certaines listes peuvent être courtes.
- La recherche par position de Ticketmaster (`latlong`) est marquée comme dépréciée dans sa documentation.
- Le serveur Overpass public d'OpenStreetMap est à usage raisonnable et souvent surchargé : chaque requête est tentée sur le serveur principal puis sur un serveur de secours. Pour un vrai trafic, prévoir un cache côté serveur ou une instance dédiée. S'il est indisponible, les musées s'affichent sans horaires, et la liste Pizza affiche une erreur.
- L'app cible la France : les fenêtres horaires sont calculées à l'heure de Paris.
- Ne mettez jamais une clé dans un fichier suivi par git ni dans une variable `VITE_*`.
