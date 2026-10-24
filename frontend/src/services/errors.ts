export class NotAvailableError extends Error {
  feature: string;

  constructor(feature: string) {
    super(`${feature} is not available yet`);
    this.name = 'NotAvailableError';
    this.feature = feature;
  }
}
