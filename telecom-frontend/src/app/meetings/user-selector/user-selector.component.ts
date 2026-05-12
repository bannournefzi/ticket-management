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
  @Output() userRemoved = new EventEmitter<UserSearchResponse>();

  query = '';
  results: UserSearchResponse[] = [];
  selectedUsers: UserSearchResponse[] = [];
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
    this.search$.next(this.query);
  }

  select(user: UserSearchResponse): void {
    if (this.selectedUsers.find(u => u.id === user.id)) {
      this.query = '';
      this.showDropdown = false;
      return;
    }
    this.selectedUsers.push(user);
    this.userSelected.emit(user);
    this.query = '';
    this.results = [];
    this.showDropdown = false;
  }

  remove(user: UserSearchResponse): void {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    this.userRemoved.emit(user);
  }

  getAvatarColor(initials: string): string {
    const colors = ['av-blue', 'av-purple', 'av-green', 'av-teal', 'av-coral'];
    return colors[initials.charCodeAt(0) % colors.length];
  }

  ngOnDestroy(): void { this.search$.complete(); }

  onBlur(): void {
    setTimeout(() => { this.showDropdown = false; }, 200);
  }
}