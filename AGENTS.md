# AGENTS.md — telecom-frontend + ticket-management-api

Monorepo with Angular 16.2 frontend and Spring Boot 3.3.5 (Java 17) backend for a telecom IT service desk / ticket management system. Three roles: `ROLE_ADMIN`, `ROLE_BUSINESS_ANALYST`, `ROLE_METIER`.

## Commands

### Frontend (`telecom-frontend/`)

```bash
npm start          # ng serve — dev server at http://localhost:4200
npm run build      # ng build — production build → dist/
npm run watch      # ng build --watch --configuration development
npm test           # ng test — Karma (no .spec files exist yet)
ng generate component <name>   # scaffold new component (SCSS default)
ng generate service <name>     # scaffold new service
```

### Backend (`ticket-management-api/`)

```bash
./mvnw spring-boot:run              # Run dev server (port 8088)
./mvnw clean package                # Build JAR (runs tests)
./mvnw clean package -DskipTests    # Build JAR without tests
./mvnw test                         # Run all tests
./mvnw test -Dtest=ClassName        # Run a single test class
./mvnw test -Dtest=ClassName#method # Run a single test method
./mvnw clean install                # Build + install to local repo
docker-compose up -d                # Start PostgreSQL + MailDev
```

No linter/formatter configured in either project. Frontend follows `.editorconfig` (2-space indent, UTF-8, single quotes in TS). Backend uses tabs (Maven default).

## Project Structure

```
telecom-frontend/src/app/
  auth/          login, register, password flows, auth.interceptor.ts
  admin/         admin dashboard, user management
  Metier/        business-user dashboard, create-ticket, ticket-list
  BA/            business-analyst ticket management, calendar, settings
  services/      TicketService, AdminService, ChatbotService, etc.
  models/        TypeScript interfaces & type unions
  guards/        RoleGuard (CanActivate)
  shared/        NavbarComponent, SidebarComponent
  layouts/       MainLayoutComponent (shell for protected routes)
  websocket/     MainComponent, ChatListComponent (standalone)
  chatbot/       ChatbotComponent (floating widget)

ticket-management-api/src/main/java/tn/esprit/ticketmanagement/
  auth/          Authentication, registration, password reset, email
  User/          User entity, tokens, enums, photo upload
  Ticket/        Ticket CRUD, comments, SLA, filtering, Mantis push
  Admin/         Admin user management
  chat/          Direct messaging (conversations, messages)
  chatbot/       AI chatbot (Ollama + pgvector)
  config/        Spring beans, WebSocket, pgvector datasource
  handler/       Global exception handling
  security/      JWT filter, security config
  settings/      SLA, categories, working hours config
  common/        BaseAuditingEntity, constants, utilities
```

## Frontend Code Style

### Imports
- Group 1: Angular framework imports (alphabetical)
- Group 2: Third-party libraries
- Group 3: Relative imports (models, services, components)
- Separate groups with blank lines. Multi-line for 3+ named imports.

### Components
- NgModule declaration in `AppModule` (NOT standalone), except chat components.
- Selector: `app-` prefix + kebab-case. External `templateUrl`/`styleUrls`.
- Default change detection. File structure: `name.component.{ts,html,scss}`.

### TypeScript
- Strict mode enabled. Explicit return/parameter types on all methods.
- Constructor-injected dependencies use `private` shorthand.
- Use optional chaining (`?.`) and nullish coalescing (`??`).
- Avoid `any`; use `as` type assertions only when necessary.

### RxJS
- Object-based `subscribe({ next, error })` syntax.
- Long-lived subscriptions (WebSocket, intervals) cleaned up in `ngOnDestroy`.
- `BehaviorSubject` for state. `async` pipe NOT currently used in templates.

### Error Handling
- HTTP errors: extract `err.error?.message` with fallback in `subscribe({ error })`.
- Component-level success/error alerts with auto-dismiss (4s timeout).

### Forms
- Reactive Forms for auth and complex validated forms.
- Template-driven Forms (`[(ngModel)]`) for simpler inputs.

### SCSS
- Component-scoped `.scss`. Variables with `$` prefix. Use `&` for pseudo-elements.
- Descriptive flat naming (`.login-page`, `.nav-link`). Not strict BEM.
- Responsive breakpoints: `1024px`, `768px`, `480px`.

### HTML Templates
- `*ngIf`, `*ngFor`, safe navigation `?.`. `[ngClass]` with component methods.
- Font Awesome: `<i class="fas fa-...">`. Built-in pipes: `date`, `number`.

## Backend Code Style

### Imports
- Group 1: `jakarta.*` imports
- Group 2: `org.springframework.*`, `lombok.*`, `io.*`, third-party
- Group 3: `tn.esprit.ticketmanagement.*` (own package)
- Group 4: `java.*` / `java.time.*` / `java.util.*`
- Separate groups with blank lines. Alphabetical within groups.

### Lombok
- `@RequiredArgsConstructor` for constructor injection (no `@Autowired`).
- `@Getter @Setter` on entities/DTOs (NOT `@Data`).
- `@Builder` on entities, DTOs, request objects. `@Builder.Default` for collections.
- `@Slf4j` on service classes. `@SuperBuilder` on `BaseAuditingEntity`.

### Naming
- Classes: PascalCase with suffix (`Controller`, `Service`, `Repository`, `DTO`, `Request`, `Response`, `Exception`).
- Variables/methods: camelCase. Packages: lowercase (existing inconsistency: `User/`, `Ticket/` capitalized).
- Enums: UPPER_SNAKE_CASE values (`'NEW'`, `'RESOLVED'`, `'LOW'`, `'CRITICAL'`).
- Constants: UPPER_SNAKE_CASE in `*Constants.java` files.

### Controllers
- `@RestController` + `@RequestMapping` + `@RequiredArgsConstructor`.
- `@Tag(name = "...")` for Swagger docs. Return `ResponseEntity<T>`.
- `@AuthenticationPrincipal User currentUser` for authenticated user.
- `@Valid @RequestBody` for request validation.

### Services
- `@Service` + `@RequiredArgsConstructor` + `@Slf4j` + `@Transactional`.
- `@Transactional(readOnly = true)` for read-only methods.
- `findXxxOrThrow(id)` pattern using `orElseThrow(() -> new XxxNotFoundException(id))`.
- Manual entity-to-DTO mapping via `@Builder`. `ApplicationEventPublisher` for domain events.

### Entities
- `@Entity` + `@Table(name = "...")` with indexes. `@EntityListeners(AuditingEntityListener.class)`.
- `@CreatedDate` / `@LastModifiedDate`. Lazy fetching for relationships.
- Business logic methods on entities (`canTransitionTo()`, `isSLABreached()`).

### Validation
- Jakarta Bean Validation: `@NotBlank`, `@NotEmpty`, `@NotNull`, `@Size`, `@Email`.
- Validation messages in French (e.g., "Le titre est obligatoire").

### Error Handling
- Two `@RestControllerAdvice` classes for global exception handling.
- Custom exceptions extend `RuntimeException` with `@ResponseStatus`.
- `ResponseStatusException` for ad-hoc HTTP errors in service layer.

### Section Dividers
- Use Unicode box-drawing characters: `// ══════════════════════════════════════════`

## Routing (Frontend)

- Public routes: `/login`, `/register`, `/validate-account`, `/forgot-password`, `/reset-password`, `/settings`.
- Protected routes wrapped in `MainLayoutComponent` (sidebar + navbar).
- `RoleGuard` enforces role-based access via route `data: { role: '...' }` or `data: { roles: [...] }`.
- `/chat` uses lazy loading via `loadComponent` (standalone component).

## WebSocket

- STOMP over SockJS. Backend: broker on `/user` and `/topic`, prefix `/app`.
- Frontend: auto-reconnect (3s), heartbeats (10s), message queueing (up to 100).
- CORS allowed origin: `http://localhost:4200`. Token refresh triggers reconnect.

## Key Notes for Agents

- **No test files in frontend.** Backend has only `contextLoads()`. Frontend tests: Jasmine/Karma. Backend: JUnit 5 + `@SpringBootTest`.
- **No linter.** Run `ng build` (frontend) or `./mvnw clean package` (backend) to check compilation.
- Backend expects JWT in `Authorization: Bearer <token>` header (handled by `AuthInterceptor`).
- Role checks: frontend uses `authService.isAdmin()`, `isBusinessAnalyst()`, `isMetier()`; backend uses `User.isAdmin()`, `isIT()`, `isMetier()`.
- Backend external deps: PostgreSQL (5432), Ollama (11434), MailDev (1080/1025), Mantis BT (8989).
- JPA Specifications used for dynamic ticket filtering (`TicketSpecification`).
- Frontend CSV export is common across list components.
- Frontend priority change is rate-limited (max 2/week via localStorage).
