declare module "adm-zip" {
  export interface IZipEntry {
    attr: number;
    entryName: string;
    header: {
      size: number;
    };
    isDirectory: boolean;
    getData(): Buffer;
  }

  export default class AdmZip {
    constructor(input?: Buffer);
    getEntries(): IZipEntry[];
    extractAllTo(targetPath: string, overwrite?: boolean): void;
  }
}
