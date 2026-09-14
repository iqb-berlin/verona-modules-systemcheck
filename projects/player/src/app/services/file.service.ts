export class FileService {
  static saveUnitToFile(unitJSON: string): void {
    const anchor = document.createElement('a');
    anchor.download = 'export.json';
    anchor.href = window.URL.createObjectURL(new File([unitJSON], 'export.json'));
    document.body.appendChild(anchor);
    anchor.click();
  }

  static async readFileAsText(file: File, asBase64: boolean = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject();
      asBase64 ? reader.readAsDataURL(file) : reader.readAsText(file);
    });
  }

  static async loadFile(extensions: string[]): Promise<{ content: string } | undefined> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = extensions.join(',');
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(undefined);
          return;
        }
        resolve({ content: await FileService.readFileAsText(file) });
      };
      input.click();
    });
  }
}
