import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaTicketManagementComponent } from './ba-ticket-management.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DragDropModule } from '@angular/cdk/drag-drop';

describe('BaTicketManagementComponent', () => {
  let component: BaTicketManagementComponent;
  let fixture: ComponentFixture<BaTicketManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BaTicketManagementComponent],
      imports: [HttpClientTestingModule, DragDropModule]
    }).compileComponents();

    fixture = TestBed.createComponent(BaTicketManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});