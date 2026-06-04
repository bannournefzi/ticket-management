import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PagePermissionService {
  private apiUrl = `${environment.apiUrl}/user/permissions/my-pages`;
  private grantedPages$ = new BehaviorSubject<string[]>([]);

  constructor(private http: HttpClient) {}

  loadMyPermissions(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl).pipe(
      tap(result => this.grantedPages$.next(result))
    );
  }

  getGrantedPages(): string[] {
    return this.grantedPages$.getValue();
  }

  hasAccess(pageKey: string): boolean {
    return this.grantedPages$.getValue().includes(pageKey);
  }

  clearPermissions(): void {
    this.grantedPages$.next([]);
  }
}
