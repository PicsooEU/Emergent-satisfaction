import React, { useState, useEffect } from 'react';
import './App.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Star Rating Component
const StarRating = ({ rating, onRatingChange, label, disabled = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`text-2xl transition-colors duration-200 ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${
              star <= (hoverRating || rating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
            onClick={() => !disabled && onRatingChange(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
};

// Review Form Component
const ReviewForm = ({ onSubmitSuccess }) => {
  const [ratings, setRatings] = useState({
    support_rating: 0,
    quality_rating: 0,
    features_rating: 0,
    value_rating: 0
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleRatingChange = (category, rating) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const allRatingsGiven = Object.values(ratings).every(rating => rating > 0);
    if (!allRatingsGiven) {
      setMessage('Veuillez noter toutes les catégories');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ratings,
          comment: comment.trim()
        }),
      });

      if (response.ok) {
        setMessage('Merci pour votre avis ! Il sera modéré avant publication.');
        setRatings({
          support_rating: 0,
          quality_rating: 0,
          features_rating: 0,
          value_rating: 0
        });
        setComment('');
        if (onSubmitSuccess) onSubmitSuccess();
      } else {
        const error = await response.json();
        setMessage(`Erreur: ${error.detail}`);
      }
    } catch (error) {
      setMessage('Erreur de connexion. Veuillez réessayer.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Donnez votre avis
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StarRating
            label="Support client"
            rating={ratings.support_rating}
            onRatingChange={(rating) => handleRatingChange('support_rating', rating)}
          />
          <StarRating
            label="Qualité du produit"
            rating={ratings.quality_rating}
            onRatingChange={(rating) => handleRatingChange('quality_rating', rating)}
          />
          <StarRating
            label="Fonctionnalités"
            rating={ratings.features_rating}
            onRatingChange={(rating) => handleRatingChange('features_rating', rating)}
          />
          <StarRating
            label="Rapport qualité/prix"
            rating={ratings.value_rating}
            onRatingChange={(rating) => handleRatingChange('value_rating', rating)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Partagez votre expérience..."
          />
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Merci') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200 font-medium"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Soumettre mon avis'}
        </button>
      </form>
    </div>
  );
};

// Statistics Display Component
const StatsDisplay = ({ stats }) => {
  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-500">Aucun avis disponible pour le moment</p>
      </div>
    );
  }

  const categories = [
    { key: 'avg_support', label: 'Support client', color: 'bg-blue-500' },
    { key: 'avg_quality', label: 'Qualité produit', color: 'bg-green-500' },
    { key: 'avg_features', label: 'Fonctionnalités', color: 'bg-purple-500' },
    { key: 'avg_value', label: 'Rapport qualité/prix', color: 'bg-orange-500' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Statistiques</h3>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-medium">Note globale</span>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-yellow-500">{stats.avg_overall}</span>
            <span className="text-yellow-400 text-xl">★</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">Basé sur {stats.total_reviews} avis</p>
      </div>

      <div className="space-y-4">
        {categories.map(category => (
          <div key={category.key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">{category.label}</span>
              <span className="text-sm font-bold">{stats[category.key]}/5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${category.color}`}
                style={{ width: `${(stats[category.key] / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    }
  };

  const updateReviewStatus = async (reviewId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/status?status=${status}`, {
        method: 'PUT',
      });
      if (response.ok) {
        fetchReviews();
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export`);
      if (response.ok) {
        const data = await response.json();
        
        // Create and download CSV file
        const blob = new Blob([data.csv_data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avis-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Administration</h2>
        <button
          onClick={exportData}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Exporter CSV
        </button>
      </div>

      {stats && <StatsDisplay stats={stats} />}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex space-x-4 mb-4">
          {['pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'pending' ? 'En attente' : 
               status === 'approved' ? 'Approuvés' : 'Rejetés'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun avis trouvé</p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex space-x-4">
                    <span className="text-sm">Support: {review.support_rating}★</span>
                    <span className="text-sm">Qualité: {review.quality_rating}★</span>
                    <span className="text-sm">Fonctionnalités: {review.features_rating}★</span>
                    <span className="text-sm">Rapport Q/P: {review.value_rating}★</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.timestamp).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                )}
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateReviewStatus(review.id, 'approved')}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => updateReviewStatus(review.id, 'rejected')}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('form');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Système de Gestion des Avis
          </h1>
          <p className="text-gray-600">
            Partagez votre expérience et aidez-nous à améliorer nos services
          </p>
        </header>

        {/* Navigation */}
        <nav className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setCurrentView('form')}
            className={`px-6 py-2 rounded-md font-medium ${
              currentView === 'form'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Donner un avis
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`px-6 py-2 rounded-md font-medium ${
              currentView === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Statistiques
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            className={`px-6 py-2 rounded-md font-medium ${
              currentView === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Administration
          </button>
        </nav>

        {/* Main Content */}
        <main>
          {currentView === 'form' && (
            <ReviewForm onSubmitSuccess={fetchStats} />
          )}
          
          {currentView === 'stats' && (
            <div className="max-w-4xl mx-auto">
              <StatsDisplay stats={stats} />
            </div>
          )}
          
          {currentView === 'admin' && (
            <div className="max-w-6xl mx-auto">
              <AdminPanel />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500">
          <p>© 2024 Système de Gestion des Avis - Tous droits réservés</p>
        </footer>
      </div>
    </div>
  );
}

export default App;