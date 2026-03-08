export const CASHFREE_GATEWAY = Symbol('CASHFREE_GATEWAY');

export interface CreateOrderInput {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerId: string;
  customerPhone: string;
  idempotencyKey: string;
}

export interface CreateOrderOutput {
  cfOrderId: string;
  paymentSessionId: string;
  orderExpiryTime: string;
}

export interface GetOrderOutput {
  orderId: string;
  cfOrderId: string;
  orderStatus: string;
  orderAmount: number;
}

export interface CashfreeGatewayPort {
  createOrder(input: CreateOrderInput): Promise<CreateOrderOutput>;
  getOrder(orderId: string): Promise<GetOrderOutput>;
}
