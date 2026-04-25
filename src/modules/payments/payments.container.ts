import { getDatabaseClient } from "../../shared/database/database.factory.js";
import { PaymentsService } from "./payments.service.js";
import { SqlitePaymentsRepository } from "./payments.repository.sqlite.js";
import { WompiService } from "./wompi.service.js";

let paymentsService: PaymentsService | null = null;
let wompiService: WompiService | null = null;

export function getWompiService(): WompiService {
  wompiService ??= new WompiService();
  return wompiService;
}

export function getPaymentsService(): PaymentsService {
  paymentsService ??= new PaymentsService(
    new SqlitePaymentsRepository(getDatabaseClient()),
    getWompiService()
  );

  return paymentsService;
}
