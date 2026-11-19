import { Component, input, output } from '@angular/core';

export type CheckRowStatus = 'ok' | 'warning' | 'failed';

@Component({
  selector: 'syscheck-check-row',
  templateUrl: 'check-row.html',
  styleUrl: 'check-row.scss'
})
export class CheckRow {
  label = input.required<string>();
  detected = input.required<string>();
  status = input<CheckRowStatus>();
  message = input<string>();
  expanded = input<boolean>(false);
  instructionsButtonLabel = input<string>('');
  showIcon = input<boolean>(true);

  readonly toggleInstructions = output<void>();
}
