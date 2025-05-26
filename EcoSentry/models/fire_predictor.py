import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

class FireRiskPredictor:
    """
    Class for predicting wildfire risk based on weather and geographic features.
    Uses a Random Forest model to predict risk score and identify contributing factors.
    """
    
    def __init__(self, model_path=None):
        """Initialize the fire risk prediction model"""
        self.model = None
        self.scaler = StandardScaler()
        
        # Load pre-trained model if available
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            # For demo purposes, initialize a simple model
            self._initialize_demo_model()
            
        # Feature importance dictionary (for explanation)
        self.feature_importance = {
            'temperature': 0.25,
            'humidity': 0.22,
            'wind_speed': 0.18,
            'precipitation': 0.15,
            'vegetation_dryness': 0.12,
            'slope': 0.05,
            'elevation': 0.03
        }
        
        # Risk thresholds
        self.risk_thresholds = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8,
            'extreme': 0.9
        }
    
    def _initialize_demo_model(self):
        """Initialize a simple model for demonstration purposes"""
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        
        # Generate synthetic training data
        X_train = np.random.rand(100, 7)  # 7 features
        y_train = (X_train[:, 0] * 0.25 +  # temperature
                  (1 - X_train[:, 1]) * 0.22 +  # humidity (inverse)
                  X_train[:, 2] * 0.18 +  # wind_speed
                  (1 - X_train[:, 3]) * 0.15)  # precipitation (inverse)
        
        # Discretize to classification problem (0: low risk, 1: high risk)
        y_train = (y_train > 0.5).astype(int)
        
        # Fit the model
        self.model.fit(X_train, y_train)
        
        # Fit scaler
        self.scaler.fit(X_train)
    
    def load_model(self, model_path):
        """Load a pre-trained model from disk"""
        try:
            self.model = joblib.load(model_path)
            print(f"Model loaded from {model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            self._initialize_demo_model()
    
    def _extract_features(self, data):
        """Extract and transform features from input data"""
        # Extract known features
        features = []
        features.append(data.get('temperature', 25))  # Default to 25°C
        features.append(data.get('humidity', 50))  # Default to 50%
        features.append(data.get('wind_speed', 5))  # Default to 5 km/h
        features.append(data.get('precipitation', 0))  # Default to 0 mm
        
        # For demo, generate some synthetic values for features that would 
        # normally come from GIS or vegetation data
        lat = data.get('latitude', 0)
        lng = data.get('longitude', 0)
        
        # Generate deterministic but "random-looking" values based on lat/lng
        seed = int(abs(lat * 1000) + abs(lng * 1000))
        np.random.seed(seed)
        
        # Vegetation dryness (would normally come from remote sensing)
        veg_dryness = np.random.rand() * 0.7 + 0.3  # Between 0.3 and 1.0
        features.append(veg_dryness)
        
        # Terrain features (would normally come from elevation data)
        slope = np.random.rand() * 30  # Slope in degrees (0-30)
        features.append(slope)
        
        elevation = np.random.rand() * 1000 + 200  # Elevation in meters (200-1200)
        features.append(elevation)
        
        # Normalize features
        features = np.array(features).reshape(1, -1)
        features_scaled = self.scaler.transform(features)
        
        return features_scaled
    
    def _calculate_risk_factors(self, features, threshold=0.1):
        """Determine the factors contributing to fire risk"""
        risk_factors = []
        feature_names = ['temperature', 'humidity', 'wind_speed', 'precipitation', 
                        'vegetation_dryness', 'slope', 'elevation']
        
        # Unnormalize features for human-readable thresholds
        features_original = self.scaler.inverse_transform(features)[0]
        
        # Check temperature
        if features_original[0] > 30:  # > 30°C
            risk_factors.append('High temperature')
        
        # Check humidity
        if features_original[1] < 30:  # < 30%
            risk_factors.append('Low humidity')
        
        # Check wind speed
        if features_original[2] > 20:  # > 20 km/h
            risk_factors.append('High winds')
        
        # Check precipitation (lack of)
        if features_original[3] < 2:  # < 2mm recent rainfall
            risk_factors.append('Dry conditions')
        
        # Check vegetation dryness
        if features_original[4] > 0.7:  # Arbitrary threshold
            risk_factors.append('Dry vegetation')
        
        # Check slope
        if features_original[5] > 15:  # > 15 degrees
            risk_factors.append('Steep terrain')
            
        return risk_factors
    
    def predict(self, data):
        """
        Predict fire risk score based on input data
        
        Args:
            data: Dictionary containing features like temperature, humidity, etc.
            
        Returns:
            tuple: (risk_score, risk_factors)
                risk_score: Float between 0 and 1 indicating fire risk
                risk_factors: List of factors contributing to the risk
        """
        # Extract features
        features = self._extract_features(data)
        
        # Get model prediction (probability of high risk)
        if hasattr(self.model, 'predict_proba'):
            risk_score = self.model.predict_proba(features)[0, 1]  # Probability of class 1
        else:
            # Fallback for models without predict_proba
            prediction = self.model.predict(features)[0]
            risk_score = float(prediction)  # 0 or 1
        
        # Determine risk factors
        risk_factors = self._calculate_risk_factors(features)
        
        # Add season-based risk if date is provided
        if 'date' in data:
            try:
                date = datetime.strptime(data['date'], '%Y-%m-%d')
                month = date.month
                
                # Northern hemisphere summer (higher risk)
                if 6 <= month <= 9:
                    risk_score = min(risk_score * 1.2, 1.0)  # Increase risk but cap at 1.0
                    risk_factors.append('Summer season')
            except Exception:
                pass  # Ignore date parsing errors
        
        return risk_score, risk_factors
