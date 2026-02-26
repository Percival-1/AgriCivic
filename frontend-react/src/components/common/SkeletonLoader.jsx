/**
 * SkeletonLoader Component
 * 
 * Displays skeleton loading placeholders for content that is being loaded.
 * Provides a better user experience than blank spaces or spinners alone.
 */

export default function SkeletonLoader({ type = 'text', count = 1, className = '' }) {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';

    const renderSkeleton = () => {
        switch (type) {
            case 'text':
                return (
                    <div className={`space-y-2 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-4 w-full`} />
                        ))}
                    </div>
                );

            case 'title':
                return (
                    <div className={`space-y-2 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-8 w-3/4`} />
                        ))}
                    </div>
                );

            case 'card':
                return (
                    <div className={`space-y-4 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-48 w-full`} />
                        ))}
                    </div>
                );

            case 'avatar':
                return (
                    <div className={`flex gap-4 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-12 w-12 rounded-full`} />
                        ))}
                    </div>
                );

            case 'table':
                return (
                    <div className={`space-y-2 ${className}`}>
                        {/* Table header */}
                        <div className="flex gap-4">
                            <div className={`${baseClasses} h-10 flex-1`} />
                            <div className={`${baseClasses} h-10 flex-1`} />
                            <div className={`${baseClasses} h-10 flex-1`} />
                        </div>
                        {/* Table rows */}
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className={`${baseClasses} h-8 flex-1`} />
                                <div className={`${baseClasses} h-8 flex-1`} />
                                <div className={`${baseClasses} h-8 flex-1`} />
                            </div>
                        ))}
                    </div>
                );

            case 'list':
                return (
                    <div className={`space-y-3 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`${baseClasses} h-10 w-10 rounded-full`} />
                                <div className="flex-1 space-y-2">
                                    <div className={`${baseClasses} h-4 w-3/4`} />
                                    <div className={`${baseClasses} h-3 w-1/2`} />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'chart':
                return (
                    <div className={`${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-64 w-full`} />
                        ))}
                    </div>
                );

            case 'image':
                return (
                    <div className={`grid gap-4 ${className}`}>
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className={`${baseClasses} h-48 w-full`} />
                        ))}
                    </div>
                );

            default:
                return (
                    <div className={`${baseClasses} h-4 w-full ${className}`} />
                );
        }
    };

    return renderSkeleton();
}

/**
 * Predefined skeleton layouts for common use cases
 */

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <SkeletonLoader type="title" count={1} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonLoader type="card" count={3} />
            </div>
            <SkeletonLoader type="chart" count={1} />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }) {
    return <SkeletonLoader type="table" count={rows} />;
}

export function ListSkeleton({ items = 5 }) {
    return <SkeletonLoader type="list" count={items} />;
}

export function CardSkeleton({ count = 1 }) {
    return <SkeletonLoader type="card" count={count} />;
}

export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <SkeletonLoader type="avatar" count={1} />
                <div className="flex-1">
                    <SkeletonLoader type="title" count={1} />
                    <SkeletonLoader type="text" count={2} />
                </div>
            </div>
            <SkeletonLoader type="card" count={2} />
        </div>
    );
}
