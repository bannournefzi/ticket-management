import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaMeetingsComponent } from './ba-meetings.component';

describe('BaMeetingsComponent', () => {
  let component: BaMeetingsComponent;
  let fixture: ComponentFixture<BaMeetingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BaMeetingsComponent]
    });
    fixture = TestBed.createComponent(BaMeetingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
