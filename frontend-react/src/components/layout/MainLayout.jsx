import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

/**
 * MainLayout Component
 * 
 * Main application layout combining:
 * - Header (top navigation)
 * - Sidebar (side navigation)
 * - Content area (page content via Outlet)
 * 
 * Features:
 * - Responsive design with Tailwind CSS
 * - Mobile-friendly with collapsible sidebar
 * - Sticky header
 * - Scrollable content area
 * 
 * Requirements: 15.1-15.6
 */
export default function MainLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleMenuToggle = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleMenuClose = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <Header
                onMenuToggle={handleMenuToggle}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {/* Main Content Area */}
            <div className="flex h-[calc(100vh-4rem)]">
                {/* Sidebar */}
                <Sidebar isOpen={isMobileMenuOpen} onClose={handleMenuClose} />

                {/* Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
