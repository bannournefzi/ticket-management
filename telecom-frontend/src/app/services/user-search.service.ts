import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { UserSearchResponse } from '../models/user-search.model';

@Injectable({ providedIn: 'root' })
export class UserSearchService {

  private api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<UserSearchResponse[]> {
    if (!query || query.trim().length < 2) return of([]);
    const params = new HttpParams().set('query', query.trim());
    return this.http.get<UserSearchResponse[]>(`${this.api}/search`, { params })
      .pipe(catchError(() => of([])));
  }

  searchWithDebounce(input$: Observable<string>): Observable<UserSearchResponse[]> {
    return input$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.search(q))
    );
  }
}