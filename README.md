# 🌙 Que faire ce soir ?

Une petite app pour trouver quoi faire ce soir près de chez soi : une pizza, un restaurant, un verre, un film, un spectacle, un concert, du sport ou un musée. On choisit une heure et une ou plusieurs envies, l'app liste ce qui est disponible autour de soi, trié par distance.

🔗 **Site en ligne : https://que-faire-ce-soir.julien-laville.workers.dev/**

Stack : Vue 3 (`<script setup>`), TypeScript, Pinia, Vue Router, Tailwind CSS v4, Vite.

## Fonctionnalités

- **Choix de l'heure** : de 8h à minuit. Le sélecteur affiche 7 heures à la fois (18h → minuit au départ) ; des flèches ‹ › permettent de remonter dans la journée et de revenir.
- **Choix des envies** : plusieurs catégories possibles en même temps. Quatre blocs en vue (Pizza, Ciné, Spectacle, Concert), les autres (Manger, Un verre, Sport, Musée, Jeux) sont sous « Plus de choix ».
- **Lieu** : par défaut « Autour de moi » (géolocalisation du navigateur, cherchée dès l'ouverture de l'accueil). Si le navigateur ne trouve pas la position (refus, délai dépassé), l'app ne devine pas une ville : elle ouvre la recherche d'adresse avec un message, désactive les deux boutons de recherche et attend qu'une adresse soit choisie (ou un clic sur « Réessayer »). Le bouton « Changer de lieu » ouvre une recherche avec suggestions (ville ou adresse en France) ; toutes les listes cherchent alors autour du lieu choisi. Un spinner s'affiche pendant le chargement de chaque liste.
- **Fenêtre horaire** : de l'heure choisie jusqu'à 3h du matin, calculée à l'heure de Paris quel que soit le fuseau du navigateur. Une heure déjà passée aujourd'hui démarre à maintenant.
- **Adresses recommandées** : une courte liste écrite à la main dans `src/data/favorites.ts` (un nom et une zone, par exemple « I Briganti » dans le 14e). Un résultat qui correspond passe en premier, avec une ★ et un fond doré. Une adresse recommandée n'apparaît que si elle fait partie des résultats (dans la zone cherchée, et ouverte si une heure est choisie).
- **Favoris personnels ❤️** : le cœur et le bouton ＋ sont alignés sur une même ligne en bas à droite des cartes. Le cœur permet d’enregistrer ou de retirer le lieu en un clic ; lorsqu’une carte regroupe plusieurs lieux, il ouvre la fiche pour choisir lesquels enregistrer. Pour le cinéma, les spectacles et les concerts, c'est le cinéma ou la salle qui est conservé, avec son nom et son adresse. « Mes favoris », en haut à droite juste avant l’icône GitHub sur toutes les pages, ouvre `/favoris` : toutes les adresses enregistrées restent consultables, même hors de la recherche et des filtres actuels. Les coordonnées, contacts et descriptions des lieux sont sauvegardés dans le `localStorage` du navigateur, sans compte ni API supplémentaire. Les programmes, liens de réservation, horaires quotidiens et états d'ouverture ne sont pas conservés ; les distances sont recalculées depuis le lieu de recherche lorsqu'il est connu. Les cœurs se synchronisent entre onglets du même navigateur. Les favoris persistent après fermeture, mais restent propres au navigateur et disparaissent si ses données de site sont effacées. Si l'enregistrement est bloqué, un message indique que les favoris restent disponibles pour la visite en cours.
- **Cartes** : titre (limité à 2 lignes), pastilles de genre, lieux triés par distance (3 par résultat, puis « Voir plus »).
- **Recherche par titre** : une loupe après les titres Cinéma, Spectacles et Concerts ouvre un champ de recherche propre à chaque colonne. Les cartes déjà chargées sont filtrées immédiatement sur leur titre, sans tenir compte des majuscules ni des accents et sans appel API. La recherche inclut les cartes au-delà de « Charger plus ». Vider le champ ou refermer avec la loupe (ou Échap) réaffiche la liste.
- **Filtres des résultats** : masqués par défaut, ils s'ouvrent avec « Afficher les filtres » et se replient avec « Masquer les filtres ». La mention « Filtres actifs » reste visible lorsqu'un filtre s'applique, même si le panneau est replié. Distance maximale pour toutes les activités ; « Ouverts à l'heure choisie » pour les pizzerias, restaurants, bars et musées ; service au choix (Sur place, À emporter, Livraison) pour les pizzerias et restaurants. Les filtres se combinent et agissent immédiatement sur les lieux déjà trouvés, sans nouvel appel API ni élargissement du rayon initial. Les horaires ou services inconnus sont exclus quand le filtre correspondant est actif. Un compteur et un bouton de réinitialisation permettent de retrouver tous les résultats. Les filtres restent sélectionnés pendant la navigation, jusqu'à leur réinitialisation ou au rechargement de la page.
- **Notes des restaurants et pizzerias** : moyenne sur 5 et nombre d'avis [Mangrove](https://mangrove.reviews/) lorsqu'ils sont disponibles, sur les cartes et les fiches. Un lien « Consulter sur Google Maps » est proposé sur la fiche, même sans note. Aucune clé API ni facturation Google n'est nécessaire.
- **Carte facultative** : « Afficher la carte », à côté d'« Afficher les filtres », ouvre une carte interactive des résultats filtrés de toutes les activités sélectionnées. Un repère peut regrouper plusieurs sorties à la même position ; un clic permet d'ouvrir leur fiche. Le point bleu indique le lieu de recherche et « Recentrer » cadre les résultats. Les lieux sans coordonnées restent dans les listes. Leaflet et les tuiles OpenStreetMap se chargent uniquement à l'ouverture de la carte, sans clé API ; « Masquer la carte » la referme. Les tuiles sont chargées directement depuis `tile.openstreetmap.org` avec l'attribution visible, selon la [politique d'utilisation OSM](https://operations.osmfoundation.org/policies/tiles/).
- **Sélection à copier** : un badge ＋ en bas à droite de chaque carte l'ajoute à la sélection (✓ pour la retirer). Un bouton « 📋 Copier mes choix » apparaît au-dessus de la flèche ↑ et copie un message prêt à coller (heure, lieu, et pour chaque carte l'activité, tous les lieux et horaires). La sélection est vidée quand on change de lieu ou d'heure.
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
| 🍝 Manger | restaurants d'[OpenStreetMap](https://www.openstreetmap.org), hors pizzerias et burgers | si connus d'OSM | non |
| 🍸 Un verre | bars et pubs d'[OpenStreetMap](https://www.openstreetmap.org) | si connus d'OSM | non |
| 🎮 Jeux | pas encore | – | – |

Les catégories pas encore disponibles sont affichées grisées avec la mention « Bientôt ». Un clic sur « Jeux » ouvre une pop-up « Bientôt disponible : location de consoles et manettes pour vos soirées ».

## Affichage responsive

L’en-tête garde son espace au-dessus des pages. Les horaires et les activités s’adaptent aux petits écrans ; les résultats restent sur deux colonnes sur tablette avant de passer à davantage de colonnes sur grand écran. Les textes longs reviennent à la ligne et les étiquettes trop longues des cartes sont abrégées (texte complet dans la fiche).

La carte adapte sa hauteur à l’écran, y compris en paysage. Les fiches et les suggestions d’adresses peuvent défiler ; la sélection à copier réserve de la place en bas des résultats et des favoris.

Pour vérifier une modification visuelle, parcourir l’accueil, les activités dépliées, les résultats, les filtres, la carte, une fiche et les favoris à **320 × 568, 375 × 667, 390 × 844, 768 × 1024, 1024 × 768, 1440 × 900 et 844 × 390 px**. Inclure des noms et adresses longs et une sélection à copier ; vérifier l’absence de défilement horizontal et l’accès aux boutons du bas. Ces formats ont été contrôlés dans Chrome avec émulation ; un essai sur de vrais appareils reste complémentaire.

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
| Tester sur un téléphone du même réseau | `npm run dev -- --host`, puis ouvrir l'adresse « Network » affichée. Le navigateur refuse la géolocalisation hors `localhost` sans HTTPS : l'app demande alors une adresse. |

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

Sans clé, les pizzerias, restaurants, bars, le sport et les musées fonctionnent (données ouvertes), ainsi que les notes Mangrove et les liens Google Maps. Seuls le ciné, les spectacles et les concerts nécessitent les clés ci-dessus ; sans elles, ces catégories affichent une erreur 401.

Les clés n'ont **pas** de préfixe `VITE_` : elles restent côté serveur de dev et n'arrivent jamais dans le code envoyé au navigateur. `.env.local` est ignoré par git (règle `*.local`). Redémarrez `npm run dev` après toute modification.

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement avec proxys d'API |
| `npm test` | tests du chargement progressif, du cache et des pannes Overpass (réseau simulé) |
| `npm run build` | vérification des types (`vue-tsc`) puis build de production |
| `npm run preview` | prévisualisation du build |

## Comment ça marche

En développement, le navigateur appelle `/api/...` et Vite (`vite.config.ts`) redirige, en ajoutant la clé quand il y en a une. En production, les requêtes Overpass vont directement aux instances publiques ; les autres API passent par le Worker :

| Chemin local | Destination | Authentification |
|---|---|---|
| `/api/cinema/*` | `https://api.api-cinema.com/v1/*` | header `Authorization: Bearer` |
| `/api/ticketmaster/*` | `https://app.ticketmaster.com/discovery/v2/*` | paramètre `apikey` ajouté côté serveur |
| `/api/sports/*` | `https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/*` | aucune |
| `/api/musees/*` | API tabulaire de data.gouv.fr (ressource Muséofile) | aucune |
| `/api/geo/*` | `https://geo.api.gouv.fr/*` | aucune |
| `/api/adresse/*` | `https://api-adresse.data.gouv.fr/*` (recherche de lieu) | aucune |
| `/api/mangrove/*` | `https://api.mangrove.reviews/*` (avis publics) | aucune |
| `/api/osm/*` | `https://overpass-api.de/api/*` | aucune |
| `/api/overpass-mirror/*` | `https://overpass.openstreetmap.fr/api/*` (serveur de secours) | aucune |
| `/api/overpass-mirror2/*` | `https://overpass.private.coffee/api/*` (secours utilisé pour Overpass) | aucune |

### Sport : trois jeux de données croisés

Les données du ministère n'ont pas de coordonnées et d'activités au même endroit, on croise donc :

1. `data-es-equipement` : position, tri par distance (les 300 plus proches dans 3 km) ;
2. `data-es-installation` : vrai nom du lieu et adresse, et filtre des lieux fermés au public (établissements scolaires, pénitentiaires, militaires, CREPS) ;
3. `data-es-activite` : sports pratiqués dans les lieux restants.

Ces données n'ont pas d'horaires : l'heure choisie n'est pas utilisée pour le sport.

### Pizza : pizzerias OpenStreetMap

Les pizzerias sont les restaurants et fast-foods d'OpenStreetMap dont la cuisine (`cuisine`) contient « pizza », dans un rayon de 2 km. Pizza, restaurants et bars partagent désormais les mêmes requêtes : les lieux nommés (`restaurant`, `fast_food`, `bar`, `pub`) sont récupérés ensemble et classés côté application. Une première recherche dans un rayon d’environ **400 m** affiche les adresses proches, puis une seconde couvre **2 km** (les restaurants et bars restent filtrés à 1,5 km). Les premières cartes restent utilisables pendant la « Recherche complémentaire… ». Un échec de la première passe n’empêche pas la seconde ; si l’élargissement échoue, les premières adresses restent affichées avec un avertissement indiquant que la liste est incomplète.

Les requêtes identiques en cours sont mutualisées. Les réponses complètes sont conservées **10 minutes** en mémoire et dans `localStorage`, avec leurs données OSM brutes pour recalculer les horaires selon l’heure choisie. Une réponse de moins de **7 jours** peut être affichée immédiatement pendant une actualisation, avec la pastille « Données en cache » ; si l’API est indisponible, elle reste visible avec un avertissement. Ce cache ne garantit pas les horaires actuels. Il est limité à 24 requêtes ; les favoris ne sont pas concernés. Si le stockage est désactivé ou plein, l’application continue avec le cache mémoire. Sans résultat ni cache, une panne de tous les serveurs peut encore empêcher tout affichage.

Plus généralement, la recherche d'une catégorie démarre dès qu'on la coche sur la page des envies (et non au clic sur « GO ») : le temps que l'utilisateur finisse de choisir, les sources lentes ont déjà répondu. Chaque carte affiche des pastilles (Livraison, À emporter, Sur place, autres cuisines), la distance et les horaires du jour. La fiche détail ajoute le téléphone (« Appeler »), le site web et l'itinéraire. Comme pour les musées : les pizzerias confirmées ouvertes passent en premier, puis celles sans horaires renseignés, et celles que les horaires disent fermées sont masquées. Les données sont © contributeurs OpenStreetMap (ODbL), avec une couverture inégale (surtout pour le téléphone, la livraison et les horaires).

### Manger et Un verre : restaurants et bars OpenStreetMap

Même principe que les pizzerias (code commun dans `src/services/venues.ts`), dans un rayon de 1,5 km. « Manger » liste les `amenity=restaurant` nommés dont la cuisine n'est ni pizza ni burger (ces deux-là ont leur propre catégorie ou sont écartés), avec les pastilles de service et le type de cuisine. « Un verre » liste les `amenity=bar` et `amenity=pub` nommés, avec la pastille « Terrasse » quand elle est renseignée. Mêmes règles d'horaires que pour les pizzerias : ouverts confirmés d'abord, puis horaires inconnus, les fermés à l'heure choisie sont masqués.

### Notes : Mangrove / Open Reviews

**Aucune clé API ni configuration supplémentaire n'est nécessaire** pour les notes Mangrove et le lien « Consulter sur Google Maps ». Il n'y a aucune variable à ajouter dans `.env.local`, aucun compte Google Cloud à créer et aucune facturation Google à activer : le lien ouvre simplement une recherche Google Maps, sans utiliser l'API Places.

Les restaurants et pizzerias affichés demandent leurs avis en arrière-plan, via le proxy `/api/mangrove/reviews`. Une requête par zone de 0,05° (avec une marge aux frontières) est partagée entre les cartes et les fiches ; les résultats restent dix minutes en mémoire. Un échec est conservé une minute pour éviter les appels répétés. La liste n'attend pas les notes et reste utilisable si l'API échoue ou dépasse huit secondes.

Un avis doit se situer à moins de 100 m du lieu et correspondre à son identifiant OSM (sans tenir compte de la version) ou, si cet identifiant manque, exactement à son nom normalisé. Les avis sans identité de lieu fiable sont ignorés. Seule la dernière note de chaque contributeur identifié est retenue. La moyenne arithmétique des notes de 0 à 100 est convertie sur 5, avec le nombre d'avis et un lien d'attribution Mangrove ; ce calcul est distinct de l'indicateur probabiliste « quality » de Mangrove. Si la réponse atteint la limite de 1 000 avis par zone, aucune moyenne partielle n'est affichée.

Les données sont issues de la communauté [Mangrove / Open Reviews, sous licence CC BY 4.0](https://open-reviews.net/technology/). La couverture est limitée et varie selon les lieux : l'absence de note n'est pas une note de zéro. Le lien Google Maps cherche le nom et l'adresse (ou les coordonnées) du restaurant, sans appeler l'API Places.

### Musées : liste du ministère + horaires OpenStreetMap

**La liste.** Muséofile (environ 1 200 « Musées de France »). L'ancienne API Opendatasoft de `data.culture.gouv.fr` ne répond plus, on passe donc par l'API tabulaire de data.gouv.fr. Les coordonnées y sont dans une seule colonne texte, donc la recherche par distance se fait en deux temps : `geo.api.gouv.fr` donne le département de l'utilisateur, on récupère ses musées, puis on calcule les distances dans le navigateur (rayon de 15 km). Un musée du département voisin peut manquer près d'une frontière.

**Les horaires.** Le jeu du ministère n'en contient pas. On les complète avec le champ `opening_hours` d'OpenStreetMap (API Overpass) : chaque musée est rapproché de sa fiche OSM par sa position et son nom. Un petit lecteur (`src/services/openingHours.ts`) comprend les horaires par jour de semaine ; ce qu'il ne comprend pas (mois, lever du soleil…) est affiché tel quel. Les jours fériés sont ignorés.

**L'affichage.** La liste des musées s'affiche dès que les données du ministère sont reçues (avec « Chargement des horaires… »), puis se met à jour quand OpenStreetMap répond : les musées confirmés ouverts remontent en tête et les fermés disparaissent.

1. D'abord les musées confirmés ouverts, triés par distance, avec les horaires du jour et, si une heure est choisie, « Ouvert à 20h ».
2. Ensuite ceux dont les horaires ne sont pas renseignés (« Horaires non renseignés »), avec un lien vers leur site officiel.
3. Les musées que les horaires disent fermés sont masqués : fermés à l'heure choisie, ou fermés toute la journée si aucune heure n'est choisie.

La couverture d'OSM est inégale. Les horaires sont © contributeurs OpenStreetMap (licence ODbL), ce qui est rappelé dans la fiche détail.

## Structure

```
src/
├─ views/          HomeView (lieu et heure), ChooseView (envies), SuggestionView (résultats)
├─ components/     ListingList (liste, spinner, « Voir plus »), ListingDetail (fiche),
│                  LocationPicker, TimeSelector (heures et flèches), ShortlistBar (bouton de copie)
├─ stores/         search.ts : choix de l'utilisateur, position, chargement de chaque liste ;
│                  shortlist.ts : cartes cochées et message à copier
├─ services/       cinema, ticketmaster, sports, museums, pizza, restaurants, bars, venues (lieux OpenStreetMap communs),
│                  geocoding (recherche de lieu),
│                  overpass (OpenStreetMap + serveur de secours), openingHours (lecteur d'horaires),
│                  placeHours (horaires d'une carte), timeWindow (fenêtre à l'heure de Paris),
│                  listing (forme commune)
└─ composables/    useIsMobile
```

Chaque source est convertie vers la même forme (`ListingItem` → `ListingPlace`, dans `services/listing.ts`), ce qui permet d'afficher toutes les listes avec un seul composant. Pour ajouter une catégorie : écrire un service qui renvoie des `ListingItem[]`, ajouter une fonction de chargement dans le store, puis l'ajouter à `AVAILABLE_CATEGORIES` pour la dégriser.

## Passage en production

Les proxys ci-dessus n'existent qu'en développement. En production, `worker/index.ts` (Cloudflare Worker, configuré par `wrangler.jsonc`) en est l'équivalent : il répond aux chemins `/api/...`, lit les clés côté serveur, et le reste est servi comme fichiers statiques depuis `dist` (avec repli sur `index.html` pour le routeur Vue). Les appels Overpass (pizzas, restaurants, bars, horaires des musées) ne passent pas par le Worker en production : le navigateur les envoie directement aux serveurs Overpass (voir `src/services/overpass.ts`).

### Déployer sur Cloudflare (Workers)

Le site est hébergé comme **Worker avec fichiers statiques** (domaine `*.workers.dev`), pas comme Cloudflare Pages : le dossier `functions/` de Pages n'est donc pas utilisé.

1. **Connecter le dépôt** : Workers & Pages → Create → importer le dépôt GitHub, branche de production `master`.
2. **Build** (Settings → Build) : commande de build `npm run build`, commande de déploiement `npx wrangler deploy`, dossier racine `/`.
3. **Nom du Worker** : le `name` de `wrangler.jsonc` (`que-faire-ce-soir`) doit être identique au nom du Worker dans Cloudflare, sinon le déploiement crée un autre Worker.
4. **Ajouter les clés** `CINEMA_API_KEY` et `TICKETMASTER_KEY`, au bon endroit :
   - Dashboard : Workers & Pages → le Worker → **Settings → Variables and Secrets** (le bloc du haut, celui du Worker en fonctionnement), type **Secret** ;
   - ou en terminal : `npx wrangler secret put CINEMA_API_KEY` puis `npx wrangler secret put TICKETMASTER_KEY` (connexion à Cloudflare au premier lancement).
   - **Piège** : la section « Variables and secrets » de **Settings → Build** ne sert qu'au moment du build, le Worker ne la voit jamais (erreurs 401 sur Ticketmaster et Ciné).
   - Une variable de type *Text* peut être supprimée à chaque déploiement ; `keep_vars` dans `wrangler.jsonc` limite ce risque, mais les clés doivent rester de type *Secret*.
5. **Déployer** : un `git push` sur `master` déclenche le build. Un secret ajouté ou modifié ne s'applique qu'au déploiement suivant.
6. **Vérifier** : ouvrir `/api/adresse/search/?q=paris` (doit renvoyer du JSON) et `/api/ticketmaster/events.json?size=1` (des événements, et non « Invalid ApiKey »).

Notes sur `wrangler.jsonc` : `assets.directory` pointe sur `dist`, `run_worker_first: ["/api/*"]` envoie uniquement les chemins `/api/` au Worker, et `not_found_handling: single-page-application` renvoie `index.html` pour les autres URL.

Autres points à connaître :

- Ticketmaster : quota par défaut de 5000 appels par jour et 5 requêtes par seconde. Sa couverture est surtout forte hors de France, donc certaines listes peuvent être courtes.
- La recherche par position de Ticketmaster (`latlong`) est marquée comme dépréciée dans sa documentation.
- Les serveurs publics Overpass d’OpenStreetMap sont à usage raisonnable et souvent surchargés. Une requête part vers `overpass-api.de` ; un secours indépendant (`overpass.private.coffee`) démarre après une seconde, ou dès l’échec du premier. La première réponse complète gagne et l’autre est annulée. Les recherches de lieux ont une attente maximale de 6 secondes pour la petite zone, puis 12 secondes pour la zone complète (20 secondes par défaut pour les autres usages). Les erreurs ne déclenchent plus trois tentatives automatiques sur chaque miroir. Une réponse HTTP 200 contenant une erreur Overpass n’est pas mise en cache. Pour un vrai trafic, prévoir un cache côté serveur ou une instance dédiée. Si Overpass est indisponible, les musées s’affichent sans horaires ; Pizza, Manger et Un verre conservent les premières adresses ou celles en cache, sinon affichent une erreur.
- L'app cible la France : les fenêtres horaires sont calculées à l'heure de Paris.
- Ne mettez jamais une clé dans un fichier suivi par git ni dans une variable `VITE_*`.
