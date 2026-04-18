declare module "adm-zip" {
  export default class AdmZip {
    constructor(input?: Buffer);
    extractAllTo(targetPath: string, overwrite?: boolean): void;
  }
}
