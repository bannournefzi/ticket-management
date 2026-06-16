import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaSettingsComponent  } from './settings.component';

describe('BaSettingsComponent', () => {
  let component: BaSettingsComponent;
  let fixture: ComponentFixture<BaSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BaSettingsComponent]
    });
    fixture = TestBed.createComponent(BaSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
