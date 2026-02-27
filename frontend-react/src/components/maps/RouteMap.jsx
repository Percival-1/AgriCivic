import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { FaMapMarkerAlt, FaRoute } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length === 2) {
            map.fitBounds(bounds, { padding: [50, 50] });
            setTimeout(() => map.invalidateSize(), 400);
        }
    }, [bounds, map]);
    return null;
}

export default function RouteMap({ origin, destination, showRoute = true, height = '400px' }) {
    const [route, setRoute] = useState(null);
    const [distanceInfo, setDistanceInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mapBounds, setMapBounds] = useState(null);

    const oLat = parseFloat(origin?.latitude || origin?.location?.latitude);
    const oLng = parseFloat(origin?.longitude || origin?.location?.longitude);
    const dLat = parseFloat(destination?.latitude || destination?.location?.latitude);
    const dLng = parseFloat(destination?.longitude || destination?.location?.longitude);

    useEffect(() => {
        if (showRoute && oLat && oLng && dLat && dLng) {
            drawRoute();
        }
    }, [oLat, oLng, dLat, dLng, showRoute]);

    const drawRoute = async () => {
        setLoading(true);
        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
            const response = await fetch(osrmUrl);
            
            if (!response.ok) throw new Error("API Blocked ya Network Error");
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes.length > 0) {
                // Yeh wo code hai jo road ke upar rasta banayega
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                setRoute(coords);
                setDistanceInfo({
                    dist: (data.routes[0].distance / 1000).toFixed(1) + ' km',
                    time: Math.round(data.routes[0].duration / 60) + ' min'
                });
            }
        } catch (error) {
            console.error("Route Server Error:", error);
            alert("Rasta nahi ban paya, seedhi line judegi! Please check server/net.");
            setRoute([[oLat, oLng], [dLat, dLng]]);
        } finally {
            setMapBounds([[oLat, oLng], [dLat, dLng]]);
            setLoading(false);
        }
    };

    // Asli Google Maps App Link
    const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                    <ClipLoader color="#3B82F6" size={40} />
                </div>
            )}

            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4 mb-2 sm:mb-0">
                    <p className="text-sm text-blue-800 font-medium">
                        <FaRoute className="inline mr-2" /> Route Map
                    </p>
                    {distanceInfo && (
                        <p className="text-sm text-gray-700 font-semibold border-l border-blue-300 pl-4">
                            {distanceInfo.dist} • {distanceInfo.time}
                        </p>
                    )}
                </div>
                <a href={googleMapsLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition shadow-sm">
                    <FaMapMarkerAlt /> Open in Google Maps App
                </a>
            </div>

            <div style={{ height }} className="relative rounded-lg overflow-hidden border border-gray-300 z-0">
                <MapContainer center={[oLat || 28.6139, oLng || 77.2090]} zoom={10} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {mapBounds && <MapUpdater bounds={mapBounds} />}
                    {oLat && oLng && <Marker position={[oLat, oLng]}><Popup>Origin</Popup></Marker>}
                    {dLat && dLng && <Marker position={[dLat, dLng]}><Popup>Destination</Popup></Marker>}
                    
                    {route && route.length > 0 && (
                        <Polyline positions={route} pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.8 }} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}