// midtrans-client.d.ts
declare module 'midtrans-client' {
    export class Snap {
      constructor(options: {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
      });
      createTransactionToken(parameter: any): Promise<string>;
      createTransaction(parameter: any): Promise<any>;
    }
  
    export class CoreApi {
      constructor(options: {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
      });
      charge(parameter: any): Promise<any>;
      checkTransaction(orderId: string): Promise<any>;
    }
  }