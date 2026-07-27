import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar as CalendarIcon, Clock, Car, CheckCircle,
  X, Search, Filter, Edit, Trash2,
  AlertTriangle, BarChart3, Save, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService,
  poolBookingService
} from '../../services/api';

const PoolVehicles = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [poolVehicles, setPoolVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');

  // ============================================
  // FORM DATA - Matches Database Schema
  // ============================================
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    booked_by: '',
    purpose: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    handover_odometer: '',
    return_odometer: '',
    condition_notes: ''
  });

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    booked_by: '',
    purpose: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    handover_odometer: '',
    return_odometer: '',
    condition_notes: ''
  });

  // ============================================
  // BOOKING STATUSES
  // ============================================
  const statuses = ['pending', 'approved', 'active', 'completed', 'cancelled'];

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'approved': 'Approved',
      'active': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view pool vehicles');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      // 1. Load vehicles (used as pool vehicles)
      console.log('📡 Fetching vehicles for pool...');
      const vehiclesRes = await vehicleService.getAll(tenant);
      if (vehiclesRes?.success && vehiclesRes?.data) {
        const vehiclesData = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [vehiclesRes.data];
        setVehicles(vehiclesData);
        
        // Convert vehicles to pool vehicles format
        const poolData = vehiclesData.map(v => ({
          id: v.id,
          name: v.registration || v.id,
          type: v.make && v.model ? `${v.make} ${v.model}` : 'Unknown',
          capacity: v.category || 'N/A',
          status: v.status === 'active' || v.status === 'Active' ? 'available' : 'maintenance',
          lastService: v.lastService || 'N/A',
          mileage: v.mileage || '0 km'
        }));
        setPoolVehicles(poolData);
        console.log('✅ Loaded pool vehicles:', poolData.length);
      } else {
        setVehicles([]);
        setPoolVehicles([]);
      }

      // 2. Load drivers
      console.log('📡 Fetching drivers...');
      const driversRes = await driverService.getAll(tenant);
      if (driversRes?.success && driversRes?.data) {
        const driversData = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
        setDrivers(driversData);
        console.log('✅ Loaded drivers:', driversData.length);
      } else {
        setDrivers([]);
      }

      // 3. Load bookings
      console.log('📡 Fetching pool bookings...');
      const bookingsRes = await poolBookingService.getAll(tenant);
      if (bookingsRes?.success && bookingsRes?.data) {
        const bookingsData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [bookingsRes.data];
        setBookings(bookingsData);
        console.log('✅ Loaded bookings:', bookingsData.length);
      } else {
        setBookings([]);
      }

    } catch (error) {
      console.error('❌ Error loading pool data:', error);
      setErrorMessage('Failed to load pool data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // USE EFFECT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // ============================================
  // SEARCH LISTENER
  // ============================================
  useEffect(() => {
    const handleSearch = (event) => {
      console.log('🚗 Pool page received search:', event.detail);
      
      if (event.detail && event.detail.query) {
        const searchTerm = event.detail.query.toLowerCase().trim();
        setSearchTerm(searchTerm);
        console.log(`✅ Pool filtered for: "${searchTerm}"`);
      }
    };

    window.addEventListener('searchResults', handleSearch);
    
    const savedSearch = localStorage.getItem('lastSearchQuery');
    if (savedSearch) {
      setSearchTerm(savedSearch);
    }

    return () => {
      window.removeEventListener('searchResults', handleSearch);
    };
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: poolVehicles.length,
    available: poolVehicles.filter(v => v.status === 'available').length,
    inUse: poolVehicles.filter(v => v.status === 'in_use').length,
    maintenance: poolVehicles.filter(v => v.status === 'maintenance').length,
    totalBookings: bookings.length,
    activeBookings: bookings.filter(b => b.status === 'active' || b.status === 'approved').length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    utilizationRate: poolVehicles.length > 0 
      ? Math.round((bookings.filter(b => b.status === 'active' || b.status === 'approved' || b.status === 'completed').length / (poolVehicles.length * 7)) * 100)
      : 0,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'available': 'bg-green-100 text-green-700',
      'in_use': 'bg-blue-100 text-blue-700',
      'maintenance': 'bg-red-100 text-red-700',
      'active': 'bg-green-100 text-green-700',
      'approved': 'bg-yellow-100 text-yellow-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'completed': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'available': return <CheckCircle size={14} className="text-green-600" />;
      case 'in_use':
      case 'active': return <Car size={14} className="text-blue-600" />;
      case 'maintenance': return <AlertTriangle size={14} className="text-red-600" />;
      case 'completed': return <CheckCircle size={14} className="text-gray-600" />;
      case 'cancelled': return <X size={14} className="text-red-600" />;
      case 'pending':
      case 'approved': return <Clock size={14} className="text-yellow-600" />;
      default: return null;
    }
  };

  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId) return 'Unknown';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.registration || vehicle.id : vehicleId;
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => String(d.id) === String(driverId));
    return driver ? driver.name : 'Unassigned';
  };

  const getUserName = (userId) => {
    if (!userId) return 'System';
    // Could fetch from users list if available
    return userId;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const isBooked = (day) => {
    return bookings.some(b => {
      if (!b.startTime) return false;
      const date = new Date(b.startTime);
      return date.getDate() === day && 
             date.getMonth() === selectedDate.getMonth() &&
             date.getFullYear() === selectedDate.getFullYear() &&
             (b.status === 'active' || b.status === 'approved');
    });
  };

  const changeMonth = (delta) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: '',
      booked_by: '',
      purpose: '',
      start_time: '',
      end_time: '',
      status: 'pending',
      handover_odometer: '',
      return_odometer: '',
      condition_notes: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetEditForm = () => {
    setEditFormData({
      vehicle_id: '',
      driver_id: '',
      booked_by: '',
      purpose: '',
      start_time: '',
      end_time: '',
      status: 'pending',
      handover_odometer: '',
      return_odometer: '',
      condition_notes: ''
    });
  };

  const handleAddBooking = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.vehicle_id || !formData.driver_id || !formData.purpose || !formData.start_time) {
      setErrorMessage('Vehicle, driver, purpose, and start time are required');
      setIsLoading(false);
      return;
    }

    try {
      const bookingData = {
        tenant: { id: tenantId },
        vehicle: { id: formData.vehicle_id },
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        bookedBy: formData.booked_by ? { id: formData.booked_by } : null,
        purpose: formData.purpose,
        startTime: formData.start_time,
        endTime: formData.end_time || null,
        status: formData.status || 'pending',
        handoverOdometer: parseFloat(formData.handover_odometer) || 0,
        returnOdometer: parseFloat(formData.return_odometer) || 0,
        conditionNotes: formData.condition_notes || ''
      };

      console.log('📤 Creating booking:', bookingData);
      const response = await poolBookingService.create(bookingData);
      
      if (response?.success) {
        setSuccessMessage('Booking created successfully!');
        setShowAddModal(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to create booking. Please try again.');
      }
    } catch (error) {
      console.error('Error adding booking:', error);
      setErrorMessage('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBooking = async () => {
    if (!selectedBooking) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const bookingData = {
        purpose: editFormData.purpose,
        startTime: editFormData.start_time,
        endTime: editFormData.end_time || null,
        status: editFormData.status || 'pending',
        handoverOdometer: parseFloat(editFormData.handover_odometer) || 0,
        returnOdometer: parseFloat(editFormData.return_odometer) || 0,
        conditionNotes: editFormData.condition_notes || ''
      };

      console.log('📤 Updating booking:', bookingData);
      const response = await poolBookingService.update(selectedBooking.id, bookingData);
      
      if (response?.success) {
        setSuccessMessage('Booking updated successfully!');
        setShowEditModal(false);
        setSelectedBooking(null);
        resetForm();
        resetEditForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to update booking. Please try again.');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      setErrorMessage('Failed to update booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      const response = await poolBookingService.delete(selectedBooking.id);
      
      if (response?.success) {
        setSuccessMessage('Booking deleted successfully!');
        setShowDeleteConfirm(false);
        setSelectedBooking(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to delete booking. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      setErrorMessage('Failed to delete booking. Please try again.');
    }
  };

  const openEditModal = (booking) => {
    setSelectedBooking(booking);
    setEditFormData({
      vehicle_id: booking.vehicleId || booking.vehicle_id || '',
      driver_id: booking.driverId || booking.driver_id || '',
      booked_by: booking.bookedById || booking.booked_by || '',
      purpose: booking.purpose || '',
      start_time: booking.startTime || booking.start_time || '',
      end_time: booking.endTime || booking.end_time || '',
      status: booking.status || 'pending',
      handover_odometer: booking.handoverOdometer || booking.handover_odometer || '',
      return_odometer: booking.returnOdometer || booking.return_odometer || '',
      condition_notes: booking.conditionNotes || booking.condition_notes || ''
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (booking) => {
    setSelectedBooking(booking);
    setShowDeleteConfirm(true);
  };

  // ============================================
  // FILTER BOOKINGS
  // ============================================
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      (getVehicleLabel(booking.vehicleId || booking.vehicle_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getDriverName(booking.driverId || booking.driver_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ============================================
  // RENDER OVERVIEW
  // ============================================
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Vehicles</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">In Use</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inUse}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Utilization</p>
          <p className="text-2xl font-bold text-purple-600">{stats.utilizationRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarIcon size={16} /> Booking Calendar - {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">‹</button>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">›</button>
            </div>
          </h4>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={`day-${index}`} className="font-bold text-gray-500 py-1">{day}</div>
              ))}
              {Array.from({ length: getDaysInMonth(selectedDate).firstDay === 0 ? 6 : getDaysInMonth(selectedDate).firstDay - 1 }, (_, i) => (
                <div key={`empty-${i}`} className="py-1"></div>
              ))}
              {Array.from({ length: getDaysInMonth(selectedDate).days }, (_, i) => {
                const day = i + 1;
                const isBookedDay = isBooked(day);
                return (
                  <div key={`day-${day}`} className={`py-1 rounded text-xs transition-colors ${
                    isBookedDay ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-green-50 text-gray-700'
                  }`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-100"></div><span>Booked</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-50"></div><span>Available</span></div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock size={16} /> Active Bookings
          </h4>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {bookings.filter(b => b.status === 'active' || b.status === 'approved').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Car size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No active bookings</p>
              </div>
            ) : (
              bookings.filter(b => b.status === 'active' || b.status === 'approved').map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Car size={14} className="text-gray-600" />
                      <p className="font-medium text-sm">{getVehicleLabel(booking.vehicleId || booking.vehicle_id)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{getDriverName(booking.driverId || booking.driver_id)} · {booking.purpose}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {booking.startTime || booking.start_time ? new Date(booking.startTime || booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium mb-3">Pool Vehicles Status</h4>
        {poolVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {poolVehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-gray-600" />
                    <p className="font-medium text-sm">{vehicle.name || vehicle.id}</p>
                  </div>
                  <p className="text-xs text-gray-500">{vehicle.type || 'Unknown'} · {vehicle.capacity || 'N/A'}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(vehicle.status)}`}>
                  {getStatusIcon(vehicle.status)}
                  {getStatusLabel(vehicle.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No pool vehicles available</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER BOOKINGS VIEW
  // ============================================
  const renderBookingsView = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search bookings..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Filter size={14} /> Filters
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> New Booking
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              {statuses.map(s => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Vehicles</option>
              {poolVehicles.map(pv => (
                <option key={pv.id} value={pv.id}>{pv.name || pv.id}</option>
              ))}
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredBookings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Vehicle</th>
                <th className="p-3 hidden sm:table-cell">Driver</th>
                <th className="p-3">Purpose</th>
                <th className="p-3 hidden md:table-cell">Date</th>
                <th className="p-3 hidden lg:table-cell">Time</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{getVehicleLabel(booking.vehicleId || booking.vehicle_id)}</td>
                  <td className="p-3 text-sm hidden sm:table-cell">{getDriverName(booking.driverId || booking.driver_id)}</td>
                  <td className="p-3 text-sm">{booking.purpose}</td>
                  <td className="p-3 text-sm hidden md:table-cell">
                    {booking.startTime || booking.start_time ? new Date(booking.startTime || booking.start_time).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-3 text-sm hidden lg:table-cell">
                    {booking.startTime || booking.start_time ? new Date(booking.startTime || booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(booking)}
                        className="p-1 hover:bg-gray-200 rounded text-blue-600"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => openDeleteConfirm(booking)}
                        className="p-1 hover:bg-gray-200 rounded text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Car size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No bookings found</p>
          <p className="text-sm">Click "New Booking" to create your first booking</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER HISTORY VIEW
  // ============================================
  const renderHistoryView = () => {
    const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
    
    return (
      <div>
        <h4 className="font-semibold text-sm mb-4">Booking History</h4>
        {completedBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No completed bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-gray-600" />
                    <p className="font-medium text-sm">{getVehicleLabel(booking.vehicleId || booking.vehicle_id)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{getDriverName(booking.driverId || booking.driver_id)} · {booking.purpose}</p>
                  <p className="text-xs text-gray-400">
                    {booking.startTime || booking.start_time ? new Date(booking.startTime || booking.start_time).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="text-right mt-2 sm:mt-0">
                  {(booking.handoverOdometer || booking.handover_odometer) > 0 && (
                    <p className="text-xs text-gray-500">Odometer: {booking.handoverOdometer || booking.handover_odometer} → {booking.returnOdometer || booking.return_odometer || 'N/A'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER ANALYTICS VIEW
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold">{stats.totalBookings}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeBookings}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.completedBookings}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Utilization Rate</p>
          <p className="text-2xl font-bold text-purple-600">{stats.utilizationRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Vehicle Usage</h5>
          {poolVehicles.length > 0 ? (
            <div className="space-y-2">
              {poolVehicles.map((vehicle) => {
                const usage = bookings.filter(b => 
                  (b.vehicleId || b.vehicle_id) === vehicle.id && 
                  (b.status === 'active' || b.status === 'approved' || b.status === 'completed')
                ).length;
                const maxUsage = Math.max(1, ...poolVehicles.map(pv => 
                  bookings.filter(b => (b.vehicleId || b.vehicle_id) === pv.id && (b.status === 'active' || b.status === 'approved' || b.status === 'completed')).length
                ));
                return (
                  <div key={vehicle.id}>
                    <div className="flex justify-between text-sm">
                      <span>{vehicle.name || vehicle.id}</span>
                      <span className="font-medium">{usage} bookings</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${usage > maxUsage * 0.6 ? 'bg-green-500' : usage > maxUsage * 0.3 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                           style={{ width: `${(usage / maxUsage) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No vehicle data available</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Booking Status Distribution</h5>
          {stats.totalBookings > 0 ? (
            <div className="space-y-2">
              {statuses.map((status) => {
                const count = bookings.filter(b => b.status === status).length;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm">
                      <span>{getStatusLabel(status)}</span>
                      <span className="font-medium">{count} ({Math.round((count / stats.totalBookings) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${status === 'active' || status === 'approved' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : status === 'completed' ? 'bg-blue-500' : 'bg-red-500'}`} 
                           style={{ width: `${(count / stats.totalBookings) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No booking data available</p>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showAddModal;
    const data = isEdit ? editFormData : formData;
    const setData = isEdit ? setEditFormData : setFormData;
    const handleSubmit = isEdit ? handleEditBooking : handleAddBooking;
    const closeModal = () => {
      if (isEdit) {
        setShowEditModal(false);
        resetEditForm();
      } else {
        setShowAddModal(false);
        resetForm();
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Booking' : 'New Booking'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update booking details' : 'Create a new pool vehicle booking'}
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.vehicle_id}
                  onChange={(e) => setData({...data, vehicle_id: e.target.value})}
                >
                  <option value="">Select Vehicle</option>
                  {poolVehicles.map(pv => (
                    <option key={pv.id} value={pv.id}>
                      {pv.name || pv.id} - {pv.type || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.driver_id}
                  onChange={(e) => setData({...data, driver_id: e.target.value})}
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booked By</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of person booking"
                  value={data.booked_by}
                  onChange={(e) => setData({...data, booked_by: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Purpose of booking"
                  value={data.purpose}
                  onChange={(e) => setData({...data, purpose: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.start_time}
                  onChange={(e) => setData({...data, start_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.end_time}
                  onChange={(e) => setData({...data, end_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.status}
                  onChange={(e) => setData({...data, status: e.target.value})}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handover Odometer</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  value={data.handover_odometer}
                  onChange={(e) => setData({...data, handover_odometer: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Odometer</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  value={data.return_odometer}
                  onChange={(e) => setData({...data, return_odometer: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition Notes</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Vehicle condition notes..."
                  value={data.condition_notes}
                  onChange={(e) => setData({...data, condition_notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Booking' : 'Create Booking'}
              </button>
              <button 
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedBooking) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Booking?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteBooking}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading pool data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold">Pool Vehicle Management</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage shared vehicle bookings and availability</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> New Booking
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: CalendarIcon },
            { id: 'bookings', label: 'Bookings', icon: Clock },
            { id: 'history', label: 'History', icon: CheckCircle },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 sm:gap-2 ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'bookings' && renderBookingsView()}
        {activeTab === 'history' && renderHistoryView()}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>

      {/* Modals */}
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
    </div>
  );
};

export default PoolVehicles;