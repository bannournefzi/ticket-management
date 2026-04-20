import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FullCalendarModule } from '@fullcalendar/angular';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ValidateAccountComponent } from './auth/validate-account/validate-account.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { ChangePasswordComponent } from './auth/change-password/change-password.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { AuthInterceptor } from './auth/auth.interceptor';

// Layouts & Shared
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';

// Admin
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { UserListComponent } from './admin/users/user-list/user-list.component';

// Métier
import { MetierDashboardComponent } from './Metier/metier-dashboard/metier-dashboard.component';
import { CreateTicketComponent } from './Metier/create-ticket/create-ticket.component';
import { TicketListComponent } from './Metier/ticket-list/ticket-list.component';
import { DashboardModule } from './Metier/metier-dashboard/dashboard.module';

// BA
import { ItDashboardComponentComponent } from './BA/it-dashboard-component/it-dashboard-component.component';
import { BaTicketManagementComponent } from './BA/ba-ticket-management/ba-ticket-management.component';
import { TicketCalendarComponent } from './BA/ticket-calendar/ticket-calendar.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { ChatFormatPipe } from './Pipe/chat-format.pipe';
import { BaSettingsComponent } from './BA/settings/settings.component';
import { KnowledgeBaseListComponent } from './Metier/knowledge-base/knowledge-base-list/knowledge-base-list.component';
import { KnowledgeBaseDetailComponent } from './Metier/knowledge-base/knowledge-base-detail/knowledge-base-detail.component';
import { CommonModule } from '@angular/common';
import { GroupListComponent } from './admin/group-management/group-list/group-list.component';
import { GroupFormComponent } from './admin/group-management/group-form/group-form.component';
import { GroupDetailComponent } from './admin/group-management/group-detail/group-detail.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ValidateAccountComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ChangePasswordComponent,
    ProfileComponent,
    MainLayoutComponent,
    NavbarComponent,
    SidebarComponent,
    AdminDashboardComponent,
    UserListComponent,
    MetierDashboardComponent,
    CreateTicketComponent,
    TicketListComponent,
    ItDashboardComponentComponent,
    BaTicketManagementComponent,
    TicketCalendarComponent,
    ChatbotComponent,
    ChatFormatPipe,
    BaSettingsComponent,
    KnowledgeBaseListComponent,
    KnowledgeBaseDetailComponent,
    GroupListComponent,
    GroupFormComponent,
    GroupDetailComponent,
    
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    DragDropModule,
    FullCalendarModule,
    DashboardModule,
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true
    })
  ],
  providers: [{
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  }],
  bootstrap: [AppComponent]
})
export class AppModule {}