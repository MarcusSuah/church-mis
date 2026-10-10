'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';

/**
 * Ported from ssbcms's AppImage, which wrapped next/image. This Vite/Inertia
 * app has no Next.js image pipeline, so this renders a plain <img> instead —
 * same prop interface, so every caller in the ported SSBCMS pages works
 * unchanged. Optimization props (quality, priority, unoptimized, etc.) are
 * accepted for compatibility but have no effect here.
 */
interface AppImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    quality?: number;
    fill?: boolean;
    sizes?: string;
    onClick?: () => void;
    fallbackSrc?: string;
    loading?: 'lazy' | 'eager';
    unoptimized?: boolean;
    [key: string]: any;
}

const AppImage = memo(function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    fill = false,
    onClick,
    fallbackSrc = '/assets/images/no_image.png',
    loading = 'lazy',
    priority,
    quality,
    sizes,
    unoptimized,
    ...props
}: AppImageProps) {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
    }, [hasError, imageSrc, fallbackSrc]);

    const handleLoad = useCallback(() => {
        setIsLoading(false);
        setHasError(false);
    }, []);

    const imageClassName = useMemo(() => {
        const classes = [className];
        if (isLoading) classes.push('bg-muted');
        if (onClick)
            classes.push(
                'cursor-pointer hover:opacity-90 transition-opacity duration-200',
            );
        return classes.filter(Boolean).join(' ');
    }, [className, isLoading, onClick]);

    if (fill) {
        return (
            <div className="relative h-full w-full">
                <img
                    src={imageSrc}
                    alt={alt}
                    className={`h-full w-full object-cover ${imageClassName}`}
                    loading={loading}
                    onError={handleError}
                    onLoad={handleLoad}
                    onClick={onClick}
                    {...props}
                />
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            width={width || 400}
            height={height || 300}
            className={imageClassName}
            loading={loading}
            onError={handleError}
            onLoad={handleLoad}
            onClick={onClick}
            {...props}
        />
    );
});

AppImage.displayName = 'AppImage';

export default AppImage;
