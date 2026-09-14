import { signal } from "@angular/core";

export class ResponseService {
  allResponses = signal<Record<string, Response[]>>({});

  setNewData(unitDefinition: string): void {
  }

  private resetData() {
  }
}
