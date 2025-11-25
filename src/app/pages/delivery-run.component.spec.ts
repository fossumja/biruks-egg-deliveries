import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryRunComponent } from './delivery-run.component';

describe('DeliveryRunComponent', () => {
  let component: DeliveryRunComponent;
  let fixture: ComponentFixture<DeliveryRunComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryRunComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryRunComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
