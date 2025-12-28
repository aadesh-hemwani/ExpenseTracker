import React from 'react';
import { Apple, ShoppingCart, Car, PartyPopper, IndianRupee, Briefcase, HeartPulse } from 'lucide-react';

export const CATEGORIES = ['Food', 'Transport', 'Shop', 'Bills', 'Entertainment', 'Health'];

export const getCategoryIcon = (cat) => {
    switch (cat) {
        case 'Food': return <Apple className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        case 'Shop': // Normalized to 'Shop' based on usage in Layout.jsx, check if it was 'Shopping' elsewhere
        case 'Shopping': return <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        case 'Transport': return <Car className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        case 'Entertainment': return <PartyPopper className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        case 'Health': return <HeartPulse className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        case 'Bills': return <Briefcase className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
        default: return <IndianRupee className="w-5 h-5 text-gray-700 dark:text-gray-200" />;
    }
};
