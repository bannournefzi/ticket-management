import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveTreeComponent } from './interactive-tree.component';

describe('InteractiveTreeComponent', () => {
  let component: InteractiveTreeComponent;
  let fixture: ComponentFixture<InteractiveTreeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InteractiveTreeComponent]
    });
    fixture = TestBed.createComponent(InteractiveTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
