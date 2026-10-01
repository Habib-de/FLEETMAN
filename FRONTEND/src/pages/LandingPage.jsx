import React, { useState, useEffect } from 'react';
import { 
  Truck, Shield, BarChart3, Users, Clock, Zap,
  CheckCircle, Star, ChevronRight, Menu, X,
  Map, Fuel, Wrench, AlertTriangle, Phone,
  Play, Award, Globe, Settings, Smartphone,
  ArrowRight, Quote, Sparkles, TrendingUp,
  Layers, Activity, Database, Cloud, Lock,
  Headphones, FileText, Video, 
  ExternalLink, ArrowUpRight, Mail, MapPin,
  Calendar, Send, User, Building, MessageSquare,
  Circle, CircleDot, Gauge, Navigation, Camera,
  Signal, Cpu, CloudLightning, Target, DollarSign,
  Heart, ShieldCheck, Server, BadgeCheck, Link, Zap as ZapIcon
} from 'lucide-react';
import { demoService } from '../services/demoService';

// ============================================
// ENHANCED DEMO BOOKING MODAL
// ============================================
const DemoBookingModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  isSubmitting, 
  formSuccess 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 z-10 hover:rotate-90"
        >
          <X size={24} className="text-gray-500 hover:text-gray-700" />
        </button>

        <div className="relative overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-8 rounded-t-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calendar size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Book a Demo</h2>
                <p className="text-blue-100 text-sm">Get a personalized walkthrough of FLEETMAN</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {formSuccess ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 mx-auto flex items-center justify-center mb-6 shadow-lg shadow-green-200 animate-bounceIn">
                <CheckCircle size={48} className="text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">Demo Request Sent!</h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Our team will reach out within 24 hours to schedule your personalized demo.
              </p>
              <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
                  <Mail size={18} /> Confirmation sent to {formData.email}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      placeholder="john@company.com"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="tel"
                      placeholder="+27 82 123 4567"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Your Company"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Fleet Size
                  </label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none bg-white"
                    value={formData.fleetSize}
                    onChange={(e) => setFormData({...formData, fleetSize: e.target.value})}
                  >
                    <option value="">Select fleet size</option>
                    <option value="1-10">1 - 10 vehicles</option>
                    <option value="11-50">11 - 50 vehicles</option>
                    <option value="51-100">51 - 100 vehicles</option>
                    <option value="101-500">101 - 500 vehicles</option>
                    <option value="500+">500+ vehicles</option>
                  </select>
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Preferred Date
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({...formData, preferredDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Preferred Time
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none bg-white"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({...formData, preferredTime: e.target.value})}
                >
                  <option value="">Select preferred time</option>
                  <option value="morning">Morning (8 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
                  <option value="evening">Evening (4 PM - 6 PM)</option>
                </select>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Message / Requirements
                </label>
                <div className="relative">
                  <MessageSquare size={18} className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <textarea
                    rows="3"
                    placeholder="Tell us about your fleet management needs..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 outline-none resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Book Demo
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-2">
                By submitting, you agree to our Privacy Policy. We'll contact you within 24 hours.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN LANDING PAGE COMPONENT
// ============================================
const LandingPage = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [email, setEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // ============================================
  // SCROLL ANIMATION - NAVBAR
  // ============================================
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ============================================
  // SCROLL ANIMATION FOR ELEMENTS
  // ============================================
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // ============================================
  // DEMO BOOKING FORM STATE
  // ============================================
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    fleetSize: '',
    message: '',
    preferredDate: '',
    preferredTime: ''
  });

  // ============================================
  // HANDLE FORM SUBMIT
  // ============================================
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.email || !formData.company) {
      alert('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await demoService.bookDemo(formData);
      setFormSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        fleetSize: '',
        message: '',
        preferredDate: '',
        preferredTime: ''
      });

      setTimeout(() => {
        setShowDemoModal(false);
        setFormSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending demo request:', error);
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HANDLE NEWSLETTER SUBMIT
  // ============================================
  const handleNewsletterSubmit = (e) => {
  e.preventDefault();
  if (email) {
    // ✅ Include the user's email in the email body
    window.location.href = `mailto:xabiiib0790@gmail.com?subject=FLEETMAN%20Newsletter%20Subscription&body=New%20subscriber%3A%20${encodeURIComponent(email)}%0A%0AHi%20FLEETMAN%20Team%2C%0AI%27d%20like%20to%20subscribe%20to%20your%20newsletter.%0A%0AThank%20you!`;
    setNewsletterSubmitted(true);
    setTimeout(() => setNewsletterSubmitted(false), 3000);
  }
};

  // ============================================
  // ENHANCED FEATURES DATA
  // ============================================
  const features = [
    { 
      icon: <Navigation className="w-8 h-8" />,
      title: 'Real-Time Tracking',
      description: 'Live GPS tracking with route history and geofencing alerts for complete visibility.',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      icon: <Shield className="w-8 h-8" />,
      title: 'Driver Safety Score',
      description: 'AI-powered driver monitoring with safety scores and automated coaching alerts.',
      color: 'green',
      gradient: 'from-green-500 to-emerald-600'
    },
    { 
      icon: <Gauge className="w-8 h-8" />,
      title: 'Performance Analytics',
      description: 'Comprehensive dashboards showing fuel efficiency, idle time, and cost metrics.',
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600'
    },
    { 
      icon: <Fuel className="w-8 h-8" />,
      title: 'Fuel Optimization',
      description: 'Track consumption patterns, identify waste, and reduce fuel costs significantly.',
      color: 'orange',
      gradient: 'from-orange-500 to-amber-600'
    },
    { 
      icon: <Wrench className="w-8 h-8" />,
      title: 'Smart Maintenance',
      description: 'Predictive maintenance alerts based on usage, mileage, and engine diagnostics.',
      color: 'red',
      gradient: 'from-red-500 to-rose-600'
    },
    { 
      icon: <Users className="w-8 h-8" />,
      title: 'Driver Management',
      description: 'Complete driver profiles with license tracking, training records, and performance.',
      color: 'teal',
      gradient: 'from-teal-500 to-cyan-600'
    },
  ];

  // ============================================
  // SOLUTIONS DATA
  // ============================================
  const solutions = [
    {
      icon: <Truck className="w-8 h-8" />,
      title: 'Small Fleets',
      description: 'Perfect for 5-20 vehicles. Get started quickly with essential tracking and management features.',
      color: 'blue',
      features: ['Real-time tracking', 'Basic reporting', 'Driver management', 'Email support']
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: 'Medium Enterprises',
      description: 'For 20-100 vehicles. Advanced analytics, driver management, and maintenance scheduling.',
      color: 'purple',
      features: ['Advanced analytics', 'Maintenance scheduling', 'Fuel optimization', 'Priority support']
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Large Corporations',
      description: '100+ vehicles. Multi-site support, custom integrations, white-label options, and dedicated support.',
      color: 'green',
      features: ['White-label options', 'Custom integrations', 'Dedicated support', 'SLA guarantee']
    }
  ];

  // ============================================
  // TRUST BADGES - ONLY 4
  // ============================================
  const trustBadges = [
    { icon: <ShieldCheck className="w-6 h-6 text-green-500" />, label: 'SOC 2 Compliant' },
    { icon: <Lock className="w-6 h-6 text-green-500" />, label: 'Bank-Grade Security' },
    { icon: <Server className="w-6 h-6 text-green-500" />, label: '99.9% Uptime' },
    { icon: <Headphones className="w-6 h-6 text-green-500" />, label: '24/7 Support' },
  ];

  // ============================================
  // GET COLOR CLASSES
  // ============================================
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
      orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
      red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
      teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    };
    return colors[color] || colors.blue;
  };

  const getSolutionColor = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      purple: 'bg-purple-50 text-purple-600',
      green: 'bg-green-50 text-green-600',
    };
    return colors[color] || colors.blue;
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ============================================ */}
      {/* ENHANCED NAVIGATION WITH BIGGER LOGO */}
      {/* ============================================ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
  scrolled 
    ? 'bg-gray-300/95 backdrop-blur-xl shadow-lg border-b border-gray-400/50' 
    : 'bg-gray-300/90 backdrop-blur-sm shadow-sm'
}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => onNavigate('landing')}
            >
              <img src="/lgo2.png" alt="FLEETMAN" className="h-10 w-auto md:h-12 lg:h-14 object-contain" />
              {/* <div>
                <span className="text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  FLEET<span className="text-yellow-600">MAN</span>
                </span>
              </div> */}
            </div>

            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Solutions', 'Testimonials', 'Pricing'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`} 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => onNavigate('login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-100"
              >
                Login
              </button>
              <button 
                onClick={() => onNavigate('register')}
                className="relative group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-xl hover:shadow-blue-200 transform hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
              </button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} className="text-gray-600" /> : <Menu size={24} className="text-gray-600" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl animate-slideDown">
            <div className="px-4 py-4 space-y-3">
              {['Features', 'Solutions', 'Testimonials', 'Pricing'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded-lg px-3 transition-colors">
                  {item}
                </a>
              ))}
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                <button 
                  onClick={() => onNavigate('login')}
                  className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => onNavigate('register')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-200"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================ */}
      {/* ENHANCED HERO SECTION - CLEAN VIDEO */}
      {/* ============================================ */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fadeInUp">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                Fleet Management
                <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-6xl">
                  Made Simple & Smart
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-gray-600 max-w-lg leading-relaxed">
                Track your vehicles in real-time, monitor driver performance, and optimize operations with our all-in-one fleet management platform.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={() => onNavigate('register')}
                  className="relative group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-3.5 rounded-2xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200 transform hover:-translate-y-0.5 flex items-center gap-2 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free Trial
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                </button>
                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="group bg-white border-2 border-gray-200 text-gray-700 px-10 py-3.5 rounded-2xl text-sm font-semibold hover:border-blue-500 hover:text-blue-600 transition-all duration-300 hover:shadow-xl flex items-center gap-2"
                >
                  <Calendar size={18} className="group-hover:rotate-12 transition-transform" /> Book a Demo
                </button>
              </div>
            </div>

            {/* Clean Video - No Card/Container */}
            <div className="relative animate-fadeInRight">
              <video 
                src="/fletman.mp4"
                controls
                autoPlay
                muted
                loop
                className="w-full rounded-2xl shadow-2xl aspect-video object-cover"
                poster="/logo.png"
              >
                <p className="text-gray-500 text-sm">Your browser does not support the video tag.</p>
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TRUST BADGES - 4 BADGES FIT DYNAMICALLY */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeInUp">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 justify-center">
              {badge.icon}
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* FULL WIDTH LOGO & NAME SECTION */}
      {/* ============================================ */}
      <section className="py-20 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-y border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-6 mb-6">
              <img src="/lgo2.png" alt="FLEETMAN" className="h-32 w-auto md:h-40 lg:h-48 animate-float" />
              {/* <div className="flex flex-col items-start">
                <span className="text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 tracking-tight">
                  FLEET<span className="text-yellow-600">MAN</span>
                </span>
                <span className="text-lg md:text-2xl text-gray-600 font-light mt-1 tracking-wider">
                  Fleet Management Solutions
                </span>
              </div> */}
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            <p className="mt-6 text-gray-600 max-w-2xl text-base md:text-lg">
              Empowering businesses with intelligent fleet tracking, driver safety, and operational efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ENHANCED FEATURES SECTION */}
      {/* ============================================ */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 mb-4">
              <Sparkles size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Platform Features</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Everything You Need to <span className="text-blue-600">Manage Your Fleet</span></h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto text-lg">
              Powerful tools designed to help you track, monitor, and optimize your fleet operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setActiveFeature(i)}
                onMouseLeave={() => setActiveFeature(null)}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="mt-2.5 text-gray-600 leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center gap-1 text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 -translate-x-2">
                  Learn More <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOLUTIONS SECTION */}
      {/* ============================================ */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-1.5 rounded-full border border-green-100 mb-4">
              <Layers size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-600">Solutions</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Built for <span className="text-blue-600">Every Fleet</span></h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto text-lg">
              Whether you manage a small fleet or a large enterprise, FLEETMAN has you covered
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {solutions.map((solution, i) => (
              <div 
                key={i} 
                className="group bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-200"
              >
                <div className={`w-14 h-14 ${getSolutionColor(solution.color)} rounded-2xl flex items-center justify-center mb-4`}>
                  {solution.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{solution.title}</h3>
                <p className="mt-2 text-gray-600">{solution.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-500">
                  {solution.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="mt-6 text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 group"
                >
                  Learn More <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* INTEGRATIONS SECTION - REMOVED PLATFORMS */}
      {/* ============================================ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 mb-4">
              <Link size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Integrations</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Integrates With <span className="text-blue-600">Your Ecosystem</span></h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Connect FLEETMAN with the tools you already use. Seamless integration with your favorite business apps.
            </p>
          </div>
          <div className="text-center text-gray-400 text-sm">
            <p>Connect with your favorite business apps</p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PRICING SECTION - SIMPLE CONTACT INFO ONLY */}
      {/* ============================================ */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-100 mb-4">
              <DollarSign size={14} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Pricing</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent <span className="text-blue-600">Pricing</span></h2>
            <p className="mt-2 text-gray-600">
              Contact us directly for a personalized quote based on your fleet size and needs
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-10 border border-blue-100 shadow-sm">
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                <Phone size={20} className="text-blue-600" />
                📞 Contact Us for Pricing
              </h4>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-gray-700">
                <div className="flex items-center gap-2">
                  <Phone size={18} className="text-blue-600" />
                  <a href="tel:0741848348" className="font-medium text-lg hover:text-blue-600 transition-colors">
                    0741848348
                  </a>
                </div>
                <span className="hidden sm:block text-gray-300">|</span>
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-blue-600" />
                  <a href="mailto:xabiiib0790@gmail.com" className="font-medium text-lg text-blue-600 hover:underline">
                    xabiiib0790@gmail.com
                  </a>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock size={16} className="text-gray-400" />
                <span>We'll respond within 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ENHANCED TESTIMONIALS */}
      {/* ============================================ */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 mb-4">
              <MessageSquare size={14} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-600">Testimonials</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900">What Our <span className="text-blue-600">Customers Say</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote: "FLEETMAN has transformed how we manage our fleet. The real-time tracking and analytics have reduced our fuel costs by 23% in just 3 months.",
                author: "John Mokoena",
                role: "Fleet Manager",
                company: "TransLogistics SA",
                image: "https://ui-avatars.com/api/?name=John+Mokoena&background=2563eb&color=fff&size=60"
              },
              {
                quote: "The driver safety monitoring feature has been a game-changer. We've seen a 40% reduction in incidents since implementing the system.",
                author: "Sarah Khumalo",
                role: "Operations Director",
                company: "Transport Solutions Ltd",
                image: "https://ui-avatars.com/api/?name=Sarah+Khumalo&background=7c3aed&color=fff&size=60"
              },
              {
                quote: "The maintenance scheduling and fuel tracking have saved us thousands of rands per month. FLEETMAN pays for itself many times over.",
                author: "David Ndlovu",
                role: "Fleet Owner",
                company: "Ndlovu Logistics",
                image: "https://ui-avatars.com/api/?name=David+Ndlovu&background=059669&color=fff&size=60"
              },
              {
                quote: "I've tried many fleet management systems, but FLEETMAN is by far the most intuitive. My drivers love the mobile app, and I love the dashboard.",
                author: "Thandi Mbeki",
                role: "Operations Manager",
                company: "City Transport Services",
                image: "https://ui-avatars.com/api/?name=Thandi+Mbeki&background=dc2626&color=fff&size=60"
              }
            ].map((testimonial, i) => (
              <div 
                key={i} 
                className="group bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-2xl hover:border-blue-100 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.author} 
                    className="w-14 h-14 rounded-full border-2 border-white shadow-lg"
                  />
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                    <p className="text-xs text-blue-600 font-medium">{testimonial.company}</p>
                  </div>
                </div>
                <div className="relative">
                  <Quote size={32} className="text-blue-200 absolute -top-1 -left-1" />
                  <p className="text-gray-700 leading-relaxed pl-6">"{testimonial.quote}"</p>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {[1,2,3,4,5].map((_, idx) => (
                    <Star key={idx} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* NEWSLETTER / LEAD CAPTURE */}
      {/* ============================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-blue-100">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Stay Updated</h3>
          <p className="text-gray-600 mb-6">
            Get the latest fleet management insights, product updates, and exclusive offers.
          </p>
          {newsletterSubmitted ? (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-white px-6 py-4 rounded-xl shadow-sm border border-green-200">
              <CheckCircle size={20} />
              <span className="font-medium">Thanks for subscribing! Check your email.</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Mail size={18} /> Subscribe
              </button>
            </form>
          )}
          <p className="text-xs text-gray-400 mt-3">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* ENHANCED CTA SECTION */}
      {/* ============================================ */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 mb-6">
            <Sparkles size={14} className="text-white" />
            <span className="text-sm font-medium text-white">Start Your Free Trial Today</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Ready to Transform Your <span className="text-blue-200">Fleet Management?</span>
          </h2>
          <p className="mt-4 text-blue-100 text-lg max-w-2xl mx-auto">
            Join thousands of fleet managers who are already using FLEETMAN to save time and money.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => onNavigate('register')}
              className="group bg-white text-blue-600 px-10 py-3.5 rounded-2xl text-sm font-semibold hover:bg-gray-100 transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setShowDemoModal(true)}
              className="bg-white/10 backdrop-blur-sm text-white px-10 py-3.5 rounded-2xl text-sm font-semibold hover:bg-white/20 transition-all duration-300 border border-white/30 hover:border-white/50"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
{/* ENHANCED FOOTER */}
{/* ============================================ */}
<footer className="bg-amber-50 text-gray-700 py-16 px-4 sm:px-6 lg:px-8 border-t border-amber-200/50">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
      <div className="col-span-2 lg:col-span-1">
        <div className="flex flex-col items-start mb-4">
          <img src="/lgo2.png" alt="FLEETMAN" className="h-20 w-auto md:h-24 lg:h-28 object-contain mb-3" />
          <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
            Intelligent fleet management software for modern logistics companies.
          </p>
        </div>
        <div className="mt-6 flex items-center gap-3">
  <a href="#" className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center hover:bg-purple-600 transition-all duration-300 group border border-gray-600 hover:border-purple-400 shadow-sm">
    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/></svg>
  </a>
  <a href="#" className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center hover:bg-purple-600 transition-all duration-300 group border border-gray-600 hover:border-purple-400 shadow-sm">
    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M23.8 4.8c-.9.4-1.8.7-2.8.8 1-.6 1.8-1.6 2.2-2.7-.9.6-2 .9-3.1 1.1-.9-.9-2.1-1.5-3.5-1.5-2.7 0-4.8 2.2-4.8 4.8 0 .4 0 .8.1 1.1-4-.2-7.5-2.1-9.9-5-.4.7-.6 1.5-.6 2.4 0 1.7.8 3.2 2.1 4.1-.8 0-1.5-.2-2.1-.6v.1c0 2.4 1.7 4.3 3.9 4.8-.4.1-.8.2-1.2.2-.3 0-.6 0-.9-.1.6 1.9 2.4 3.3 4.6 3.3-1.7 1.3-3.8 2.1-6.1 2.1-.4 0-.8 0-1.2-.1 2.2 1.4 4.8 2.2 7.6 2.2 9.1 0 14.1-7.5 14.1-14.1 0-.2 0-.4 0-.6.9-.7 1.7-1.5 2.4-2.4z"/></svg>
  </a>
  <a href="#" className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center hover:bg-purple-600 transition-all duration-300 group border border-gray-600 hover:border-purple-400 shadow-sm">
    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c-5.4 0-9.8 4.4-9.8 9.8 0 4.3 2.8 7.9 6.7 9.3.5.1.7-.2.7-.5v-1.6c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.2-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.1 1.9 2.9 1.4 3.6 1.1.1-.9.5-1.4.9-1.7-2.8-.3-5.7-1.4-5.7-6.3 0-1.4.5-2.5 1.3-3.4-.1-.3-.6-1.6.1-3.3 0 0 1.1-.4 3.5 1.3 1-.3 2.1-.5 3.2-.5s2.2.2 3.2.5c2.4-1.6 3.5-1.3 3.5-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2 1.3 3.4 0 4.9-2.9 6-5.7 6.3.5.4.9 1.2.9 2.4v3.5c0 .3.2.6.7.5 3.9-1.4 6.7-5 6.7-9.3 0-5.4-4.4-9.8-9.8-9.8z"/></svg>
  </a>
</div>
      </div>
      <div>
        <h4 className="text-gray-800 font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#features" className="text-gray-600 hover:text-purple-600 transition-colors">Features</a></li>
          <li><a href="#pricing" className="text-gray-600 hover:text-purple-600 transition-colors">Pricing</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Integrations</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">API</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-gray-800 font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">About</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Careers</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Blog</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-gray-800 font-semibold mb-4 text-sm uppercase tracking-wider">Support</h4>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Help Center</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Documentation</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Community</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Status</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-gray-800 font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Privacy</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Terms</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Security</a></li>
          <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Cookies</a></li>
        </ul>
      </div>
    </div>
    <div className="mt-12 pt-8 border-t border-amber-200/50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
      <p className="text-gray-600">&copy; 2026 FLEETMAN. All rights reserved.</p>
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1 text-green-600">
          <Signal size={12} className="fill-green-600" />
          All systems operational
        </span>
        <span className="flex items-center gap-1 text-purple-600">
          <ShieldCheck size={12} />
          Secure
        </span>
      </div>
    </div>
  </div>
</footer>

      {/* ============================================ */}
      {/* DEMO BOOKING MODAL */}
      {/* ============================================ */}
      <DemoBookingModal 
        isOpen={showDemoModal}
        onClose={() => {
          setShowDemoModal(false);
          setFormSuccess(false);
        }}
        onSubmit={handleFormSubmit}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        formSuccess={formSuccess}
      />

      {/* ============================================ */}
      {/* GLOBAL STYLES */}
      {/* ============================================ */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-fadeInUp { 
          opacity: 0;
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fadeInRight { 
          opacity: 0;
          animation: fadeInRight 0.8s ease-out forwards;
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.4s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  );
};

export default LandingPage;