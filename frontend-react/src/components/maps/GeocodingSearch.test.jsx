import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GeocodingSearch from './GeocodingSearch';
import mapsService from '../../api/services/mapsService';

// Mock the maps service
vi.mock('../../api/services/mapsService', () => ({
    default: {
        autocomplete: vi.fn(),
        geocode: vi.fn(),
    },
}));

describe('GeocodingSearch Component', () => {
    it('renders search input', () => {
        const mockOnLocationSelect = vi.fn();
        render(<GeocodingSearch onLocationSelect={mockOnLocationSelect} />);

        const input = screen.getByPlaceholderText(/search for a location/i);
        expect(input).toBeInTheDocument();
    });

    it('shows suggestions when typing', async () => {
        const mockOnLocationSelect = vi.fn();
        const mockSuggestions = [
            { description: 'Delhi, India', formatted_address: 'Delhi, India' },
            { description: 'Delhi NCR, India', formatted_address: 'Delhi NCR, India' },
        ];

        mapsService.autocomplete.mockResolvedValue(mockSuggestions);

        render(<GeocodingSearch onLocationSelect={mockOnLocationSelect} />);

        const input = screen.getByPlaceholderText(/search for a location/i);
        fireEvent.change(input, { target: { value: 'Delhi' } });

        await waitFor(() => {
            expect(mapsService.autocomplete).toHaveBeenCalledWith('Delhi', 5);
        });
    });

    it('calls onLocationSelect when geocoding succeeds', async () => {
        const mockOnLocationSelect = vi.fn();
        const mockLocation = {
            latitude: 28.6139,
            longitude: 77.2090,
            formatted_address: 'Delhi, India',
            name: 'Delhi',
        };

        mapsService.geocode.mockResolvedValue(mockLocation);

        render(<GeocodingSearch onLocationSelect={mockOnLocationSelect} />);

        const input = screen.getByPlaceholderText(/search for a location/i);
        fireEvent.change(input, { target: { value: 'Delhi' } });
        fireEvent.submit(input.closest('form'));

        await waitFor(() => {
            expect(mapsService.geocode).toHaveBeenCalledWith('Delhi');
            expect(mockOnLocationSelect).toHaveBeenCalledWith(expect.objectContaining({
                latitude: 28.6139,
                longitude: 77.2090,
            }));
        });
    });

    it('shows error when geocoding fails', async () => {
        const mockOnLocationSelect = vi.fn();
        mapsService.geocode.mockRejectedValue(new Error('Location not found'));

        render(<GeocodingSearch onLocationSelect={mockOnLocationSelect} />);

        const input = screen.getByPlaceholderText(/search for a location/i);
        fireEvent.change(input, { target: { value: 'InvalidLocation123' } });
        fireEvent.submit(input.closest('form'));

        await waitFor(() => {
            expect(screen.getByText(/location not found/i)).toBeInTheDocument();
        });
    });
});
