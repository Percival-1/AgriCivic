import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';

/**
 * Stats Card Component
 * Displays a quick stat with icon and optional link
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const StatsCard = memo(function StatsCard({ title, value, icon: Icon, color = 'blue', link = null }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        red: 'bg-red-100 text-red-600',
    };

    // Memoize color class to avoid recalculation
    const colorClass = useMemo(() => colorClasses[color], [color]);

    const content = (
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClass}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );

    if (link) {
        return (
            <Link to={link} className="block">
                {content}
            </Link>
        );
    }

    return content;
});

export default StatsCard;
