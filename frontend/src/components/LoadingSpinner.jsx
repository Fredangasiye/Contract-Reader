import React from 'react';

function LoadingSpinner({ size = 'medium', color = 'primary' }) {
    const sizeClasses = {
        small: '24px',
        medium: '48px',
        large: '64px'
    };

    const colorValues = {
        primary: 'var(--color-primary-500)',
        white: '#ffffff',
        secondary: 'var(--color-secondary-500)'
    };

    const spinnerSize = sizeClasses[size] || sizeClasses.medium;
    const spinnerColor = colorValues[color] || colorValues.primary;

    return (
        <div className="loading-spinner" style={{
            width: spinnerSize,
            height: spinnerSize,
            border: `4px solid var(--color-neutral-200)`,
            borderTopColor: spinnerColor,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
    );
}

export default LoadingSpinner;
