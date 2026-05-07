import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetierCalendarComponent } from './metier-calendar.component';

describe('MetierCalendarComponent', () => {
  let component: MetierCalendarComponent;
  let fixture: ComponentFixture<MetierCalendarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MetierCalendarComponent]
    });
    fixture = TestBed.createComponent(MetierCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
