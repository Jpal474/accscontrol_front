import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  readonly actions = input<{ key: string; label: string }[]>([]);
  readonly rowAction = output<{
    action: string;
    row: Record<string, string | number>;
  }>();
  readonly columns = input.required<{ key: string; label: string }[]>();
  readonly rows = input.required<Record<string, string | number>[]>();
  readonly caption = input('Registros');
}
