# ═══════════════════════════════════════════════════════════════
# Dockerfile — Ticket Management Backend (Spring Boot 3 + JDK 17)
# Build multi-stage : builder → runtime allégé
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1 : Builder ───────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copier uniquement pom.xml d'abord pour profiter du cache Docker sur les dépendances
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw .

# Télécharger les dépendances (couche cachée séparément du code)
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

# Copier le code source
COPY src ./src

# Construire le JAR (sans tests — ils sont déjà passés dans le pipeline CI)
RUN ./mvnw package -DskipTests -B

# ─── Stage 2 : Runtime (image finale allégée) ────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

# Métadonnées de l'image
LABEL maintainer="Tunisie Telecom R&D"
LABEL description="Ticket Management Platform - Backend API"
LABEL version="1.0"

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copier uniquement le JAR depuis le builder
COPY --from=builder /app/target/*.jar app.jar

# Créer les dossiers nécessaires et donner les permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R appuser:appgroup /app

# Passer à l'utilisateur non-root
USER appuser

# Port exposé (doit correspondre à server.port dans application.properties)
EXPOSE 8088

# Variables d'environnement par défaut (surchargeables au runtime)
#ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Health check Docker natif
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Point d'entrée
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]