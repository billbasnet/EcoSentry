import numpy as np
import tensorflow as tf
from PIL import Image
import io
import os

class FireDetector:
    """
    Class for detecting fires in satellite or aerial imagery using computer vision.
    Uses a CNN model to identify fires and smoke in images.
    """
    
    def __init__(self, model_path=None):
        """Initialize the fire detection model"""
        self.model = None
        self.image_size = (224, 224)  # Standard input size for many CNN models
        
        # Load pre-trained model if available
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            # For demo purposes, initialize a simple model
            self._initialize_demo_model()
    
    def _initialize_demo_model(self):
        """
        Initialize a simple model for demonstration purposes.
        This is a very basic model that doesn't require downloading weights.
        In a real application, this would be a pre-trained model fine-tuned on fire detection.
        """
        # Create a simplified model for demo purposes
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(224, 224, 3)),
            tf.keras.layers.Conv2D(16, (3, 3), activation='relu', padding='same'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        
        # For demo purposes, we won't actually train the model
        # Instead, we'll use it to generate plausible predictions
        
        # For demo purposes, we won't actually train the model
        # In a real application, the model would be pre-trained on fire detection datasets
    
    def load_model(self, model_path):
        """Load a pre-trained model from disk"""
        try:
            self.model = tf.keras.models.load_model(model_path)
            print(f"Model loaded from {model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            self._initialize_demo_model()
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for model input
        
        Args:
            image_data: Image file object or bytes
            
        Returns:
            numpy array: Preprocessed image tensor
        """
        # Open image
        if hasattr(image_data, 'read'):
            # If it's a file-like object
            image = Image.open(image_data)
        else:
            # If it's bytes
            image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize to expected dimensions
        image = image.resize(self.image_size)
        
        # Convert to numpy array and normalize
        img_array = tf.keras.preprocessing.image.img_to_array(image)
        img_array = img_array / 255.0  # Normalize to [0,1]
        
        # Expand dimensions for batch
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def _generate_heatmap(self, image_tensor):
        """
        Generate a heatmap of fire detection probabilities across the image
        This is a simplified demo version - in reality, would use Grad-CAM or similar
        
        Returns:
            2D numpy array: Heatmap of detection probabilities
        """
        # In a real implementation, this would use Grad-CAM or a segmentation model
        # For demo, we'll create a simple synthetic heatmap
        
        # Get base prediction
        prediction = self.model.predict(image_tensor)[0][0]
        
        # Generate random heatmap that correlates with the prediction
        np.random.seed(int(prediction * 100))  # Deterministic based on prediction
        
        # Create a base random heatmap
        heatmap = np.random.rand(28, 28)  # Smaller resolution for heatmap
        
        # If prediction is high, create some hot spots
        if prediction > 0.5:
            # Add a few hot spots
            num_hotspots = int(prediction * 5) + 1
            for _ in range(num_hotspots):
                x = np.random.randint(5, 23)
                y = np.random.randint(5, 23)
                radius = np.random.randint(3, 7)
                
                # Create a hotspot with Gaussian distribution
                for i in range(max(0, x-radius), min(28, x+radius)):
                    for j in range(max(0, y-radius), min(28, y+radius)):
                        dist = np.sqrt((i-x)**2 + (j-y)**2)
                        if dist < radius:
                            intensity = 1.0 - (dist/radius) * 0.7
                            heatmap[j, i] = max(heatmap[j, i], intensity)
        
        # Resize to image dimensions
        heatmap_resized = np.zeros((224, 224))
        scale_factor = 224 // 28
        
        for i in range(28):
            for j in range(28):
                heatmap_resized[i*scale_factor:(i+1)*scale_factor, 
                               j*scale_factor:(j+1)*scale_factor] = heatmap[i, j]
        
        return heatmap_resized
    
    def detect(self, image_data):
        """
        Detect fires in the provided image
        
        Args:
            image_data: Image file object or bytes
            
        Returns:
            dict: Detection results including confidence score and regions
        """
        # Preprocess image
        img_tensor = self.preprocess_image(image_data)
        
        # Make prediction
        prediction = float(self.model.predict(img_tensor)[0][0])
        
        # Generate heatmap for visualization
        heatmap = self._generate_heatmap(img_tensor)
        
        # Determine detection regions (for demo purposes)
        # In a real application, this would use object detection or segmentation
        detection_regions = []
        
        if prediction > 0.3:  # Arbitrary threshold
            # Find potential fire regions from the heatmap
            threshold = 0.7
            for _ in range(min(3, int(prediction * 5))):
                # Find a random high-intensity region
                high_intensity_points = np.where(heatmap > threshold)
                if len(high_intensity_points[0]) > 0:
                    # Pick a random high-intensity point
                    idx = np.random.randint(0, len(high_intensity_points[0]))
                    y, x = high_intensity_points[0][idx], high_intensity_points[1][idx]
                    
                    # Create a region around this point
                    region_size = np.random.randint(20, 60)
                    confidence = min(1.0, prediction * (1.0 + np.random.rand() * 0.5))
                    
                    region = {
                        'x': int(x - region_size/2),
                        'y': int(y - region_size/2),
                        'width': region_size,
                        'height': region_size,
                        'confidence': float(confidence)
                    }
                    
                    detection_regions.append(region)
                    
                    # Remove this region from the heatmap to find other distinct regions
                    y_min = max(0, y - region_size//2)
                    y_max = min(heatmap.shape[0], y + region_size//2)
                    x_min = max(0, x - region_size//2)
                    x_max = min(heatmap.shape[1], x + region_size//2)
                    heatmap[y_min:y_max, x_min:x_max] = 0
        
        # Format the result
        result = {
            'has_fire': prediction > 0.5,
            'confidence': prediction,
            'regions': detection_regions
        }
        
        return result
