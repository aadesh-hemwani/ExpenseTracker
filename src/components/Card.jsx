import React from 'react';

const Card = ({ children, className = '', as: Component = 'div', ...props }) => {
    return (
        <Component className={`bg-white dark:bg-dark-card p-6 rounded-2xl border-[0.3px] border-gray-200/20 dark:shadow-sm shadow-[0_0_20px_rgba(70,70,70,0.2)] transition-all duration-300 ${className}`} {...props}>
            {children}
        </Component>
    );
};

export default Card;
