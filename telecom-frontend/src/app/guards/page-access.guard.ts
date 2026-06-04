import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PagePermissionService } from '../services/page-permission.service';
import { AuthService } from '../auth/service/auth.service';
import { ToastrService } from 'ngx-toastr';

const PUBLIC_PAGES = new Set([
  'DASHBOARD', 'CREER_TICKET', 'MES_TICKETS',
  'CALENDRIER_SLA', 'MESSAGES', 'MON_PROFIL',
  'CALENDRIER_REUNIONS', 'REUNIONS',
  'AUDIT_HISTORY', 'ADMIN_AUDIT_LOGS'
]);

@Injectable({
  providedIn: 'root'
})
export class PageAccessGuard implements CanActivate {

  constructor(
    private pagePermissionService: PagePermissionService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | Observable<boolean> {
    const pageKey: string = route.data['pageKey'];

    if (!pageKey || PUBLIC_PAGES.has(pageKey)) {
      return true;
    }

    const granted = this.pagePermissionService.getGrantedPages();

    if (granted.length === 0) {
      return this.pagePermissionService.loadMyPermissions().pipe(
        map(() => this.checkAccess(pageKey)),
        catchError(() => {
          this.redirectByRole();
          return of(false);
        })
      );
    }

    return this.checkAccess(pageKey);
  }

  private checkAccess(pageKey: string): boolean {
    if (this.pagePermissionService.hasAccess(pageKey)) {
      return true;
    }

    this.toastr.error("Vous n'avez pas accès à cette page", 'Accès refusé');
    this.redirectByRole();
    return false;
  }

  private redirectByRole(): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin']);
    } else if (this.authService.isBusinessAnalyst()) {
      this.router.navigate(['/business-analyst']);
    } else {
      this.router.navigate(['/metier']);
    }
  }
}
