export const mockVehicles = [
  { 
    reg: 'LEC-1152', 
    make: 'Toyota Hilux', 
    model: '4x4 Double Cab', 
    year: '2023', 
    vin: 'JTEBH3FJXPK123456', 
    category: 'Pickup', 
    status: 'Active', 
    owner: 'LEC Transport', 
    costCentre: 'CC-001', 
    location: 'Maseru Depot', 
    custodian: 'Michael Thabang', 
    mileage: '12,847 km', 
    lastService: '2026-05-15', 
    nextService: '2,340 km', 
    accessories: ['Toolbox', 'Beacon', 'Radio', 'Tow Bar'], 
    insurance: 'LEC Insurance', 
    permit: 'Valid', 
    licenseExpiry: '2027-08-15', 
    roadworthy: '2027-03-10' 
  },
  { 
    reg: 'LEC-1153', 
    make: 'Ford Ranger', 
    model: 'Wildtrak', 
    year: '2022', 
    vin: 'JTEBN3FJXPK789012', 
    category: 'Pickup', 
    status: 'Maintenance', 
    owner: 'LEC Transport', 
    costCentre: 'CC-002', 
    location: 'Ha-Teko Workshop', 
    custodian: 'David Mokoena', 
    mileage: '8,234 km', 
    lastService: '2026-04-10', 
    nextService: 'Overdue', 
    accessories: ['Toolbox', 'Roof Rack'], 
    insurance: 'LEC Insurance', 
    permit: 'Valid', 
    licenseExpiry: '2027-06-20', 
    roadworthy: '2027-01-15' 
  },
  { 
    reg: 'LEC-1154', 
    make: 'Isuzu D-Max', 
    model: 'LS 4x4', 
    year: '2024', 
    vin: 'JTEBH3FJXPK345678', 
    category: 'Pickup', 
    status: 'Active', 
    owner: 'LEC Transport', 
    costCentre: 'CC-003', 
    location: 'Maseru Depot', 
    custodian: 'Grace Ntsoane', 
    mileage: '5,102 km', 
    lastService: '2026-06-01', 
    nextService: '4,898 km', 
    accessories: ['Toolbox', 'Beacon', 'Radio'], 
    insurance: 'LEC Insurance', 
    permit: 'Valid', 
    licenseExpiry: '2028-01-10', 
    roadworthy: '2027-06-20' 
  },
];

export const mockDrivers = [
  { name: 'Michael Thabang', license: 'L-12345-2025', expiry: '2027-05-15', vehicle: 'LEC-1152', score: 96, training: 'Defensive Driving 2025', status: 'Active', driverId: 'RFID-001' },
  { name: 'David Mokoena', license: 'L-12346-2025', expiry: '2026-12-10', vehicle: 'LEC-1153', score: 88, training: 'Basic Fleet 2024', status: 'Active', driverId: 'RFID-002' },
  { name: 'Grace Ntsoane', license: 'L-12347-2025', expiry: '2027-08-20', vehicle: 'LEC-1154', score: 94, training: 'Advanced 2025', status: 'Active', driverId: 'Keypad-003' },
  { name: 'Thabo Lerotholi', license: 'L-12348-2024', expiry: '2026-09-01', vehicle: 'LEC-1155', score: 82, training: 'None', status: 'Inactive', driverId: 'RFID-004' },
];

export const mockTrips = [
  { date: '2026-06-23', from: 'Maseru Depot', to: 'Ha-Teko', distance: '42 km', duration: '1h 15m', cost: 'LSL 2,450', startOdometer: '12,847', endOdometer: '12,889' },
  { date: '2026-06-22', from: 'Ha-Teko', to: 'Maseru', distance: '38 km', duration: '1h 05m', cost: 'LSL 2,180', startOdometer: '12,809', endOdometer: '12,847' },
  { date: '2026-06-21', from: 'Maseru Depot', to: 'Teyateyaneng', distance: '67 km', duration: '2h 20m', cost: 'LSL 3,890', startOdometer: '12,742', endOdometer: '12,809' },
];

export const mockGeofences = [
  { name: 'Maseru Depot', type: 'Circular', lat: '-29.3167', lng: '27.4833', radius: '500m', vehicles: 12, alerts: 0 },
  { name: 'Ha-Teko Workshop', type: 'Polygon', lat: '-29.3500', lng: '27.4500', radius: '200m', vehicles: 3, alerts: 0 },
  { name: 'Restricted Zone A', type: 'Circular', lat: '-29.3000', lng: '27.5000', radius: '1km', vehicles: 0, alerts: 2 },
  { name: 'Mafeteng Route', type: 'Route', lat: '-29.4000', lng: '27.5500', radius: '10km', vehicles: 0, alerts: 1 },
];

export const mockIncidents = [
  { vehicle: 'LEC-1152', date: '2026-06-23 14:30', type: 'Collision', severity: 'High', status: 'Investigating', driver: 'Michael T.', location: 'Maseru-Mafeteng Rd', police: 'Maseru Central', cost: 'LSL 12,500', attachments: '3 photos, police report' },
  { vehicle: 'LEC-1155', date: '2026-06-20 09:15', type: 'Mechanical', severity: 'Medium', status: 'In Progress', driver: 'Thabo L.', location: 'Ha-Teko', police: 'N/A', cost: 'LSL 4,200', attachments: '2 photos' },
  { vehicle: 'LEC-1153', date: '2026-06-18 22:30', type: 'Theft Attempt', severity: 'High', status: 'Resolved', driver: 'David M.', location: 'Maseru Industrial', police: 'Maseru South', cost: 'LSL 1,800', attachments: 'CCTV footage, police report' },
];

export const mockFuelRefills = [
  { date: '2026-06-23 14:30', vehicle: 'LEC-1152', driver: 'Michael T.', station: 'Total Maseru', litres: '45.6', cost: 'LSL 547', odometer: '12,847', efficiency: '7.2', status: 'normal' },
  { date: '2026-06-23 09:15', vehicle: 'LEC-1153', driver: 'David M.', station: 'Engen Ha-Teko', litres: '52.3', cost: 'LSL 628', odometer: '8,234', efficiency: '8.1', status: 'high' },
  { date: '2026-06-22 16:45', vehicle: 'LEC-1154', driver: 'Grace N.', station: 'Shell Maseru', litres: '38.9', cost: 'LSL 467', odometer: '5,102', efficiency: '6.8', status: 'normal' },
];