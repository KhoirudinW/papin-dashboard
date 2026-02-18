// midtrans-client.d.ts
declare module 'midtrans-client' {
    type MidtransOptions = {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    };

    type MidtransPayload = Record<string, unknown>;

    export interface MidtransTransactionApi {
      status(transactionId: string): Promise<MidtransPayload>;
      statusb2b(transactionId: string): Promise<MidtransPayload>;
      approve(transactionId: string): Promise<MidtransPayload>;
      deny(transactionId: string): Promise<MidtransPayload>;
      cancel(transactionId: string): Promise<MidtransPayload>;
      expire(transactionId: string): Promise<MidtransPayload>;
      refund(transactionId: string, parameter?: MidtransPayload): Promise<MidtransPayload>;
      refundDirect(transactionId: string, parameter?: MidtransPayload): Promise<MidtransPayload>;
      notification(notificationObj: MidtransPayload | string): Promise<MidtransPayload>;
    }

    export class Snap {
      constructor(options: MidtransOptions);
      transaction: MidtransTransactionApi;
      createTransactionToken(parameter?: MidtransPayload): Promise<string>;
      createTransaction(parameter?: MidtransPayload): Promise<MidtransPayload>;
      createTransactionRedirectUrl(parameter?: MidtransPayload): Promise<string>;
    }
  
    export class CoreApi {
      constructor(options: MidtransOptions);
      transaction: MidtransTransactionApi;
      charge(parameter?: MidtransPayload): Promise<MidtransPayload>;
      capture(parameter?: MidtransPayload): Promise<MidtransPayload>;
      cardRegister(parameter?: MidtransPayload): Promise<MidtransPayload>;
      cardToken(parameter?: MidtransPayload): Promise<MidtransPayload>;
      cardPointInquiry(tokenId: string): Promise<MidtransPayload>;
      linkPaymentAccount(parameter?: MidtransPayload): Promise<MidtransPayload>;
      getPaymentAccount(accountId: string): Promise<MidtransPayload>;
      unlinkPaymentAccount(accountId: string): Promise<MidtransPayload>;
      createSubscription(parameter?: MidtransPayload): Promise<MidtransPayload>;
      getSubscription(subscriptionId: string): Promise<MidtransPayload>;
      disableSubscription(subscriptionId: string): Promise<MidtransPayload>;
      enableSubscription(subscriptionId: string): Promise<MidtransPayload>;
      updateSubscription(subscriptionId: string, parameter?: MidtransPayload): Promise<MidtransPayload>;
    }
  }
