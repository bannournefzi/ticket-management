import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserMeetingsComponent } from './user-meetings.component';

describe('UserMeetingsComponent', () => {
  let component: UserMeetingsComponent;
  let fixture: ComponentFixture<UserMeetingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserMeetingsComponent]
    });
    fixture = TestBed.createComponent(UserMeetingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
