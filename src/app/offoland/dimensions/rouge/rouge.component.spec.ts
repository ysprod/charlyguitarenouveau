import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RougeComponent } from './rouge.component';

describe('RougeComponent', () => {
  let component: RougeComponent;
  let fixture: ComponentFixture<RougeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RougeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RougeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
