import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetierDashboardComponent } from './metier-dashboard.component';

describe('MetierDashboardComponent', () => {
  let component: MetierDashboardComponent;
  let fixture: ComponentFixture<MetierDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MetierDashboardComponent]
    });
    fixture = TestBed.createComponent(MetierDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
