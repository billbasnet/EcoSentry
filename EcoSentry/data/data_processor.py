import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FireDataProcessor:
    """
    Class for processing fire-related data, including risk factors, historical fires,
    and weather data. Provides methods for data cleaning, feature engineering, and export.
    """
    
    def __init__(self, data_dir='data/sample_data'):
        """
        Initialize the data processor with the path to the data directory.
        
        Args:
            data_dir (str): Path to the directory containing data files
        """
        self.data_dir = data_dir
        self.risk_data = None
        self.historical_fires = None
        self.weather_data = None
        
        # Load data if available
        self._load_data()
        
    def _load_data(self):
        """Load data from JSON files in the data directory"""
        risk_data_path = os.path.join(self.data_dir, 'risk_data.json')
        
        if os.path.exists(risk_data_path):
            try:
                with open(risk_data_path, 'r') as f:
                    data = json.load(f)
                    
                self.risk_data = data.get('risk_areas', [])
                self.active_fires = data.get('active_fires', [])
                self.historical_fires = data.get('historical_fires', [])
                self.resources = data.get('resources', [])
                self.weather_data = data.get('weather_data', {})
                
                logger.info(f"Loaded data from {risk_data_path}")
            except Exception as e:
                logger.error(f"Error loading data: {e}")
        else:
            logger.warning(f"Data file not found: {risk_data_path}")
    
    def get_risk_dataframe(self):
        """
        Convert risk data to a pandas DataFrame for analysis.
        
        Returns:
            pd.DataFrame: DataFrame containing risk data
        """
        if not self.risk_data:
            return pd.DataFrame()
            
        # Extract data from nested structure
        data = []
        for area in self.risk_data:
            row = {
                'id': area.get('id'),
                'name': area.get('name'),
                'latitude': area.get('center', {}).get('lat'),
                'longitude': area.get('center', {}).get('lng'),
                'risk_score': area.get('risk_score'),
                'risk_factors': ', '.join(area.get('risk_factors', [])),
                'radius': area.get('radius')
            }
            data.append(row)
            
        return pd.DataFrame(data)
    
    def get_fire_history_dataframe(self):
        """
        Convert historical fire data to a pandas DataFrame.
        
        Returns:
            pd.DataFrame: DataFrame containing historical fire data
        """
        if not self.historical_fires:
            return pd.DataFrame()
            
        data = []
        for fire in self.historical_fires:
            row = {
                'id': fire.get('id'),
                'name': fire.get('name'),
                'year': fire.get('year'),
                'latitude': fire.get('location', {}).get('lat'),
                'longitude': fire.get('location', {}).get('lng'),
                'area_burned': fire.get('area_burned'),
                'duration_days': fire.get('duration_days')
            }
            data.append(row)
            
        return pd.DataFrame(data)
    
    def get_active_fires_dataframe(self):
        """
        Convert active fire data to a pandas DataFrame.
        
        Returns:
            pd.DataFrame: DataFrame containing active fire data
        """
        if not self.active_fires:
            return pd.DataFrame()
            
        data = []
        for fire in self.active_fires:
            row = {
                'id': fire.get('id'),
                'name': fire.get('name'),
                'latitude': fire.get('location', {}).get('lat'),
                'longitude': fire.get('location', {}).get('lng'),
                'intensity': fire.get('intensity'),
                'area_burned': fire.get('area_burned'),
                'started': fire.get('started'),
                'status': fire.get('status')
            }
            data.append(row)
            
        return pd.DataFrame(data)
    
    def generate_risk_heatmap_data(self):
        """
        Generate data for a risk heatmap visualization.
        
        Returns:
            list: List of [lat, lng, intensity] points for heatmap
        """
        if not self.risk_data:
            return []
            
        heatmap_points = []
        
        # For each risk area, generate points within its radius
        for area in self.risk_data:
            center_lat = area.get('center', {}).get('lat')
            center_lng = area.get('center', {}).get('lng')
            radius = area.get('radius', 0) / 111000  # Convert meters to rough degrees
            risk = area.get('risk_score', 0)
            
            # Generate more points for higher risk areas
            num_points = int(max(10, risk * 100))
            
            for _ in range(num_points):
                # Generate random point within circle
                angle = np.random.uniform(0, 2 * np.pi)
                r = radius * np.sqrt(np.random.uniform(0, 1))
                
                lat = center_lat + r * np.cos(angle)
                lng = center_lng + r * np.sin(angle)
                
                # Intensity proportional to risk
                intensity = risk * np.random.uniform(0.7, 1.0)
                
                heatmap_points.append([lat, lng, intensity])
                
        return heatmap_points
    
    def predict_risk_trends(self, days=7):
        """
        Predict fire risk trends for the next specified number of days
        based on current risk and weather forecast.
        
        Args:
            days (int): Number of days to predict
            
        Returns:
            dict: Dictionary with predicted risk trends by region
        """
        if not self.risk_data or not self.weather_data:
            return {}
            
        trends = {}
        today = datetime.now()
        
        # Get current risk scores by region name
        current_risks = {area.get('name'): area.get('risk_score') for area in self.risk_data}
        
        # Process forecast data if available
        forecast = self.weather_data.get('forecast', [])
        forecast_by_date = {item.get('date'): item.get('regions', {}) for item in forecast}
        
        # Generate predictions for each region
        for region, current_risk in current_risks.items():
            region_trend = [current_risk]
            
            for day in range(1, days + 1):
                date_str = (today + timedelta(days=day)).strftime('%Y-%m-%d')
                
                # If we have forecast for this date, use it to modify risk
                if date_str in forecast_by_date and region in forecast_by_date[date_str]:
                    weather = forecast_by_date[date_str][region]
                    
                    # Apply simple weather-based adjustments to risk
                    risk_adjustment = 0
                    
                    # Temperature effect (higher temp = higher risk)
                    temp = weather.get('temperature', 25)
                    if temp > 30:
                        risk_adjustment += 0.05
                    elif temp < 15:
                        risk_adjustment -= 0.03
                        
                    # Humidity effect (lower humidity = higher risk)
                    humidity = weather.get('humidity', 50)
                    if humidity < 30:
                        risk_adjustment += 0.08
                    elif humidity > 70:
                        risk_adjustment -= 0.05
                        
                    # Wind effect (higher wind = higher risk)
                    wind = weather.get('wind_speed', 10)
                    if wind > 15:
                        risk_adjustment += 0.03
                        
                    # Precipitation effect (higher precipitation = lower risk)
                    precip = weather.get('precipitation', 0)
                    if precip > 5:
                        risk_adjustment -= 0.15
                    elif precip > 0:
                        risk_adjustment -= 0.08
                        
                    # Apply adjustment with damping to avoid extreme swings
                    prev_risk = region_trend[-1]
                    new_risk = max(0, min(1, prev_risk + risk_adjustment))
                    
                    # Add small random variation
                    new_risk = max(0, min(1, new_risk + np.random.uniform(-0.02, 0.02)))
                    
                    region_trend.append(new_risk)
                else:
                    # Without forecast data, apply small random walk
                    prev_risk = region_trend[-1]
                    random_adjustment = np.random.uniform(-0.03, 0.03)
                    new_risk = max(0, min(1, prev_risk + random_adjustment))
                    region_trend.append(new_risk)
            
            trends[region] = region_trend
            
        return trends
    
    def generate_monthly_stats(self):
        """
        Generate monthly statistics for fire incidents.
        
        Returns:
            dict: Dictionary with monthly statistics
        """
        if not self.historical_fires:
            return {}
            
        df = self.get_fire_history_dataframe()
        
        # Group by year and count
        yearly_counts = df.groupby('year').size().to_dict()
        
        # Generate synthetic monthly distribution (since we don't have actual month data)
        # This assumes fire season peaks in summer months
        monthly_distribution = {
            'January': 0.02,
            'February': 0.03,
            'March': 0.05,
            'April': 0.07,
            'May': 0.10,
            'June': 0.15,
            'July': 0.20,
            'August': 0.18,
            'September': 0.10,
            'October': 0.05,
            'November': 0.03,
            'December': 0.02
        }
        
        monthly_stats = {}
        for year, count in yearly_counts.items():
            monthly_stats[year] = {}
            for month, factor in monthly_distribution.items():
                # Add some randomness to the distribution
                random_factor = np.random.uniform(0.8, 1.2)
                monthly_count = int(count * factor * random_factor)
                monthly_stats[year][month] = monthly_count
                
        return monthly_stats
    
    def export_to_csv(self, output_dir='data/processed'):
        """
        Export processed data to CSV files.
        
        Args:
            output_dir (str): Directory to save output files
            
        Returns:
            dict: Paths to the exported files
        """
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        exported_files = {}
        
        # Export risk data
        risk_df = self.get_risk_dataframe()
        if not risk_df.empty:
            risk_path = os.path.join(output_dir, 'risk_areas.csv')
            risk_df.to_csv(risk_path, index=False)
            exported_files['risk_areas'] = risk_path
            
        # Export historical fire data
        fire_df = self.get_fire_history_dataframe()
        if not fire_df.empty:
            fire_path = os.path.join(output_dir, 'historical_fires.csv')
            fire_df.to_csv(fire_path, index=False)
            exported_files['historical_fires'] = fire_path
            
        # Export active fire data
        active_df = self.get_active_fires_dataframe()
        if not active_df.empty:
            active_path = os.path.join(output_dir, 'active_fires.csv')
            active_df.to_csv(active_path, index=False)
            exported_files['active_fires'] = active_path
            
        return exported_files
    
    def generate_demo_report(self):
        """
        Generate a comprehensive demo report with statistics and insights.
        
        Returns:
            dict: Report data
        """
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {}
        }
        
        # Risk area summary
        risk_df = self.get_risk_dataframe()
        if not risk_df.empty:
            report['summary']['risk_areas'] = {
                'count': len(risk_df),
                'high_risk_count': len(risk_df[risk_df['risk_score'] >= 0.7]),
                'medium_risk_count': len(risk_df[(risk_df['risk_score'] >= 0.4) & (risk_df['risk_score'] < 0.7)]),
                'low_risk_count': len(risk_df[risk_df['risk_score'] < 0.4]),
                'average_risk': risk_df['risk_score'].mean()
            }
            
        # Fire history summary
        fire_df = self.get_fire_history_dataframe()
        if not fire_df.empty:
            report['summary']['historical_fires'] = {
                'count': len(fire_df),
                'total_area_burned': fire_df['area_burned'].sum(),
                'average_duration': fire_df['duration_days'].mean(),
                'by_year': fire_df.groupby('year').size().to_dict()
            }
            
        # Active fires summary
        active_df = self.get_active_fires_dataframe()
        if not active_df.empty:
            report['summary']['active_fires'] = {
                'count': len(active_df),
                'total_area_burned': active_df['area_burned'].sum(),
                'average_intensity': active_df['intensity'].mean()
            }
            
        # Add risk trends
        report['risk_trends'] = self.predict_risk_trends(days=7)
        
        # Add monthly statistics
        report['monthly_stats'] = self.generate_monthly_stats()
        
        return report

# Example usage
if __name__ == "__main__":
    processor = FireDataProcessor()
    df_risk = processor.get_risk_dataframe()
    print(f"Loaded {len(df_risk)} risk areas")
    
    df_fires = processor.get_fire_history_dataframe()
    print(f"Loaded {len(df_fires)} historical fires")
    
    # Generate and print report
    report = processor.generate_demo_report()
    print("Report summary:", json.dumps(report['summary'], indent=2))
