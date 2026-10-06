import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PianovirtuelComponent } from './pianovirtuel.component';

describe('PianovirtuelComponent', () => {
  let component: PianovirtuelComponent;
  let fixture: ComponentFixture<PianovirtuelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PianovirtuelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PianovirtuelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
