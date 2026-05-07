import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { UserSearchService } from '../../services/user-search.service';
import { UserSearchResponse } from '../../models/user-search.model';

@Component({
  selector: 'app-user-selector',
  templateUrl: './user-selector.component.html',
  styleUrls: ['./user-selector.component.scss']
})
export class UserSelectorComponent implements OnDestroy {

  @Output() userSelected = new EventEmitter<UserSearchResponse>();

  query = '';
  results: UserSearchResponse[] = [];
  selected: UserSearchResponse | null = null;
  loading = false;
  showDropdown = false;

  private search$ = new Subject<string>();

  constructor(private userSearch: UserSearchService) {
    this.userSearch.searchWithDebounce(this.search$.asObservable())
      .subscribe(results => {
        this.results = results;
        this.loading = false;
        this.showDropdown = results.length > 0;
      });
  }

  onInput(): void {
    this.loading = true;
    this.selected = null;
    this.search$.next(this.query);
  }

  select(user: UserSearchResponse): void {
    this.selected = user;
    this.query = user.fullName;
    this.showDropdown = false;
    this.userSelected.emit(user);
  }

  clear(): void {
    this.query = '';
    this.selected = null;
    this.results = [];
    this.showDropdown = false;
    this.userSelected.emit(undefined as any);
  }

  getAvatarColor(initials: string): string {
    const colors = ['av-blue', 'av-purple', 'av-green', 'av-teal', 'av-coral'];
    return colors[initials.charCodeAt(0) % colors.length];
  }

  ngOnDestroy(): void { this.search$.complete(); }
  onBlur(): void {
  setTimeout(() => {
    this.showDropdown = false;
  }, 200);
}
}