// src/services/demoService.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const demoService = {
  bookDemo: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/demo/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to book demo');
    }
    
    return data;
  },
};