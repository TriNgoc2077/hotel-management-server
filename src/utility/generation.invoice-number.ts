export function generateInvoiceNumber(): string {
    return 'INV' + Math.floor(100000 + Math.random() * 900000);
}