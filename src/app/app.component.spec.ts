import { TestBed } from '@angular/core/testing';
import { Event, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppComponent } from './app.component';

describe('Global route loading indicator', () => {
  let events: Subject<Event>;
  beforeEach(async () => {
    events = new Subject<Event>();
    await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] }).compileComponents();
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'events', 'get').and.returnValue(events.asObservable());
    spyOn(router, 'getCurrentNavigation').and.returnValue(null);
  });
  it('shows loading during navigation and removes it only when navigation ends', () => {
    const fixture = TestBed.createComponent(AppComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.route-loading')).toBeNull();
    events.next(new NavigationStart(1, '/app/products-list')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.route-loading').textContent).toContain('Cargando');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    events.next(new NavigationEnd(1, '/app/products-list', '/app/products-list')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.route-loading')).toBeNull();
  });
  it('clears loading after cancellations, errors and skipped navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    for (const terminal of [new NavigationCancel(1, '/app', 'Cancelled'), new NavigationError(1, '/app', new Error('Chunk failed')),
      new NavigationSkipped(1, '/app', 'Same URL', NavigationSkippedCode.IgnoredSameUrlNavigation)]) {
      events.next(new NavigationStart(1, '/app')); expect(fixture.componentInstance.navigating()).toBeTrue();
      events.next(terminal); expect(fixture.componentInstance.navigating()).toBeFalse();
    }
  });
  it('does not hide a newer navigation when an older one is cancelled', () => {
    const fixture = TestBed.createComponent(AppComponent);
    events.next(new NavigationStart(1, '/app/products-list')); events.next(new NavigationStart(2, '/app/inventory'));
    events.next(new NavigationCancel(1, '/app/products-list', 'Superseded'));
    expect(fixture.componentInstance.navigating()).toBeTrue();
    events.next(new NavigationEnd(2, '/app/inventory', '/app/inventory'));
    expect(fixture.componentInstance.navigating()).toBeFalse();
  });
});
