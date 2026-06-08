import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ValidateAccountComponent } from './auth/validate-account/validate-account.component';
import { RoleGuard } from './guards/role.guard';
import { PageAccessGuard } from './guards/page-access.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { MetierDashboardComponent } from './Metier/metier-dashboard/metier-dashboard.component';
import { UserPermissionsComponent } from './admin/user-permissions/user-permissions.component';
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
import { GroupListComponent } from './admin/group-management/group-list/group-list.component';
import { GroupFormComponent } from './admin/group-management/group-form/group-form.component';
import { GroupDetailComponent } from './admin/group-management/group-detail/group-detail.component';
import { SessionManagementComponent } from './security/session-management/session-management.component';
import { InteractiveTreeComponent } from './Metier/interactive-tree/interactive-tree.component';
import { MeetingRoomComponent } from './meetings/meeting-room/meeting-room.component';
import { UserMeetingsComponent } from './meetings/user-meetings/user-meetings.component';
import { BaMeetingsComponent } from './meetings/ba-meetings/ba-meetings.component';
import { MetierCalendarComponent } from './meetings/metier-calendar/metier-calendar.component';
import { AuditHistoryComponent } from './Metier/audit-history/audit-history.component';
import { AuditLogsComponent } from './admin/audit-logs/audit-logs.component';


const routes: Routes = [

  { path: 'meetings',      component: BaMeetingsComponent,
  canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
{ path: 'metier/meetings', component: UserMeetingsComponent,
  canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'REUNIONS' } },
{ path: 'meetings/room/:code', component: MeetingRoomComponent,
  canActivate: [RoleGuard],
  data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST'] } },
  // Public routes (no layout)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'validate-account', component: ValidateAccountComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  {
    path: '', component: MainLayoutComponent, children: [

      { path: 'metier', component: MetierDashboardComponent, canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'DASHBOARD' } },
      { path: 'create-ticket', component: CreateTicketComponent, canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'CREER_TICKET' } },
      { path: 'my-tickets', component: TicketListComponent, canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'MES_TICKETS' } },
      { path: 'knowledge-base', component: KnowledgeBaseListComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'knowledge-base/:id', component: KnowledgeBaseDetailComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'business-analyst/tickets', component: BaTicketManagementComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'business-analyst', component: ItDashboardComponentComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'ticket-calendar', component: TicketCalendarComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'metier/calendar', component: TicketCalendarComponent, canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'CALENDRIER_SLA' } },
      { path: 'business-analyst/settings', component: BaSettingsComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'security/sessions', component: SessionManagementComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN'] } },
      { path: 'metier/diagnostic', component: InteractiveTreeComponent,  canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'ASSISTANT_DEPANNAGE' } },
      { path: 'metier/meeting-calendar', component: MetierCalendarComponent,canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'CALENDRIER_REUNIONS' } },
      { path: 'metier/history', component: AuditHistoryComponent, canActivate: [RoleGuard, PageAccessGuard], data: { role: 'ROLE_USER', pageKey: 'AUDIT_HISTORY' } },

      {
        path: 'admin', canActivate: [RoleGuard], data: { role: 'ROLE_ADMIN' },
        children: [
          { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
          { path: 'users', component: UserListComponent },
          { path: 'users/:id/permissions', component: UserPermissionsComponent },
          { path: 'groups', component: GroupListComponent },
          { path: 'groups/create', component: GroupFormComponent },
          { path: 'groups/:id', component: GroupDetailComponent },
          { path: 'groups/:id/edit', component: GroupFormComponent },
          { path: 'logs', component: AuditLogsComponent, data: { pageKey: 'ADMIN_AUDIT_LOGS' } },
        ]
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../app/websocket/main-component/main-component.component').then(m => m.MainComponent)
      },

      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [RoleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_BUSINESS_ANALYST', 'ROLE_USER'] }
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