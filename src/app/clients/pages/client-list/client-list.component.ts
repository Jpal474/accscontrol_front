import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { Client } from '../../interfaces/client.interface';
import { AddressComponent } from '../../../shared/components/address/address.component';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    PageHeaderComponent,
    AddressComponent,
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent {
  readonly rows = signal<Client[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly total = signal(0);
  public mockClients: Client[] = [
    // 1. Active Enterprise Client (Version 1)
    {
      id: 'cli_001',
      code: 'CLI-1001',
      name: 'Acme Corporation',
      email: 'contact@acmecorp.com',
      phone: '+1-555-019-2834',
      notes: 'Preferred enterprise client. Net-30 payment terms agreed.',
      active: true,
      version: 1,
    },

    // 2. Inactive Individual Client with updated history (Version 2)
    {
      id: 'cli_002',
      code: 'CLI-1002',
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '(555) 234-5678',
      notes:
        'Requested contact via email only. Account temporarily deactivated.',
      active: false,
      version: 2,
    },

    // 3. High-volume Active Client with multiple updates (Version 5)
    {
      id: 'cli_003',
      code: 'CLI-1003',
      name: 'Stark Industries',
      email: 'procurement@stark.io',
      phone: '+15559876543',
      notes: 'High-priority account. Assigned to senior account manager.',
      active: true,
      version: 5,
    },

    // 4. Newly Imported Client with empty notes (Version 1)
    {
      id: 'cli_004',
      code: 'CLI-1004',
      name: 'Local Bakery Co.',
      email: 'orders@localbakery.net',
      phone: '555-432-1098',
      notes: '',
      active: true,
      version: 1,
    },
  ];
  page = 1;
  search = '';

  constructor() {
    void this.load();
  }
  async load() {
    // const context = JSON.stringify(this.auth.context());
    try {
      // const r = await this.api.customers(this.page, this.search);
      // if (context !== JSON.stringify(this.auth.context())) return;
      this.rows.set(this.mockClients);
      this.total.set(4);
      this.error.set('');
    } catch (e) {
      // if (context === JSON.stringify(this.auth.context())) this.error.set(errorMessage(e));
    }
  }

  async paginate(delta: number) {
    this.page += delta;
    await this.load();
  }
}
