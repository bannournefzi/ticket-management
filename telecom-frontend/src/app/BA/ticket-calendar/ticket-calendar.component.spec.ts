import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketCalendarComponent } from './ticket-calendar.component';

describe('TicketCalendarComponent', () => {
  let component: TicketCalendarComponent;
  let fixture: ComponentFixture<TicketCalendarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TicketCalendarComponent]
    });
    fixture = TestBed.createComponent(TicketCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
