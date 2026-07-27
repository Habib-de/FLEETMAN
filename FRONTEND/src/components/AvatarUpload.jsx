import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Loader2 } from 'lucide-react';

const AvatarUpload = ({ size = 'md', className = '' }) => {
  const { currentUser, updateAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-3xl'
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await updateAvatar(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to upload avatar');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br from-blue-500 to-purple-600 
          flex items-center justify-center 
          text-white font-bold 
          overflow-hidden 
          border-2 border-white shadow-lg
          ${uploading ? 'opacity-50' : ''}
        `}
      >
        {currentUser?.avatar ? (
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name || 'User'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(currentUser?.name)}</span>
        )}
      </div>

      <button
        onClick={triggerFileInput}
        disabled={uploading}
        className={`
          absolute bottom-0 right-0 
          bg-blue-600 text-white 
          rounded-full p-1.5 
          border-2 border-white 
          hover:bg-blue-700 
          transition-all duration-200
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        `}
        title="Change avatar"
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;