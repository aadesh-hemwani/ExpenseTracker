import React from 'react';

const Card = ({ children, className = '', as: Component = 'div', ...props }) => {
    return (
        <Component className={`bg-white dark:bg-dark-card p-6 rounded-3xl dark:shadow-sm shadow-2xl transition-colors duration-200 ${className}`} {...props}>
            {children}
        </Component>
    );
};

export default Card;
