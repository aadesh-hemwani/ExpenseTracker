import React from 'react';
import { Apple, ShoppingCart, Car, PartyPopper, IndianRupee, Briefcase, HeartPulse, Layers } from 'lucide-react';

export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Misc'];

export const getCategoryIcon = (cat) => {
    switch (cat) {
        case 'Food': return <Apple className="w-5 h-5 text-accent" />;
        case 'Shopping': return <ShoppingCart className="w-5 h-5 text-accent" />;
        case 'Transport': return <Car className="w-5 h-5 text-accent" />;
        case 'Entertainment': return <PartyPopper className="w-5 h-5 text-accent" />;
        case 'Health': return <HeartPulse className="w-5 h-5 text-accent" />;
        case 'Bills': return <IndianRupee className="w-5 h-5 text-accent" />;
        case 'Misc': return <Layers className="w-5 h-5 text-accent" />;
        default: return <Briefcase className="w-5 h-5 text-accent" />;
    }
};
