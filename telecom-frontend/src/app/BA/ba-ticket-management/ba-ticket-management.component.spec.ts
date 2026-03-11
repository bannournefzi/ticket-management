import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaTicketManagementComponent } from './ba-ticket-management.component';

describe('BaTicketManagementComponent', () => {
  let component: BaTicketManagementComponent;
  let fixture: ComponentFixture<BaTicketManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BaTicketManagementComponent]
    });
    fixture = TestBed.createComponent(BaTicketManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
