import os
from flask import Flask, render_template, request, jsonify
import numpy as np
import pandas as pd
from datetime import datetime
import json
from models.fire_predictor import FireRiskPredictor
from models.fire_detector import FireDetector

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ecosentry-hackathon-project'

# Initialize models
fire_predictor = FireRiskPredictor()
fire_detector = FireDetector()

@app.route('/')
def home():
    """Render the home page with the dashboard"""
    return render_template('index.html')

@app.route('/map')
def map_view():
    """Render the interactive map view"""
    return render_template('map.html')

@app.route('/about')
def about():
    """Render the about page"""
    return render_template('about.html')

@app.route('/api/predict', methods=['POST'])
def predict_risk():
    """API endpoint to predict fire risk based on location and weather data"""
    data = request.json
    
    # Extract features from request
    location = data.get('location', {})
    latitude = location.get('lat')
    longitude = location.get('lng')
    
    weather = data.get('weather', {})
    temperature = weather.get('temperature')
    humidity = weather.get('humidity')
    wind_speed = weather.get('windSpeed')
    precipitation = weather.get('precipitation')
    
    # Create feature vector
    features = {
        'latitude': latitude,
        'longitude': longitude,
        'temperature': temperature,
        'humidity': humidity,
        'wind_speed': wind_speed,
        'precipitation': precipitation,
        'date': datetime.now().strftime('%Y-%m-%d')
    }
    
    # Make prediction
    risk_score, risk_factors = fire_predictor.predict(features)
    
    return jsonify({
        'risk_score': risk_score,
        'risk_factors': risk_factors,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/detect', methods=['POST'])
def detect_fire():
    """API endpoint to detect fires in satellite imagery"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    image_file = request.files['image']
    
    # Process image and make detection
    detection_results = fire_detector.detect(image_file)
    
    return jsonify({
        'detections': detection_results,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/resources', methods=['POST'])
def optimize_resources():
    """API endpoint to recommend resource allocation"""
    data = request.json
    
    # Extract risk areas and available resources
    risk_areas = data.get('risk_areas', [])
    available_resources = data.get('available_resources', {})
    
    # In a real application, this would implement a complex optimization algorithm
    # For demo purposes, we'll just allocate more resources to higher risk areas
    
    recommendations = []
    total_risk = sum(area['risk_score'] for area in risk_areas)
    
    for area in risk_areas:
        risk_percentage = area['risk_score'] / total_risk if total_risk > 0 else 0
        
        area_recommendation = {
            'area_id': area['id'],
            'area_name': area['name'],
            'risk_score': area['risk_score'],
            'recommended_resources': {}
        }
        
        # Allocate resources proportionally to risk
        for resource, amount in available_resources.items():
            allocation = round(amount * risk_percentage, 2)
            area_recommendation['recommended_resources'][resource] = allocation
            
        recommendations.append(area_recommendation)
    
    return jsonify({
        'recommendations': recommendations,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/sample-data')
def get_sample_data():
    """Provide sample data for demonstration purposes"""
    # Load sample risk data from JSON file
    with open(os.path.join('data', 'sample_data', 'risk_data.json'), 'r') as f:
        risk_data = json.load(f)
    
    return jsonify(risk_data)

if __name__ == '__main__':
    # Make sure sample data directory exists
    os.makedirs(os.path.join('data', 'sample_data'), exist_ok=True)
    
    # Create sample data if it doesn't exist
    sample_data_path = os.path.join('data', 'sample_data', 'risk_data.json')
    if not os.path.exists(sample_data_path):
        # Generate sample data
        sample_data = {
            'risk_areas': [
                {
                    'id': 1,
                    'name': 'Northern Forest Region',
                    'center': {'lat': 37.7749, 'lng': -122.4194},
                    'risk_score': 0.85,
                    'risk_factors': ['High temperature', 'Low humidity', 'Dry vegetation']
                },
                {
                    'id': 2,
                    'name': 'Eastern Woodland',
                    'center': {'lat': 34.0522, 'lng': -118.2437},
                    'risk_score': 0.65,
                    'risk_factors': ['Moderate wind', 'Dry conditions']
                },
                {
                    'id': 3,
                    'name': 'Southern Valley',
                    'center': {'lat': 40.7128, 'lng': -74.0060},
                    'risk_score': 0.35,
                    'risk_factors': ['Recent precipitation']
                }
            ],
            'historical_fires': [
                {
                    'id': 101,
                    'name': 'Redwood Complex Fire',
                    'year': 2023,
                    'location': {'lat': 37.8, 'lng': -122.5},
                    'area_burned': 36000,
                    'duration_days': 14
                },
                {
                    'id': 102,
                    'name': 'Eagle Creek Fire',
                    'year': 2024,
                    'location': {'lat': 34.1, 'lng': -118.3},
                    'area_burned': 48000,
                    'duration_days': 21
                }
            ]
        }
        
        with open(sample_data_path, 'w') as f:
            json.dump(sample_data, f, indent=2)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
