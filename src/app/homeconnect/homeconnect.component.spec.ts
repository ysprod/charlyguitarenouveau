import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeconnectComponent } from './homeconnect.component';

describe('HomeconnectComponent', () => {
  let component: HomeconnectComponent;
  let fixture: ComponentFixture<HomeconnectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeconnectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeconnectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
