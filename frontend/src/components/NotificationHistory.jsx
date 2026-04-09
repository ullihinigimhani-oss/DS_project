/**
 * NotificationHistory Component
 * 
 * Displays a paginated or listed history of user notifications. Validates against a 
 * backend API using the user's JWT. Supports filtering by notification type.
 * 
 * @param {Object} props
 * @param {string} props.userId - The ID of the logged-in user whose notifications should be fetched.
 */
import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const BellIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="M10.27 21a2 2 0 0 0 3.46 0" />
    <path d="M3.26 15a1 1 0 0 0 .74 1.71h16a1 1 0 0 0 .74-1.71C19.41 13.55 18 11.24 18 8a6 6 0 1 0-12 0c0 3.24-1.41 5.55-2.74 7Z" />
  </svg>
);

const CalendarIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const CreditCardIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h2" />
  </svg>
);

const StethoscopeIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" />
    <path d="M6 3H4M14 3h2" />
    <path d="M12 12v3a4 4 0 1 0 8 0v-1" />
    <circle cx="20" cy="13" r="2" />
  </svg>
);

const NotificationHistory = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Appointments, Payments, Consultations

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

        const response = await fetch(`${baseUrl}/notifications/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch notifications: ${response.status}`);
        }

        const data = await response.json();

        // Ensure it handles returning response.data or response.data.notifications
        setNotifications(data?.notifications || data || []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchNotifications();
  }, [userId]);

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'All') return true;
    // Map plural tabs correctly
    if (filter === 'Appointments') return notif.type === 'Appointment';
    if (filter === 'Payments') return notif.type === 'Payment';
    if (filter === 'Consultations') return notif.type === 'Consultation';
    return notif.type === filter;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'Appointment': return <CalendarIcon className="w-5 h-5 text-blue-600" />;
      case 'Payment': return <CreditCardIcon className="w-5 h-5 text-green-600" />;
      case 'Consultation': return <StethoscopeIcon className="w-5 h-5 text-purple-600" />;
      default: return <BellIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'Appointment': return 'bg-blue-100 text-blue-700';
      case 'Payment': return 'bg-green-100 text-green-700';
      case 'Consultation': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white min-h-screen">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BellIcon className="w-8 h-8 text-blue-600" />
          Notification History
        </h1>
        <p className="text-gray-500 mt-2">Manage and view your past alerts, appointments, and activity.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 mb-6 pb-2 scrollbar-hide">
        {['All', 'Appointments', 'Payments', 'Consultations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'All' ? 'All Notifications' : tab}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          // Skeleton Loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-xl border border-gray-100 bg-gray-50 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredNotifications.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200 mt-4">
            <BellIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No notifications yet</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              We'll let you know when you have new appointments, messages, or updates regarding your consultations.
            </p>
          </div>
        ) : (
          // Loaded Cards
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id || Math.random()} 
              className="group flex gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:bg-blue-50/50 hover:border-blue-100 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors border border-gray-100">
                {getIconForType(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${getBadgeColor(notif.type)}`}>
                    {notif.type || 'System'}
                  </span>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : 'Unknown time'}
                  </span>
                </div>
                
                <p className="text-gray-800 mt-2 text-sm leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationHistory;
