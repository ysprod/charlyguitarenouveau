import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuitarLiveComponent } from './guitar-live.component';

describe('GuitarLiveComponent', () => {
  let component: GuitarLiveComponent;
  let fixture: ComponentFixture<GuitarLiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuitarLiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuitarLiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
