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
import { GroupListComponent } from './admin/group-management/group-list/group-list.component';
import { GroupFormComponent } from './admin/group-management/group-form/group-form.component';
import { GroupDetailComponent } from './admin/group-management/group-detail/group-detail.component';
import { SessionManagementComponent } from './security/session-management/session-management.component';
import { InteractiveTreeComponent } from './Metier/interactive-tree/interactive-tree.component';
import { MeetingRoomComponent } from './meetings/meeting-room/meeting-room.component';
import { UserMeetingsComponent } from './meetings/user-meetings/user-meetings.component';
import { BaMeetingsComponent } from './meetings/ba-meetings/ba-meetings.component';


const routes: Routes = [


  { path: 'meetings',      component: BaMeetingsComponent,
  canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
{ path: 'metier/meetings', component: UserMeetingsComponent,
  canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
{ path: 'meetings/room/:code', component: MeetingRoomComponent,
  canActivate: [RoleGuard],
  data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST'] } },
  // Public routes (no layout)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'validate-account', component: ValidateAccountComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'settings', component: BaSettingsComponent},
  

  {
    path: '', component: MainLayoutComponent, children: [

      { path: 'metier', component: MetierDashboardComponent, canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
      { path: 'create-ticket', component: CreateTicketComponent, canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
      { path: 'my-tickets', component: TicketListComponent, canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
      { path: 'knowledge-base', component: KnowledgeBaseListComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'knowledge-base/:id', component: KnowledgeBaseDetailComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_USER', 'ROLE_BUSINESS_ANALYST', 'ROLE_ADMIN'] } },
      { path: 'business-analyst/tickets', component: BaTicketManagementComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'business-analyst', component: ItDashboardComponentComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'ticket-calendar', component: TicketCalendarComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'metier/calendar', component: TicketCalendarComponent, canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
      { path: 'business-analyst/settings', component: BaSettingsComponent, canActivate: [RoleGuard], data: { role: 'ROLE_BUSINESS_ANALYST' } },
      { path: 'metier', component: MetierDashboardComponent, canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },
      { path: 'security/sessions', component: SessionManagementComponent, canActivate: [RoleGuard], data: { roles: ['ROLE_ADMIN'] } },
      { path: 'metier/diagnostic', component: InteractiveTreeComponent,  canActivate: [RoleGuard], data: { role: 'ROLE_USER' } },


      {
        path: 'admin', canActivate: [RoleGuard], data: { role: 'ROLE_ADMIN' },
        children: [
          { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
          { path: 'users', component: UserListComponent },
          { path: 'groups', component: GroupListComponent },
          { path: 'groups/create', component: GroupFormComponent },        // ← ADD
          { path: 'groups/:id', component: GroupDetailComponent },         // ← ADD
          { path: 'groups/:id/edit', component: GroupFormComponent },
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