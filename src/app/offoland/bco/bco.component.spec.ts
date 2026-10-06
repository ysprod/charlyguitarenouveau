import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BcoComponent } from './bco.component';

describe('BcoComponent', () => {
  let component: BcoComponent;
  let fixture: ComponentFixture<BcoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BcoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BcoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
