import { Injectable } from '@nestjs/common';
import type {
  CashfreeGatewayPort,
  CreateOrderInput,
  CreateOrderOutput,
  GetOrderOutput,
} from '@domain/subscription-payments/ports/cashfree-gateway.port';
import { CashfreeHttpClient } from './cashfree-http.client';
import type { LoggerPort } from '@shared/logging/logger.port';

interface CashfreeCreateOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_expiry_time: string;
  order_status: string;
}

interface CashfreeGetOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_status: string;
  order_amount: number;
}

@Injectable()
export class CashfreeAdapter implements CashfreeGatewayPort {
  private readonly httpClient: CashfreeHttpClient;

  constructor(
    httpClient: CashfreeHttpClient,
    private readonly logger: LoggerPort,
  ) {
    this.httpClient = httpClient;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const body = {
      order_id: input.orderId,
      order_amount: input.orderAmount,
      order_currency: input.orderCurrency,
      customer_details: {
        customer_id: input.customerId,
        // Normalize to a 10-digit phone regardless of whether the stored format
        // includes a "+91" / "91" / no prefix. Cashfree v3 expects exactly 10
        // digits for Indian numbers — passing 12 digits ("919876543210") is
        // rejected as invalid_phone.
        customer_phone: input.customerPhone.replace(/^\+?91/, '').slice(-10),
      },
    };

    this.logger.info('Creating Cashfree order', {
      orderId: input.orderId,
      amount: input.orderAmount,
    });

    const response = await this.httpClient.post<CashfreeCreateOrderResponse>(
      '/orders',
      body,
      input.idempotencyKey,
    );

    return {
      cfOrderId: response.cf_order_id,
      paymentSessionId: response.payment_session_id,
      orderExpiryTime: response.order_expiry_time,
    };
  }

  async getOrder(orderId: string): Promise<GetOrderOutput> {
    const response = await this.httpClient.get<CashfreeGetOrderResponse>(
      `/orders/${orderId}`,
    );

    return {
      orderId: response.order_id,
      cfOrderId: response.cf_order_id,
      orderStatus: response.order_status,
      orderAmount: response.order_amount,
    };
  }
}
