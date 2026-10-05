// Tipos mínimos para os módulos do wa-sqlite que não trazem declaração.
declare module 'wa-sqlite/dist/wa-sqlite.mjs' {
  const factory: (config?: { locateFile?: (path: string) => string }) => Promise<unknown>;
  export default factory;
}
declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
  const factory: (config?: { locateFile?: (path: string) => string }) => Promise<unknown>;
  export default factory;
}
declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
  export class AccessHandlePoolVFS {
    constructor(directoryPath: string);
    readonly isReady: Promise<void>;
    readonly name: string;
  }
}
declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {
  export class IDBBatchAtomicVFS {
    constructor(idbDatabaseName?: string);
    readonly name: string;
  }
}
