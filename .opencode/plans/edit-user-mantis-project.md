# Plan: Ajouter l'édition du projet Mantis dans le formulaire de modification d'utilisateur

## Problème
Le formulaire d'édition utilisateur (`openEditModal`) ne permet pas de modifier le projet Mantis ni le nom d'utilisateur Mantis, même si ces données existent déjà dans `UserDTO` et sont affichées en lecture seule dans la modale de consultation.

## Fichiers modifiés

### 1. Backend: `User.java`
- **Fichier**: `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/User/entity/User.java`
- **Action**: Ajouter `getMantisUsername()` après la méthode `fullName()`
- **Code**:
```java
public String getMantisUsername() {
    return username;
}
```

### 2. Backend: `AdminService.java` — convertToDTO
- **Fichier**: `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/Admin/AdminService.java`
- **Action**: Ligne 285, remplacer `user.getUsername()` par `user.getMantisUsername()`
- **Avant**: `.username(user.getUsername())  // retourne email`
- **Après**: `.username(user.getMantisUsername())  // retourne le vrai username Mantis`

### 3. Backend: `AdminService.java` — updateUser
- **Fichier**: `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/Admin/AdminService.java`
- **Action**: Ajouter la mise à jour des champs Mantis dans la méthode `updateUser()`, après la mise à jour des rôles (après la ligne ~143)
- **Code**:
```java
if (userDTO.getMantisProject() != null) {
    user.setMantisProject(userDTO.getMantisProject());
}
if (userDTO.getMantisProjects() != null && !userDTO.getMantisProjects().isEmpty()) {
    user.setMantisProject(String.join(",", userDTO.getMantisProjects()));
}
if (userDTO.getUsername() != null && !userDTO.getUsername().isBlank()) {
    user.setUsername(userDTO.getUsername());
}
```

### 4. Frontend: `admin.service.ts` — UpdateUserRequest
- **Fichier**: `telecom-frontend/src/app/services/admin.service.ts`
- **Action**: Ajouter les champs Mantis à l'interface `UpdateUserRequest`
- **Code**:
```typescript
export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  departement?: string;
  dateOfBirth: string;
  username?: string;         // ← NOUVEAU
  mantisProject?: string;    // ← NOUVEAU
  mantisProjects?: string[]; // ← NOUVEAU
}
```

### 5. Frontend: `user-list.component.ts` — openEditModal
- **Fichier**: `telecom-frontend/src/app/admin/users/user-list/user-list.component.ts`
- **Action**: Ajouter les champs Mantis dans l'objet `editedUser`
- **Avant**:
```typescript
this.editedUser = {
  // ...
  username: user.username || ''
};
```
- **Après**:
```typescript
this.editedUser = {
  // ...
  username: user.username || '',
  mantisProject: user.mantisProject || '',
  mantisProjects: user.mantisProjects ? [...user.mantisProjects] : []
};
```

### 6. Frontend: `user-list.component.ts` — saveUserChanges
- **Action**: Ajouter les champs Mantis dans la requête
- **Avant**:
```typescript
const request: UpdateUserRequest = {
  // ...
  departement: this.editedUser.departement || undefined
};
```
- **Après**:
```typescript
const request: UpdateUserRequest = {
  // ...
  departement: this.editedUser.departement || undefined,
  username: this.editedUser.username,
  mantisProject: this.editedUser.mantisProject,
  mantisProjects: this.editedUser.mantisProjects
};
```

### 7. Frontend: `user-list.component.html` — Section Mantis dans la modale d'édition
- **Fichier**: `telecom-frontend/src/app/admin/users/user-list/user-list.component.html`
- **Action**: Ajouter une section Mantis dans la modale d'édition, après le sélecteur de rôle (ligne ~418), visible uniquement pour `ROLE_BUSINESS_ANALYST`
- **Code à insérer**:
```html
<!-- SECTION MantisBT (BA uniquement) -->
<div class="form-section" *ngIf="editedRole === 'ROLE_BUSINESS_ANALYST'">
  <div class="form-section-title">
    <i class="fas fa-share-alt"></i> Configuration MantisBT
  </div>

  <div class="form-group">
    <label>Nom d'utilisateur MantisBT</label>
    <select class="form-input" [(ngModel)]="editedUser.username">
      <option value="">-- Sélectionner un utilisateur --</option>
      <option *ngFor="let user of mantisUsers" [value]="user">{{ user }}</option>
    </select>
  </div>

  <div class="form-group" *ngIf="editedUser.username">
    <label>Projets assignés</label>
    <div class="projects-checkboxes">
      <label *ngFor="let p of allMantisProjects"
             class="project-checkbox-item"
             [class.selected]="editedUser.mantisProjects?.includes(p.name)">
        <input type="checkbox" [value]="p.name"
               [checked]="editedUser.mantisProjects?.includes(p.name)"
               (change)="toggleEditProject(p.name, $event)" />
        <i class="fas fa-folder"></i>
        <span>{{ p.name }}</span>
      </label>
    </div>
    <div class="selected-projects" *ngIf="editedUser.mantisProjects?.length">
      <span class="project-badge" *ngFor="let p of editedUser.mantisProjects">
        <i class="fas fa-check"></i> {{ p }}
      </span>
    </div>
  </div>
</div>
```

### 8. Frontend: `user-list.component.ts` — Ajouter `toggleEditProject()`
- **Action**: Ajouter une méthode pour gérer les checkboxes des projets dans le formulaire d'édition
- **Code**:
```typescript
toggleEditProject(projectName: string, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  if (!this.editedUser) return;
  if (!this.editedUser.mantisProjects) this.editedUser.mantisProjects = [];

  if (checked) {
    if (!this.editedUser.mantisProjects.includes(projectName)) {
      this.editedUser.mantisProjects.push(projectName);
    }
  } else {
    this.editedUser.mantisProjects = this.editedUser.mantisProjects.filter(p => p !== projectName);
  }
  this.editedUser.mantisProject = this.editedUser.mantisProjects[0] || '';
}
```

### 9. Backend: `TicketService.pushToMantis()` — Utiliser getMantisUsername()
- **Fichier**: `ticket-management-api/src/main/java/tn/esprit/ticketmanagement/Ticket/service/TicketService.java`
- **Action**: Remplacer `currentUser.getUsername()` par `currentUser.getMantisUsername()`
- **Ligne 695**: `log.info("REPORTER SENT TO MANTIS = '{}'", currentUser.getMantisUsername());`
- **Ligne 700**: `currentUser.getMantisUsername(),`

## Vérification
- Backend: `./mvnw clean compile -q` doit réussir
- Backend: `./mvnw test -q` doit passer
- Frontend: `npx ng build --configuration production` doit réussir (warnings budget préexistants ignorés)
