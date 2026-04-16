import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ValidateAccountComponent } from './auth/validate-account/validate-account.component';
import { RoleGuard } from './guards/role.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { MetierDashboardComponent } from './Metier/metier-dashboard/metier-dashboard.component';
import { ItDashboardComponentComponent } from './BA/it-dashboard-component/it-dashboard-component.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { UserListComponent } from './admin/users/user-list/user-list.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { CreateTicketComponent } from './Metier/create-ticket/create-ticket.component';
import { TicketListComponent } from './Metier/ticket-list/ticket-list.component';
import { BaTicketManagementComponent } from './BA/ba-ticket-management/ba-ticket-management.component';
import { TicketCalendarComponent } from './BA/ticket-calendar/ticket-calendar.component';
import { BaSettingsComponent } from './BA/settings/settings.component';
import { KnowledgeBaseListComponent } from './Metier/knowledge-base/knowledge-base-list/knowledge-base-list.component';
import { KnowledgeBaseDetailComponent } from './Metier/knowledge-base/knowledge-base-detail/knowledge-base-detail.component';

const routes: Routes = [
  // Public routes (no layout)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'validate-account', component: ValidateAccountComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'settings', component: BaSettingsComponent},
  

  // Protected routes (with sidebar + navbar via MainLayoutComponent)
  {
    path: '', component: MainLayoutComponent, children: [

      { path: 'metier', component: MetierDashboardComponent, canActivate: [RoleGuard], data: { role: 'ROLE_METIER' } },
      { path: 'create-ticket', component: CreateTicketComponent, canActivate: [RoleGuard], data: { role: 'ROLE_METIER' } },
      { path: 'my-tickets', component: TicketListComponent, canActivate: [RoleGuard], data: { role: 'ROLE_METIER' } },
      { path: 'knowledge-base', component: KnowledgeBaseListComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_METIER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'knowledge-base/:id', component: KnowledgeBaseDetailComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_METIER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'business-analyst/tickets', component: BaTicketManagementComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'business-analyst', component: ItDashboardComponentComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'ticket-calendar', component: TicketCalendarComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'metier/calendar', component: TicketCalendarComponent, canActivate: [RoleGuard], data: { role: 'ROLE_METIER' } },
      { path: 'business-analyst/settings', component: BaSettingsComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'metier', component: MetierDashboardComponent, canActivate: [RoleGuard], data: { role: 'ROLE_METIER' } },


      {
        path: 'admin', canActivate: [RoleGuard], data: { role: 'ROLE_ADMIN' },
        children: [
          { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
          { path: 'users', component: UserListComponent }
        ]
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../app/websocket/main-component/main-component.component').then(m => m.MainComponent)
      },

      // ✅ Profile est DANS le layout → sidebar + navbar visibles
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [RoleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_BUSINESS_ANALYST', 'ROLE_METIER'] }
      },

      { path: '', redirectTo: '/login', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }