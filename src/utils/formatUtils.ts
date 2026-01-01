
// Utility for clean currency formatting (localized to IN)
export const formatCurrency = (amount: number | string): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(Number(amount));
};
