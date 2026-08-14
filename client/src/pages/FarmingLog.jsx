import { useEffect, useState, useMemo } from 'react';
import { 
  Sprout, 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  BookOpen, 
  List, 
  Tag,
  Cloud,
  CloudRain,
  Sun,
  CloudLightning,
  CloudSnow,
  CloudDrizzle,
  MapPin,
  Loader2
} from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';

// WMO Weather Code Mapper to Icons and Descriptions
const getWeatherDetails = (code) => {
  switch (code) {
    case 0:
      return { icon: Sun, label: 'Clear Sky', color: 'text-amber-500', isRainy: false };
    case 1:
    case 2:
    case 3:
      return { icon: Cloud, label: 'Partly Cloudy', color: 'text-slate-400', isRainy: false };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { icon: CloudDrizzle, label: 'Drizzle', color: 'text-sky-400', isRainy: true };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return { icon: CloudRain, label: 'Rain', color: 'text-sky-600', isRainy: true };
    case 71:
    case 73:
    case 75:
    case 77:
      return { icon: CloudSnow, label: 'Snow', color: 'text-blue-300', isRainy: false };
    case 80:
    case 81:
    case 82:
      return { icon: CloudRain, label: 'Rain Showers', color: 'text-sky-600', isRainy: true };
    case 95:
    case 96:
    case 99:
      return { icon: CloudLightning, label: 'Thunderstorm', color: 'text-purple-600', isRainy: true };
    default:
      return { icon: Cloud, label: 'Cloudy', color: 'text-slate-400', isRainy: false };
  }
};

export default function FarmingLog() {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'ledger'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Weather States
  const [weatherMap, setWeatherMap] = useState({});
  const [locationName, setLocationName] = useState('Local Farm');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Expanded Diary Form State
  const [formData, setFormData] = useState({
    field_name: '',
    activity_type: 'Planting & Sowing',
    description: '',
    inputs_used: '',
    log_date: new Date().toISOString().split('T')[0],
    log_time: '08:00',
    estimated_harvest_date: '',
    status: 'Completed'
  });

  // Fetch Farm Logs
  useEffect(() => {
    API.get('/farm_logs/')
      .then((res) => setLogs(res.data))
      .catch(() => {
        const today = new Date().toISOString().split('T')[0];
        setLogs([
          { 
            id: 1, 
            field_name: 'Block A - Greenhouse', 
            activity_type: 'Weeding & Pruning', 
            description: 'Removed lateral shoots from tomato vines to encourage fruiting.', 
            logged_at: `${today}T08:30:00Z`, 
            log_date: today,
            status: 'Completed',
            inputs_used: 'Pruning shears, Organic spray' 
          },
          { 
            id: 2, 
            field_name: 'Hillside Section', 
            activity_type: 'Fertilizer Application', 
            description: 'Apply organic NPK compost around young avocado drip lines.', 
            logged_at: `${today}T14:00:00Z`, 
            log_date: today,
            status: 'Scheduled',
            inputs_used: 'Organic NPK 50kg' 
          },
          { 
            id: 3, 
            field_name: 'Main Field B', 
            activity_type: 'Irrigation & Watering', 
            description: 'Deep drip cycle for maize seedlings.', 
            logged_at: '2026-08-15T06:00:00Z', 
            log_date: '2026-08-15',
            status: 'Scheduled',
            estimated_harvest_date: '2026-11-20'
          }
        ]);
      });
  }, []);

  // Fetch Geolocation & Forecast Data (Open-Meteo)
  useEffect(() => {
    const fetchForecast = async (lat, lon) => {
      setIsLoadingWeather(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.daily) {
          const map = {};
          data.daily.time.forEach((dateStr, idx) => {
            map[dateStr] = {
              code: data.daily.weather_code[idx],
              tempMax: Math.round(data.daily.temperature_2m_max[idx]),
              tempMin: Math.round(data.daily.temperature_2m_min[idx]),
              precipitation: data.daily.precipitation_sum[idx],
              precipProb: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[idx] : null
            };
          });
          setWeatherMap(map);
        }
      } catch (err) {
        console.error('Failed to load weather forecast:', err);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationName(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
          fetchForecast(latitude, longitude);
        },
        () => {
          // Default fallback coordinates (e.g., Nairobi / Regional default)
          fetchForecast(-1.286389, 36.817223);
          setLocationName('Default Coordinates');
        }
      );
    } else {
      fetchForecast(-1.286389, 36.817223);
    }
  }, []);

  // Calendar Calculation Helpers
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    const firstDayIndex = date.getDay();
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    while (date.getMonth() === month) {
      const dateStr = date.toISOString().split('T')[0];
      days.push(dateStr);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  // Map dates to log items
  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const d = log.log_date || (log.logged_at ? log.logged_at.split('T')[0] : null);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(log);
      }
      if (log.estimated_harvest_date) {
        if (!map[log.estimated_harvest_date]) map[log.estimated_harvest_date] = [];
        map[log.estimated_harvest_date].push({ ...log, isHarvestTarget: true });
      }
    });
    return map;
  }, [logs]);

  const selectedDateLogs = useMemo(() => {
    return logsByDate[selectedDate] || [];
  }, [logsByDate, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await API.post('/farm_logs/', formData);
      setLogs((prev) => [res.data, ...prev]);
      setIsModalOpen(false);
    } catch (err) {
      const localMock = { 
        ...formData, 
        id: Date.now(), 
        logged_at: `${formData.log_date}T${formData.log_time}:00Z` 
      };
      setLogs((prev) => [localMock, ...prev]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'Irrigation & Watering':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Fertilizer Application':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Planting & Sowing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Weeding & Pruning':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const selectedDayWeather = weatherMap[selectedDate];

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto pb-16 animate-fade-in">
      <Navbar title="Farmer's Diary & Activity Scheduler" />

      {/* Diary Control Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Cultivation Documentation Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan schedules, record daily logs, and track harvest dates with live weather integration</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold border border-slate-200/60">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5 text-emerald-600" />
              Timeline
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Calendar Card */}
          <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            
            {/* Header Controls */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  {locationName}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition border border-slate-200/60"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setCurrentMonth(new Date());
                    setSelectedDate(todayStr);
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition border border-slate-200/60"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Row */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-xs">
              {daysInMonth.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`empty-${idx}`} className="h-20 sm:h-24 bg-slate-50/50 rounded-xl" />;
                }

                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const dayLogs = logsByDate[dateStr] || [];
                const dayWeather = weatherMap[dateStr];

                const weatherInfo = dayWeather ? getWeatherDetails(dayWeather.code) : null;
                const WeatherIcon = weatherInfo ? weatherInfo.icon : null;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-20 sm:h-24 p-2 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                        : isToday
                        ? 'border-slate-300 bg-slate-50/80 hover:border-slate-400'
                        : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-lg font-extrabold text-[11px] transition-colors ${
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Log Entry Count Badge */}
                      {dayLogs.length > 0 && (
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          {dayLogs.length}
                        </span>
                      )}
                    </div>

                    {/* Weather Icon & Rain Badge */}
                    {weatherInfo && (
                      <div className="my-0.5 flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          <WeatherIcon className={`w-3.5 h-3.5 ${weatherInfo.color}`} />
                          <span className="text-[10px] font-bold text-slate-600 hidden sm:inline">
                            {dayWeather.tempMax}°
                          </span>
                        </div>

                        {weatherInfo.isRainy && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-100 text-sky-800">
                            {dayWeather.precipitation ? `${dayWeather.precipitation}mm` : 'Rain'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Micro Indicators / Badges */}
                    <div className="w-full space-y-1">
                      {dayLogs.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {dayLogs.slice(0, 2).map((item, i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                item.isHarvestTarget
                                  ? 'bg-amber-500'
                                  : item.status === 'Scheduled'
                                  ? 'bg-sky-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Harvest
              </span>
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                Rain Forecast
              </span>
            </div>
          </div>

          {/* Daily Schedule & Details Drawer */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            <div className="border-b border-slate-100 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Selected Schedule</span>
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                  {new Date(selectedDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {selectedDateLogs.length} {selectedDateLogs.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </div>

            {/* Weather Card for Selected Date */}
            {isLoadingWeather ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Loading forecast...</span>
              </div>
            ) : selectedDayWeather ? (
              (() => {
                const info = getWeatherDetails(selectedDayWeather.code);
                const Icon = info.icon;
                return (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    info.isRainy ? 'bg-sky-50/80 border-sky-200/80' : 'bg-slate-50 border-slate-200/70'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-xs">
                        <Icon className={`w-6 h-6 ${info.color}`} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{info.label}</h4>
                        <p className="text-[11px] text-slate-500">
                          {selectedDayWeather.tempMin}°C - {selectedDayWeather.tempMax}°C
                        </p>
                      </div>
                    </div>

                    {selectedDayWeather.precipitation > 0 && (
                      <div className="text-right">
                        <span className="text-xs font-bold text-sky-700 block">
                          {selectedDayWeather.precipitation} mm
                        </span>
                        <span className="text-[10px] font-semibold text-sky-600">
                          {selectedDayWeather.precipProb !== null ? `${selectedDayWeather.precipProb}% rain chance` : 'Precipitation'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 text-center">
                7-day forecast available for upcoming dates
              </div>
            )}

            {/* Selected Date Entries */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {selectedDateLogs.length > 0 ? (
                selectedDateLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2.5 hover:bg-slate-50 transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getActivityBadge(log.activity_type)}`}>
                        {log.activity_type}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {log.log_time || '08:00 AM'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{log.field_name}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.description}</p>
                    </div>

                    {log.inputs_used && (
                      <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>Inputs: <strong className="text-slate-800">{log.inputs_used}</strong></span>
                      </div>
                    )}

                    {log.estimated_harvest_date && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 font-semibold flex items-center gap-2">
                        <Sprout className="w-4 h-4 shrink-0 text-amber-600" />
                        Target Harvest: {new Date(log.estimated_harvest_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl space-y-2.5">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">No scheduled entries or notes logged for this date.</p>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, log_date: selectedDate }));
                      setIsModalOpen(true);
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline inline-block mt-1 cursor-pointer"
                  >
                    + Add entry for this date
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Sequential Diary Timeline View */
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Historical & Scheduled Activities Log</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Total Entries: {logs.length}
            </span>
          </div>

          <div className="space-y-3">
            {logs.map((log) => {
              const formattedDate = log.log_date || (log.logged_at ? log.logged_at.split('T')[0] : 'Recent');

              return (
                <div key={log.id} className="p-4 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 transition space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                        <Sprout className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{log.activity_type}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getActivityBadge(log.activity_type)}`}>
                            {log.status || 'Completed'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 font-bold mt-0.5">{log.field_name}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {log.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1 font-medium">
                    {log.inputs_used && (
                      <span>Materials: <strong className="text-slate-800">{log.inputs_used}</strong></span>
                    )}
                    {log.estimated_harvest_date && (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                        Est. Harvest: {log.estimated_harvest_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Entry Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Diary Entry or Schedule Activity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Date</label>
              <input
                type="date"
                required
                value={formData.log_date}
                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="Completed">Completed (Past/Current)</option>
                <option value="Scheduled">Scheduled (Future Task)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Field / Plot Location</label>
            <input
              type="text"
              required
              placeholder="e.g. Greenhouse Block A or Upper Field"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Activity Category</label>
              <select
                value={formData.activity_type}
                onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="Planting & Sowing">Planting & Sowing</option>
                <option value="Harvesting">Harvesting</option>
                <option value="Pruning">Pruning</option>
                <option value="Weeding">Weeding</option>
                <option value="Pest Control">Pest and Disease Control</option>
                <option value="Fungicide Application">Fungicide and Herbicide Application</option>
                <option value="Fertilizer Application">Fertilizer Application</option>
                <option value="Irrigation & Watering">Irrigation & Watering</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Harvest Date</label>
              <input
                type="date"
                value={formData.estimated_harvest_date}
                onChange={(e) => setFormData({ ...formData, estimated_harvest_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Inputs / Materials Used</label>
            <input
              type="text"
              placeholder="e.g. Organic NPK, drip lines, seeds batch #402"
              value={formData.inputs_used}
              onChange={(e) => setFormData({ ...formData, inputs_used: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Detailed Diary Notes</label>
            <textarea
              rows="3"
              required
              placeholder="Record observations, weather conditions, or specific task notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Saving to Diary...' : 'Save Diary Entry'}
          </button>
        </form>
      </Modal>
    </div>
  );
}