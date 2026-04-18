declare module "mailparser" {
  export function simpleParser(input: Buffer | string, options?: Record<string, unknown>): Promise<any>;
}
