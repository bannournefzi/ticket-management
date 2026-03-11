import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItDashboardComponentComponent } from './it-dashboard-component.component';

describe('ItDashboardComponentComponent', () => {
  let component: ItDashboardComponentComponent;
  let fixture: ComponentFixture<ItDashboardComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ItDashboardComponentComponent]
    });
    fixture = TestBed.createComponent(ItDashboardComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
