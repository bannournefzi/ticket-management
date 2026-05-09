# Plateforme intelligente de gestion des tickets

## Présentation du projet

### Contexte
Ce dépôt correspond à une plateforme de gestion des tickets conçue dans une logique d’entreprise, avec une séparation claire entre une application web frontend développée en **Angular 16** et une API backend développée en **Spring Boot 3**. Le projet s’inscrit dans un contexte de transformation digitale du support interne, où la centralisation des demandes, la traçabilité des interventions et l’amélioration continue du service rendu sont des enjeux majeurs.

L’application couvre non seulement la gestion classique des incidents et demandes, mais intègre également des briques avancées telles que la **base de connaissances**, la **messagerie temps réel**, les **réunions**, les **notifications temps réel** et plusieurs fonctionnalités d’**intelligence artificielle** autour du diagnostic, du chatbot et de la structuration automatique des tickets.

### Objectif
L’objectif principal du projet est de fournir une plateforme unifiée permettant :
- de centraliser les demandes des utilisateurs métier ;
- de faciliter le traitement et le suivi des tickets par les Business Analysts ;
- de piloter l’activité par des tableaux de bord, statistiques et indicateurs SLA ;
- d’administrer les utilisateurs, groupes et paramètres fonctionnels ;
- d’enrichir l’expérience utilisateur à l’aide de modules intelligents de support et d’assistance.

### Problématique résolue
Dans de nombreuses organisations, la gestion des incidents repose encore sur des échanges dispersés entre e-mails, messageries instantanées et fichiers manuels. Cette situation engendre une perte d’information, une faible visibilité sur l’avancement des demandes, une difficulté à mesurer la performance du support et une capitalisation insuffisante des solutions déjà apportées.

Le projet répond à cette problématique en proposant une solution intégrée de **ticket management**, capable de :
- structurer le cycle de vie d’un ticket ;
- historiser les actions et décisions ;
- appliquer des règles de priorité et de SLA ;
- distribuer les responsabilités selon les rôles ;
- capitaliser la connaissance métier ;
- assister les utilisateurs via l’IA et des outils collaboratifs.

---

## Description fonctionnelle

### Description complète de la plateforme
La plateforme est une application web multi-profils orientée support et gestion des demandes. Elle permet à un utilisateur métier de créer un ticket, d’y joindre des informations complémentaires, de suivre son état d’avancement et d’échanger avec les intervenants autorisés. Le Business Analyst prend ensuite en charge le ticket, l’analyse, l’assigne, le fait évoluer dans son cycle de traitement et peut, si nécessaire, le convertir en article de base de connaissances ou le synchroniser avec **MantisBT**.

L’administrateur dispose quant à lui d’une vue transverse sur les utilisateurs, les groupes, les sessions, certaines statistiques globales et les paramètres structurants du système. Cette séparation des responsabilités traduit une organisation réaliste du support en entreprise.

La plateforme ne se limite pas à la simple gestion CRUD des tickets. Elle intègre également :
- un **dashboard métier** et un **dashboard Business Analyst** pour le pilotage opérationnel ;
- un **dashboard administrateur** pour le suivi des comptes et de l’activité ;
- une **messagerie temps réel** pour les échanges directs ;
- des **notifications push** via WebSocket ;
- un module de **réunions** pour planifier ou lancer des échanges immédiats ;
- une **base de connaissances** alimentée à partir des tickets résolus ;
- un **arbre de diagnostic interactif** ;
- un **chatbot IA** alimenté par Ollama et un stockage vectoriel pgvector ;
- une fonctionnalité **voice-to-ticket** qui transforme un texte issu d’une transcription vocale en ticket structuré.

### Cas d’utilisation principaux
#### 1. Cas d’utilisation côté utilisateur métier
L’utilisateur métier s’authentifie, accède à son espace personnel, crée un ticket avec un titre, une description, une priorité, une catégorie et éventuellement des pièces jointes. Il peut consulter ses tickets, suivre leur statut, consulter l’historique, voir les commentaires si ceux-ci sont autorisés et exploiter la base de connaissances ou l’arbre de diagnostic avant ou après la création d’une demande.

#### 2. Cas d’utilisation côté Business Analyst
Le Business Analyst consulte les tickets visibles selon les règles de groupe, applique des filtres avancés, assigne les tickets, met à jour les statuts, suit les échéances SLA, active ou désactive les commentaires côté métier, planifie des réunions, consulte un calendrier, pilote les indicateurs et peut transformer un ticket résolu en article de capitalisation.

#### 3. Cas d’utilisation côté administrateur
L’administrateur crée ou modifie des comptes, attribue les rôles, gère l’activation ou la désactivation des utilisateurs, administre les groupes, consulte les sessions actives, supervise les statistiques globales et accède à un assistant IA centré sur la gestion des comptes et de la santé du parc utilisateur.

### Workflow de gestion des tickets
Le workflow métier des tickets peut être synthétisé comme suit :

```text
Utilisateur métier
   │
   ├── Création du ticket
   │      └── définition du titre, description, priorité, catégorie, pièces jointes
   │
   ├── Enregistrement local du ticket
   │      └── calcul automatique des échéances SLA et historique initial
   │
   ├── Notification des BA et des administrateurs
   │
Business Analyst
   │
   ├── Consultation / filtrage des tickets visibles
   ├── Assignation à un analyste
   ├── Transition de statut
   ├── Ajout de commentaires / pilotage du traitement
   ├── Réunion ou échange temps réel si nécessaire
   ├── Résolution puis fermeture
   │
   ├── Conversion éventuelle en article de base de connaissances
   └── Push optionnel vers MantisBT
```

Les statuts gérés dans le code couvrent les étapes suivantes : **NEW**, **FEEDBACK**, **ACKNOWLEDGED**, **CONFIRMED**, **ASSIGNED**, **RESOLVED** et **CLOSED**. Les transitions sont contrôlées par le backend afin d’éviter des changements incohérents. Le système conserve un **historique complet** des modifications, y compris les changements de statut, de priorité, d’assignation ou d’attributs majeurs.

---

## Architecture du système

### Architecture globale
Le projet adopte une architecture **client-serveur** en deux couches applicatives principales :
- un **frontend Angular** responsable de l’interface, de l’expérience utilisateur et de l’orchestration côté client ;
- un **backend Spring Boot** responsable de la logique métier, de la sécurité, de la persistance, des intégrations externes et du temps réel.

```text
┌──────────────────────────────────────────────────────────────┐
│                    Frontend Angular 16.2                    │
│  Auth • Dashboards • Tickets • Chat • Notifications • IA    │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP REST + JWT
                               │ WebSocket STOMP/SockJS
┌──────────────────────────────▼───────────────────────────────┐
│                  Backend Spring Boot 3.3.5                  │
│ Controllers • Services • Security • Repositories • Events   │
└───────────────┬─────────────────────┬────────────────────────┘
                │                     │
                │                     ├── PostgreSQL principal
                │                     │   Utilisateurs, tickets, groupes,
                │                     │   commentaires, historique, notifications
                │                     │
                │                     ├── PostgreSQL + pgvector
                │                     │   Embeddings et recherche vectorielle IA
                │                     │
                │                     ├── Ollama
                │                     │   Chatbot et structuration intelligente
                │                     │
                │                     ├── SMTP / Mail
                │                     │   Activation de compte, réinitialisation
                │                     │
                │                     └── MantisBT
                │                         Synchronisation externe des tickets
```

### Communication frontend/backend
La communication repose principalement sur deux mécanismes :

1. **REST API**
   - le frontend consomme les endpoints exposés par le backend sous le contexte `/api/v1` ;
   - l’authentification se fait via un token JWT transmis dans l’en-tête `Authorization: Bearer <token>` ;
   - les services Angular encapsulent les appels HTTP et exposent des observables RxJS aux composants.

2. **WebSocket STOMP sur SockJS**
   - utilisé pour les notifications et la messagerie temps réel ;
   - reconnexion automatique côté frontend ;
   - gestion de file d’attente de messages et heartbeat ;
   - destinations côté serveur organisées autour de `/app`, `/topic` et `/user`.

### Organisation du code
#### Monorepo
```text
ticket-management/
├── telecom-frontend/      # application Angular
└── ticket-management-api/ # API Spring Boot
```

#### Organisation du frontend
Le frontend est structuré par domaines fonctionnels. Le dossier `src/app/` contient des modules clairement séparés :
- `auth/` : connexion, inscription, activation, mot de passe oublié, profil ;
- `Metier/` : dashboard utilisateur, création de ticket, liste des tickets, base de connaissances, diagnostic ;
- `BA/` : dashboard analyste, gestion des tickets, calendrier, paramètres ;
- `admin/` : gestion des utilisateurs, groupes, dashboard administrateur ;
- `services/` : encapsulation des appels REST et WebSocket ;
- `guards/` : contrôle d’accès basé sur le rôle ;
- `shared/` et `layouts/` : structure commune de navigation ;
- `websocket/` et `chatbot/` : composants temps réel et IA ;
- `meetings/` : planification et participation aux réunions.

#### Organisation du backend
Le backend est également structuré par domaine fonctionnel :
- `auth/` : authentification, inscription, activation, réinitialisation de mot de passe ;
- `User/` : entité utilisateur, sessions, photo de profil ;
- `Ticket/` : cœur métier du ticketing ;
- `Admin/` : administration des comptes ;
- `group/` : gestion des groupes et appartenances ;
- `Notification/` : notifications persistées et push ;
- `chat/` : conversations et messages ;
- `meeting/` : réunions et calendrier ;
- `KnowledgeBase/` : articles de connaissance et arbres de diagnostic ;
- `chatbot/` et `ai_voice/` : fonctions IA ;
- `security/` et `config/` : sécurité, JWT, WebSocket, configuration applicative ;
- `settings/` : SLA, catégories et horaires de travail.

---

## Technologies utilisées

### Langages
- **TypeScript** pour le frontend Angular ;
- **Java 17** pour le backend Spring Boot ;
- **HTML / SCSS** pour les vues et le style ;
- **SQL / PostgreSQL** pour la persistance ;
- **JSON / JSONB** pour certains contenus structurés, notamment les arbres de diagnostic.

### Frameworks et bibliothèques frontend
- **Angular 16.2** : framework SPA principal ;
- **RxJS** : programmation réactive ;
- **Bootstrap 5** : composants et grille CSS ;
- **Chart.js** : visualisation statistique ;
- **FullCalendar** : gestion des calendriers ;
- **SockJS + STOMP.js** : WebSocket côté client ;
- **ngx-toastr** : notifications toast ;
- **jwt-decode** : décodage du JWT côté client ;
- **Font Awesome** : iconographie ;
- **ngx-emoji-mart** : enrichissement UX pour la messagerie.

### Frameworks et bibliothèques backend
- **Spring Boot 3.3.5** : socle applicatif ;
- **Spring Web** : exposition REST ;
- **Spring Data JPA** : accès aux données ;
- **Spring Security** : authentification et autorisation ;
- **Spring WebSocket** : temps réel ;
- **Spring Validation** : validation des requêtes ;
- **Spring Mail** et **Thymeleaf** : gestion des e-mails ;
- **Spring AI** : intégration IA avec Ollama et pgvector ;
- **SpringDoc OpenAPI** : documentation Swagger ;
- **JJWT** : génération et validation des JWT ;
- **Lombok** : réduction du code répétitif.

### Outils et services externes
- **PostgreSQL** : base transactionnelle principale ;
- **pgvector** : moteur vectoriel pour la recherche sémantique ;
- **Ollama** : exécution locale de modèles IA ;
- **MantisBT** : synchronisation externe de tickets ;
- **SMTP / MailDev ou fournisseur mail** : envoi des e-mails transactionnels ;
- **Maven Wrapper** et **npm** : gestion de build et dépendances.

---

## Fonctionnalités principales

### Authentification
Le système prend en charge l’inscription, l’activation de compte par e-mail, la connexion par JWT, la réinitialisation de mot de passe et le changement de mot de passe pour les utilisateurs authentifiés. Le backend expose les endpoints `/auth/register`, `/auth/authenticate`, `/auth/activate-account`, `/auth/forgot-password`, `/auth/reset-password` et `/auth/change-password`.

Le frontend centralise cette logique dans `AuthService`, stocke le token JWT, déduit les rôles à partir du token et oriente automatiquement l’utilisateur vers l’espace cohérent avec ses permissions.

### Gestion des utilisateurs
L’administration des comptes comprend :
- création d’utilisateurs ;
- consultation des profils ;
- modification des rôles ;
- activation/désactivation des comptes ;
- affectation du département ;
- suivi statistique des comptes ;
- gestion de la photo de profil ;
- suivi et révocation des sessions actives.

Cette couche permet à l’administrateur de gouverner le parc des comptes et d’identifier rapidement les utilisateurs actifs, verrouillés ou désactivés.

### Création et suivi des tickets
La gestion des tickets constitue le cœur du projet. Chaque ticket possède notamment un titre, une description, une priorité, un statut, une catégorie, un créateur, éventuellement un assignataire et un groupe d’origine. À la création :
- le ticket est enregistré localement ;
- le groupe de l’utilisateur créateur peut être mémorisé ;
- les échéances SLA sont calculées ;
- une entrée d’historique initiale est créée ;
- des notifications sont émises vers les rôles concernés.

Le système prend en charge :
- le listing paginé ;
- le filtrage avancé par statut, priorité, département, catégorie, assignation et dépassement SLA ;
- l’assignation à un analyste ;
- le téléchargement de pièces jointes ;
- la consultation de l’historique ;
- le calcul des transitions autorisées ;
- l’activation ou désactivation des commentaires pour les utilisateurs métier ;
- la synchronisation ponctuelle vers MantisBT.

### Tableaux de bord
Trois espaces décisionnels sont implémentés :
- **dashboard utilisateur métier** : vue de ses tickets, répartition par statut, priorités, métriques SLA et raccourcis d’action ;
- **dashboard Business Analyst** : vision consolidée des tickets à traiter, de l’avancement, des priorités et du backlog ;
- **dashboard administrateur** : statistiques utilisateurs, activité récente, vue croisée sur les tickets et export CSV.

Les graphiques s’appuient sur **Chart.js**, tandis que les données proviennent des services Angular branchés sur les statistiques backend.

### Notifications
Le système combine une couche de persistance des notifications et une diffusion temps réel. Lorsqu’un ticket est créé, assigné ou change de statut, des événements applicatifs déclenchent la création de notifications ciblées. Le frontend récupère ces notifications via REST et s’abonne également à une file WebSocket pour afficher instantanément les nouvelles alertes à l’utilisateur connecté.

### Reporting
Le backend calcule des indicateurs tels que :
- nombre total de tickets ;
- répartition par statut ;
- répartition par priorité ;
- nombre de tickets non assignés ;
- nombre de tickets hors SLA ;
- volumes sur 7 et 30 jours ;
- temps moyen de résolution ;
- distribution par département et catégorie.

Le frontend exploite aussi l’export **CSV** pour les tickets et les utilisateurs dans certaines vues administratives.

### Rôles et permissions
Les permissions sont gérées à deux niveaux :
- côté frontend via le `RoleGuard` et la configuration des routes ;
- côté backend via Spring Security et des contrôles explicites au niveau des services et contrôleurs.

Cette double barrière garantit à la fois une bonne expérience utilisateur et une sécurité réelle côté serveur.

### Messagerie et collaboration
Le projet intègre une messagerie directe entre utilisateurs avec conversations, messages, pièces jointes médias et accusés de lecture. En complément, un module de réunions permet au Business Analyst de créer des réunions planifiées ou instantanées, qu’un utilisateur peut rejoindre via un code. Un calendrier de réunions est également disponible.

### Base de connaissances
Les tickets résolus peuvent être convertis en **articles de base de connaissances**, ce qui permet de capitaliser les solutions apportées. La plateforme inclut aussi des **arbres de diagnostic interactifs**, utiles pour guider les utilisateurs dans la résolution autonome de problèmes récurrents.

### Fonctionnalités IA
Les fonctionnalités IA constituent un différenciateur fort du projet :
- **chatbot contextuel** avec séparation des usages administrateur / utilisateur ;
- **indexation de tickets** dans un vector store ;
- **recherche sémantique** via pgvector ;
- **analyse de problème** pour trouver l’arbre de diagnostic adapté ;
- **voice-to-ticket** pour structurer automatiquement une transcription vocale ;
- personnalisation des réponses selon le rôle connecté et le contexte métier disponible.

---

## Rôles des utilisateurs

### Administrateur (`ROLE_ADMIN`)
L’administrateur est responsable de la gouvernance globale de la plateforme. Il gère les utilisateurs, les rôles, les départements, l’activation des comptes, les groupes et certaines vues consolidées. Il accède à un dashboard dédié ainsi qu’à un assistant IA spécialisé sur les utilisateurs et la santé des comptes. En revanche, le chatbot administrateur est explicitement borné à la gestion des comptes et non au contenu détaillé des tickets.

### Business Analyst (`ROLE_BUSINESS_ANALYST`)
Le Business Analyst est le principal acteur opérationnel du traitement des tickets. Il consulte les demandes visibles selon les règles de groupes, les filtre, les assigne, suit leur progression, pilote les statuts, gère les paramètres opérationnels comme les SLA et catégories, planifie des réunions et transforme les cas résolus en base de connaissances. Il joue le rôle de pivot entre la remontée métier et la résolution effective.

### Utilisateur métier (`ROLE_USER`)
L’utilisateur métier est l’émetteur principal des demandes. Il crée ses tickets, suit leur avancement, consulte ses informations, interagit via certains canaux autorisés, accède au diagnostic et à la base de connaissances, et bénéficie d’une meilleure visibilité sur l’état de ses demandes qu’avec un circuit traditionnel non outillé.

---

## Structure du projet

### Racine du dépôt
```text
ticket-management/
├── telecom-frontend/
├── ticket-management-api/
├── AGENTS.md
└── .gitignore
```

### Dossiers et fichiers importants côté frontend
- `telecom-frontend/package.json` : scripts npm et dépendances principales ;
- `telecom-frontend/src/app/app-routing.module.ts` : cartographie des routes publiques et protégées ;
- `telecom-frontend/src/app/app.module.ts` : assemblage principal des composants ;
- `telecom-frontend/src/app/auth/` : authentification et profil ;
- `telecom-frontend/src/app/Metier/` : fonctionnalités utilisateur métier ;
- `telecom-frontend/src/app/BA/` : fonctionnalités Business Analyst ;
- `telecom-frontend/src/app/admin/` : administration ;
- `telecom-frontend/src/app/services/` : services métier, notification, ticket, réunion, groupe, chatbot ;
- `telecom-frontend/src/app/guards/role.guard.ts` : contrôle d’accès par rôle ;
- `telecom-frontend/src/app/environments/environment.ts` : URL de l’API et du WebSocket.

### Dossiers et fichiers importants côté backend
- `ticket-management-api/pom.xml` : dépendances Maven ;
- `ticket-management-api/src/main/resources/application.yml` : configuration globale, profil actif, IA, context path ;
- `ticket-management-api/src/main/resources/application-dev.yml` : configuration locale de développement ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/security/` : JWT, filtre et configuration de sécurité ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/Ticket/` : cœur métier ticketing ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/auth/` : authentification et mot de passe ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/Notification/` : notifications persistées et push ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/settings/` : paramètres SLA, catégories et horaires ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/chatbot/` : chatbot et indexation vectorielle ;
- `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/mantis/` : intégration MantisBT.

---

## Base de données

### Structure générale
Le backend s’appuie sur **PostgreSQL** comme base de données principale. Les entités sont modélisées via JPA/Hibernate et auditées à l’aide d’annotations comme `@CreatedDate` et `@LastModifiedDate`. Une seconde base PostgreSQL avec extension **pgvector** est utilisée pour la couche IA et la recherche vectorielle.

### Entités principales
#### Utilisateurs et sécurité
- **User** : identité, email, mot de passe, rôle, département, état du compte, photo, dernier accès ;
- **Role** : rôles applicatifs ;
- **Token** / **PasswordResetToken** / **UserSession** : authentification, sessions et réinitialisation.

#### Gestion des tickets
- **Ticket** : cœur fonctionnel du système ;
- **Comment** : commentaires liés aux tickets ;
- **TicketHistory** : journal d’audit métier ;
- **TicketAttachment** : pièces jointes ;
- tables complémentaires pour les tags et données liées au SLA.

#### Organisation et collaboration
- **Group** et **GroupMembership** : organisation des utilisateurs ;
- **Conversation** et **Message** : messagerie ;
- **Meeting** et **MeetingNotification** : réunions et rappels.

#### Capitalisation et IA
- **KnowledgeBaseArticle** : article issu d’une solution capitalisée ;
- **TroubleshootingTree** : arbre de diagnostic stocké sous forme JSON/JSONB ;
- configuration spécifique pour le vector store et les embeddings.

#### Paramétrage métier
- **SlaConfig** : règles SLA par niveau de priorité ;
- **TicketCategoryConfig** : catégories de tickets activables ;
- **WorkingHoursConfig** : horaires ouvrés.

#### Notifications
- **Notification** : notifications persistées avec type, état de lecture et référence métier.

### Relations principales
Le modèle relationnel suit une logique métier cohérente :
- un utilisateur peut créer plusieurs tickets ;
- un ticket peut être assigné à un analyste ;
- un ticket peut posséder plusieurs commentaires, pièces jointes et entrées d’historique ;
- un utilisateur peut appartenir à plusieurs groupes ;
- un ticket peut garder la trace du groupe de son créateur au moment de sa création ;
- un article de base de connaissances peut être rattaché à un ticket d’origine.

### Logique métier portée par la base
La base n’est pas seulement un stockage passif. Elle supporte des règles métier importantes :
- calcul et suivi des échéances SLA ;
- historique détaillé des changements ;
- filtrage multicritère ;
- visibilité des tickets selon les groupes et l’historique d’appartenance ;
- exploitation analytique des statuts, priorités, catégories et départements.

---

## Sécurité

### Authentification
L’authentification repose sur **JWT**. Après authentification, le backend renvoie un token contenant des informations utiles telles que l’identité et les rôles. Ce token est ensuite transmis à chaque requête protégée.

### Autorisation
L’autorisation s’appuie sur :
- les rôles Spring Security ;
- la configuration du `SecurityFilterChain` ;
- des annotations et contrôles au niveau des endpoints ;
- des vérifications métier au niveau des services.

Certaines routes sont explicitement publiques, notamment l’authentification, la documentation OpenAPI, certaines routes WebSocket, les routes du chatbot ou quelques paramètres publics. Toutes les autres requêtes nécessitent une authentification valide.

### Protection des données
Le système met en œuvre plusieurs mécanismes de protection :
- validation des requêtes entrantes ;
- filtrage CORS configuré ;
- contrôle de taille et de type pour certains fichiers ;
- séparation des périmètres d’accès selon le rôle ;
- gestion des sessions utilisateur côté backend ;
- expiration des comptes ou verrouillage selon l’état du profil.

### Sécurité temps réel
Les connexions WebSocket exploitent également le contexte de sécurité et le token JWT, avec reconnexion automatique côté client. Le frontend surveille l’état de la connexion et peut réinitialiser ses abonnements après reconnexion.

---

## APIs et intégrations

### Style d’API
L’architecture d’échange est principalement **RESTful**, complétée par **WebSocket STOMP** pour le temps réel.

### Endpoints importants
#### Authentification
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/authenticate`
- `GET /api/v1/auth/activate-account`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`

#### Tickets
- `POST /api/v1/tickets`
- `GET /api/v1/tickets`
- `GET /api/v1/tickets/{id}`
- `GET /api/v1/tickets/my-tickets`
- `GET /api/v1/tickets/filter`
- `PATCH /api/v1/tickets/{ticketId}/assign/{assigneeId}`
- `PATCH /api/v1/tickets/{ticketId}/status`
- `GET /api/v1/tickets/stats`
- `GET /api/v1/tickets/{ticketId}/history`
- `PATCH /api/v1/tickets/{ticketId}/push-to-mantis`
- `POST /api/v1/tickets/{ticketId}/attachments`

#### Commentaires
- `POST /api/v1/tickets/{ticketId}/comments`
- `GET /api/v1/tickets/{ticketId}/comments`
- `DELETE /api/v1/tickets/{ticketId}/comments/{commentId}`

#### Administration
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{id}/role`
- `PATCH /api/v1/admin/users/{id}/toggle-status`
- `GET /api/v1/admin/users/stats`

#### Paramètres métier
- `GET /api/v1/settings/sla`
- `PUT /api/v1/settings/sla`
- `GET /api/v1/settings/categories`
- `PUT /api/v1/settings/working-hours`

#### Base de connaissances et diagnostic
- `GET /api/v1/knowledge-base`
- `POST /api/v1/knowledge-base/from-ticket/{ticketId}`
- `GET /api/v1/troubleshooting-trees/{id}`
- `POST /api/v1/troubleshooting-trees/analyze-problem`

#### IA
- `POST /api/v1/chatbot/chat`
- `POST /api/v1/chatbot/index-tickets`
- `POST /api/v1/ai/voice-to-ticket`

#### Collaboration
- `GET /api/v1/notifications`
- `PUT /api/v1/notifications/{id}/read`
- `POST /api/v1/meetings/scheduled`
- `POST /api/v1/meetings/instant`
- `GET /api/v1/conversations`
- `POST /api/v1/messages`

### Services externes et intégrations
#### MantisBT
Le projet permet d’envoyer un ticket local vers MantisBT et de synchroniser les pièces jointes. Cette intégration est utile dans un contexte hybride où la plateforme interne doit dialoguer avec un outil de bug tracking existant.

#### Ollama + pgvector
Le chatbot s’appuie sur **Ollama** pour la génération de réponses et sur un **vector store pgvector** pour injecter un contexte pertinent à partir des tickets indexés ou de la base de connaissances.

#### E-mail transactionnel
Les fonctions d’activation de compte et de réinitialisation de mot de passe nécessitent un service SMTP configuré localement ou un fournisseur de messagerie.

#### Swagger / OpenAPI
La documentation technique des endpoints est exposée via Swagger UI, ce qui facilite les tests et l’exploration de l’API.

---

## Installation et exécution

### Prérequis
Pour exécuter le projet localement, il est recommandé de disposer de :
- **Node.js** et **npm** pour le frontend ;
- **Java 17** pour le backend ;
- **Maven Wrapper** fourni par le projet ;
- **PostgreSQL** sur le port **5432** pour la base principale ;
- **PostgreSQL avec pgvector** sur le port **5433** pour la partie IA ;
- **Ollama** si l’on souhaite activer les fonctionnalités intelligentes ;
- éventuellement **MailDev** ou un serveur SMTP de test ;
- éventuellement **MantisBT** pour tester l’intégration externe.

### 1. Cloner et se positionner dans le dépôt
```bash
git clone <url-du-depot>
cd ticket-management
```

### 2. Préparer les services externes
Avant de démarrer l’application, il faut vérifier :
- qu’une base PostgreSQL principale est disponible ;
- qu’une base PostgreSQL dédiée au vector store est disponible avec pgvector ;
- que les paramètres locaux du backend sont adaptés à votre environnement ;
- que les secrets et mots de passe sont remplacés par des valeurs locales sûres et non versionnées si nécessaire.

### 3. Lancer le backend
```bash
cd ticket-management-api
./mvnw spring-boot:run
```

Le backend démarre sur le port **8088** avec le contexte :
```text
http://localhost:8088/api/v1
```

Swagger est accessible via :
```text
http://localhost:8088/swagger-ui.html
```

### 4. Lancer le frontend
```bash
cd telecom-frontend
npm install
npm start
```

Le frontend est accessible sur :
```text
http://localhost:4200
```

### 5. Commandes utiles
#### Frontend
```bash
npm start
npm run build
npm test
```

#### Backend
```bash
./mvnw spring-boot:run
./mvnw clean package
./mvnw test
```

### 6. Remarque sur la validation observée
Lors de l’analyse du dépôt, le **build frontend** a abouti avec succès après installation des dépendances. En revanche, le **build Maven complet** dépend d’une base PostgreSQL disponible localement : sans base active, le test de chargement du contexte Spring échoue au démarrage de l’application.

---

## Difficultés et solutions

### 1. Complexité de la gestion des rôles et des visibilités
Le projet ne se contente pas d’un cloisonnement simple par rôle. Il introduit également une logique de visibilité des tickets fondée sur les groupes et l’historique d’appartenance. Cette approche augmente la complexité métier mais permet une gestion beaucoup plus réaliste des droits d’accès.

**Solution adoptée :** combinaison de contrôles Spring Security, logique métier dans les services et filtrage spécifique au niveau des repositories JPA.

### 2. Gestion des SLA et des transitions de statut
Le suivi des SLA nécessite des calculs temporels, des règles de priorité et une cohérence stricte sur les transitions de statut. Sans encadrement fort, les métriques deviennent rapidement peu fiables.

**Solution adoptée :** calcul automatique des échéances à la création, méthodes métier dédiées dans l’entité et le service, validation des transitions avant persistance, conservation de l’historique complet.

### 3. Intégration des fonctionnalités temps réel
L’ajout des notifications, de la messagerie et des réunions exige une gestion fiable des connexions WebSocket, des reconnexions et de la synchronisation entre événements serveur et interface client.

**Solution adoptée :** usage de STOMP sur SockJS, reconnexion automatique côté Angular, abstraction via un service WebSocket centralisé.

### 4. Intégration de l’IA dans une application métier
L’IA doit être utile sans compromettre la sécurité, la lisibilité fonctionnelle ni le cloisonnement des rôles. Le chatbot doit répondre différemment selon qu’il s’adresse à un administrateur ou à un utilisateur métier.

**Solution adoptée :** prompts spécialisés par rôle, alimentation contextuelle via vector store, séparation des périmètres de données et ajout de services IA ciblés (chatbot, diagnostic, voice-to-ticket).

### 5. Interopérabilité avec un outil externe
La synchronisation vers MantisBT implique de gérer un format d’échange externe, les pièces jointes et les erreurs de communication.

**Solution adoptée :** encapsulation de l’intégration dans un service dédié, contrôle de la création d’issue et traitement séparé des pièces jointes.

---

## Perspectives d’amélioration

Plusieurs axes d’amélioration peuvent être envisagés pour prolonger ce travail dans une logique de PFE ou de mise en production :

1. **Industrialisation de la configuration**
   - externaliser systématiquement les secrets et paramètres sensibles vers des variables d’environnement ou un coffre de secrets ;
   - ajouter des profils d’exécution plus robustes pour le développement, les tests et la production.

2. **Renforcement de la qualité logicielle**
   - enrichir la couverture de tests unitaires et d’intégration ;
   - ajouter des pipelines CI/CD avec validation automatique ;
   - intégrer un linter et des outils de qualité de code sur les deux modules.

3. **Évolution de l’IA**
   - améliorer l’indexation sémantique ;
   - intégrer un pipeline RAG plus explicite ;
   - proposer des suggestions automatiques d’assignation, de priorité ou de solution ;
   - exploiter davantage la voix et la transcription multilingue.

4. **Amélioration de l’expérience utilisateur**
   - ajout de recherche globale transverse ;
   - notifications enrichies avec préférences utilisateur ;
   - mode mobile avancé ou application hybride ;
   - meilleure gestion des pièces jointes et prévisualisations.

5. **Pilotage métier avancé**
   - tableaux de bord décisionnels plus poussés ;
   - indicateurs par équipe, groupe ou période ;
   - détection automatique des goulets d’étranglement ;
   - prévision de charge et de non-respect des SLA.

6. **Sécurité et conformité**
   - durcissement des règles de mot de passe ;
   - audit sécurité plus complet des endpoints publics ;
   - journalisation centralisée ;
   - chiffrement renforcé de certaines données sensibles.

---

## Conclusion
Ce projet constitue une réalisation de PFE riche, cohérente et techniquement ambitieuse. Il dépasse le cadre d’un simple outil de ticketing en proposant une **plateforme de support intelligente**, structurée autour d’une architecture moderne Angular / Spring Boot, d’une séparation claire des rôles, d’une logique métier réaliste et de modules avancés de collaboration et d’intelligence artificielle.

D’un point de vue académique, le projet présente plusieurs apports majeurs :
- la modélisation d’un processus métier complet de gestion des tickets ;
- la mise en œuvre d’une architecture full-stack professionnelle ;
- l’intégration de mécanismes de sécurité robustes ;
- l’exploitation d’indicateurs opérationnels et de règles SLA ;
- l’ouverture vers des fonctionnalités innovantes basées sur l’IA.

En résumé, cette plateforme illustre une démarche de conception orientée besoins métier, associée à une implémentation technique moderne et extensible. Elle constitue une base solide pour un rapport de PFE, aussi bien pour la partie analyse fonctionnelle que pour la partie architecture, conception et perspectives d’évolution.
