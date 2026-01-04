
// Utility for clean currency formatting (localized to IN)
export const formatCurrency = (amount: number | string): string => {
    const value = Number(amount);
    const hasDecimals = value % 1 !== 0;

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2
    }).format(value);
};
