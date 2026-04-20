import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const userRoles = this.authService.getUserRoles();

     const expectedRoles: string[] = route.data['roles'];
    if (expectedRoles && Array.isArray(expectedRoles)) {
      const hasRole = expectedRoles.some(r => userRoles.includes(r));
      if (hasRole) return true;
      this.redirectByRole();
      return false;
    }

     const expectedRole: string = route.data['role'];
    if (expectedRole) {
      if (userRoles.includes(expectedRole)) return true;
      this.redirectByRole();
      return false;
    }

     if (userRoles.length > 0) return true;

    this.router.navigate(['/login']);
    return false;
  }

  private redirectByRole(): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin']);
    }  else if (this.authService.isBusinessAnalyst()) {
  this.router.navigate(['/business-analyst']);
    } else if (this.authService.isUser()) {
      this.router.navigate(['/metier']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}