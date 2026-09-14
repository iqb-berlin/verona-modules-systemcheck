import { Component, input } from '@angular/core';

@Component({
  selector: 'syscheck-report-list',
  templateUrl: 'report-list.html',
  styleUrl: 'report-list.scss',
})
export class ReportList {
  reportList = input.required<string[]>();
}
