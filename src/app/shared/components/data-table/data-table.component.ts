import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  readonly actions = input<{ key: string; label: string; disable?: boolean }[]>(
    [],
  );
  readonly rowAction = output<{
    action: string;
    row: Record<string, string | number>;
  }>();
  readonly columns = input.required<{ key: string; label: string }[]>();
  readonly rows = input.required<Record<string, any>[]>();
  readonly caption = input('Registros');

  public isRowActionDisabled(
    actionKey: string,
    row: Record<string, any>,
  ): boolean {
    if (actionKey === 'toggle') {
      return !!row['disableAction'];
    }
    return !!row[actionKey + 'Disabled'];
  }
}
