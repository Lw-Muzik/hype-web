import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// Button Component
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    className = '',
    ...props
}) => {
    const baseStyle = "px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2";
    const variantStyle = variant === 'primary'
        ? "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500"
        : "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500";

    return (
        <button
            className={`${baseStyle} ${variantStyle} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { }

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
    return (
        <input
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
            {...props}
        />
    );
};

// Alert Component
interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children
}) => {
    const variantStyles = {
        info: "bg-blue-100 border-blue-500 text-blue-700",
        success: "bg-green-100 border-green-500 text-green-700",
        warning: "bg-yellow-100 border-yellow-500 text-yellow-700",
        error: "bg-red-100 border-red-500 text-red-700"
    };

    return (
        <div className={`border-l-4 p-4 ${variantStyles[variant]}`}>
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{children}</AlertDescription>
        </div>
    );
};

interface AlertComponentProps {
    children: React.ReactNode;
    className?: string;
}

export const AlertTitle: React.FC<AlertComponentProps> = ({ children, className = '' }) => (
    <h3 className={`text-lg font-semibold mb-2 ${className}`}>{children}</h3>
);

export const AlertDescription: React.FC<AlertComponentProps> = ({ children, className = '' }) => (
    <div className={`text-sm ${className}`}>{children}</div>
);