import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { StoreService } from '../../../store/services/store.service';
import { ShellComponent } from './shell.component';

@Component({ standalone: true, template: '' })
class TestPageComponent {}

describe('ShellComponent navigation', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;
  let permissions: Set<string>;

  beforeEach(async () => {
    permissions = new Set(['view_products', 'view_providers', 'view_staff']);
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([
          { path: 'app', children: [
            { path: 'products-list', component: TestPageComponent },
            { path: 'edit-product/:productId', component: TestPageComponent },
            { path: 'providers-list', component: TestPageComponent },
            { path: 'staff-list', component: TestPageComponent },
          ] },
        ]),
        { provide: AuthService, useValue: {
          currentUser: signal(null), isAuthenticated: signal(true), isPlatformAdmin: signal(false),
          hasPermission: (permission: string) => permissions.has(permission),
        } },
        { provide: StoreService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('opens the active group on navigation, including an edit route', async () => {
    const group = () => fixture.nativeElement.querySelector('[aria-controls="sidebar-inventory"]');
    await router.navigateByUrl('/app/products-list');
    fixture.detectChanges();
    expect(group().getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('a[href="/app/products-list"]').getAttribute('aria-current')).toBe('page');

    group().click();
    fixture.detectChanges();
    expect(group().getAttribute('aria-expanded')).toBe('false');

    await router.navigateByUrl('/app/edit-product/123');
    fixture.detectChanges();
    expect(group().getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('a[href="/app/products-list"]').classList.contains('active')).toBeTrue();
  });

  it('shows available providers directly and hides sections without links', () => {
    const sidebar = fixture.nativeElement.querySelector('aside');
    expect(sidebar.querySelector('a[href="/app/providers-list"]')).not.toBeNull();
    expect(sidebar.querySelector('[aria-controls="sidebar-purchases"]')).toBeNull();
    expect(sidebar.querySelector('[aria-controls="sidebar-platform"]')).toBeNull();
    expect(sidebar.querySelector('a[href="/app/pos"]')).toBeNull();
    expect(sidebar.querySelector('.sidebar-bottom .logout')).not.toBeNull();
  });
});
