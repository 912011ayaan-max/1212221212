import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Student {
  id: string;
  name: string;
  className: string;
  location?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
}

interface StudentMapProps {
  students: Student[];
}

const StudentMap: React.FC<StudentMapProps> = ({ students }) => {
  const studentsWithLocation = students.filter(s => s.location && s.location.lat && s.location.lng);

  // Default center if no students have locations (e.g., London)
  const defaultCenter: [number, number] = [51.505, -0.09];
  const center: [number, number] = studentsWithLocation.length > 0 
    ? [studentsWithLocation[0].location!.lat, studentsWithLocation[0].location!.lng]
    : defaultCenter;

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {studentsWithLocation.map((student) => (
          <Marker 
            key={student.id} 
            position={[student.location!.lat, student.location!.lng]}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.className}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(student.location!.updatedAt).toLocaleString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default StudentMap;
