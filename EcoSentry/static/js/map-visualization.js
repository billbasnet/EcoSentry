/**
 * EcoSentry - Map Visualization Module
 * Handles the interactive fire risk and detection map
 */

class FireRiskMap {
    /**
     * Initialize the fire risk map
     * @param {string} containerId - ID of the map container element
     * @param {Object} options - Map configuration options
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = Object.assign({
            center: EcoSentry.mapDefaults.center,
            zoom: EcoSentry.mapDefaults.zoom,
            showFires: true,
            showRiskZones: true,
            showResources: true,
            riskThreshold: 0.3
        }, options);
        
        this.map = null;
        this.layers = {
            fires: null,
            riskZones: null,
            resources: null,
            heatmap: null
        };
        
        this.data = {
            riskAreas: [],
            activeFires: [],
            resources: []
        };
        
        this.init();
    }
    
    /**
     * Initialize the map
     */
    init() {
        // Create map instance
        this.map = L.map(this.containerId).setView(this.options.center, this.options.zoom);
        
        // Add base tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // Create layer groups
        this.layers.fires = L.layerGroup().addTo(this.map);
        this.layers.riskZones = L.layerGroup().addTo(this.map);
        this.layers.resources = L.layerGroup().addTo(this.map);
        
        // Add legend
        this.addLegend();
        
        // Load initial data
        this.loadData();
    }
    
    /**
     * Add the risk level legend to the map
     */
    addLegend() {
        const legend = L.control({position: 'bottomright'});
        
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            const grades = [0, 0.2, 0.4, 0.6, 0.8];
            const labels = [];

            div.innerHTML = '<h6 class="p-1 mb-0">Risk Level</h6>';
            
            // Loop through risk intervals and generate colored box for each
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + EcoSentry.utils.getRiskColor(grades[i] + 0.1) + '"></i> ' +
                    EcoSentry.utils.getRiskLevel(grades[i]) + (grades[i + 1] ? '&ndash;' + EcoSentry.utils.getRiskLevel(grades[i + 1]) + '<br>' : '+');
            }
            
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    /**
     * Load data from the API
     */
    loadData() {
        EcoSentry.api.getRiskData()
            .then(data => {
                this.data.riskAreas = data.risk_areas || [];
                this.data.activeFires = data.active_fires || [];
                this.data.resources = data.resources || [];
                
                this.updateMap();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                // Load sample data as fallback
                this.loadSampleData();
            });
    }
    
    /**
     * Load sample data when API is not available
     */
    loadSampleData() {
        // Sample risk zones
        this.data.riskAreas = [
            {
                id: 1,
                name: 'Northern Forest Region',
                center: {lat: 37.7749, lng: -122.4194},
                radius: 50000,
                risk_score: 0.85,
                risk_factors: ['High temperature', 'Low humidity', 'Dry vegetation']
            },
            {
                id: 2,
                name: 'Eastern Woodland',
                center: {lat: 34.0522, lng: -118.2437},
                radius: 40000,
                risk_score: 0.65,
                risk_factors: ['Moderate wind', 'Dry conditions']
            },
            {
                id: 3,
                name: 'Southern Valley',
                center: {lat: 40.7128, lng: -74.0060},
                radius: 30000,
                risk_score: 0.35,
                risk_factors: ['Recent precipitation']
            }
        ];
        
        // Sample active fires
        this.data.activeFires = [
            {
                id: 101,
                name: 'Redwood Complex Fire',
                location: {lat: 37.8, lng: -122.5},
                intensity: 0.9,
                started: '2025-05-24'
            },
            {
                id: 102,
                name: 'Eagle Creek Fire',
                location: {lat: 34.1, lng: -118.3},
                intensity: 0.7,
                started: '2025-05-25'
            }
        ];
        
        // Sample resources
        this.data.resources = [
            {
                id: 201,
                name: 'Team Alpha',
                type: 'Fire Brigade',
                location: {lat: 37.75, lng: -122.45},
                personnel: 15
            },
            {
                id: 202,
                name: 'Team Bravo',
                type: 'Helicopter Unit',
                location: {lat: 34.05, lng: -118.25},
                personnel: 8
            }
        ];
        
        this.updateMap();
    }
    
    /**
     * Update the map with current data
     */
    updateMap() {
        // Clear existing layers
        this.layers.fires.clearLayers();
        this.layers.riskZones.clearLayers();
        this.layers.resources.clearLayers();
        
        // Add risk zones
        if (this.options.showRiskZones) {
            this.data.riskAreas.forEach(area => {
                if (area.risk_score >= this.options.riskThreshold) {
                    this.addRiskZone(area);
                }
            });
        }
        
        // Add active fires
        if (this.options.showFires) {
            this.data.activeFires.forEach(fire => {
                this.addFireMarker(fire);
            });
        }
        
        // Add resources
        if (this.options.showResources) {
            this.data.resources.forEach(resource => {
                this.addResourceMarker(resource);
            });
        }
        
        // Trigger event when map is updated
        if (typeof this.onMapUpdated === 'function') {
            this.onMapUpdated(this.data);
        }
    }
    
    /**
     * Add a risk zone to the map
     * @param {Object} area - Risk area data
     */
    addRiskZone(area) {
        const color = EcoSentry.utils.getRiskColor(area.risk_score);
        
        const circle = L.circle([area.center.lat, area.center.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.4,
            radius: area.radius
        }).addTo(this.layers.riskZones);
        
        circle.bindTooltip(`${area.name} - Risk: ${area.risk_score.toFixed(2)}`);
        
        circle.on('click', () => {
            if (typeof this.onAreaSelected === 'function') {
                this.onAreaSelected(area);
            }
        });
        
        return circle;
    }
    
    /**
     * Add a fire marker to the map
     * @param {Object} fire - Fire data
     */
    addFireMarker(fire) {
        const fireIcon = L.divIcon({
            html: `<div style="background-color: red; border-radius: 50%; width: 12px; height: 12px; box-shadow: 0 0 ${10 + fire.intensity * 20}px ${8 + fire.intensity * 8}px rgba(255, 0, 0, 0.6);"></div>`,
            className: 'fire-marker',
            iconSize: [20, 20]
        });
        
        const marker = L.marker([fire.location.lat, fire.location.lng], {icon: fireIcon})
            .addTo(this.layers.fires);
            
        marker.bindTooltip(`${fire.name} - Active since: ${fire.started}`);
        
        marker.on('click', () => {
            if (typeof this.onFireSelected === 'function') {
                this.onFireSelected(fire);
            }
        });
        
        return marker;
    }
    
    /**
     * Add a resource marker to the map
     * @param {Object} resource - Resource data
     */
    addResourceMarker(resource) {
        const resourceIcon = L.divIcon({
            html: `<div style="background-color: blue; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${resource.personnel}</div>`,
            className: 'resource-marker',
            iconSize: [24, 24]
        });
        
        const marker = L.marker([resource.location.lat, resource.location.lng], {icon: resourceIcon})
            .addTo(this.layers.resources);
            
        marker.bindTooltip(`${resource.name} - ${resource.type}`);
        
        marker.on('click', () => {
            if (typeof this.onResourceSelected === 'function') {
                this.onResourceSelected(resource);
            }
        });
        
        return marker;
    }
    
    /**
     * Set the risk threshold filter
     * @param {number} threshold - Risk threshold (0-1)
     */
    setRiskThreshold(threshold) {
        this.options.riskThreshold = threshold;
        this.updateMap();
    }
    
    /**
     * Toggle visibility of fire markers
     * @param {boolean} show - Whether to show fire markers
     */
    toggleFires(show) {
        this.options.showFires = show;
        this.updateMap();
    }
    
    /**
     * Toggle visibility of risk zones
     * @param {boolean} show - Whether to show risk zones
     */
    toggleRiskZones(show) {
        this.options.showRiskZones = show;
        this.updateMap();
    }
    
    /**
     * Toggle visibility of resource markers
     * @param {boolean} show - Whether to show resource markers
     */
    toggleResources(show) {
        this.options.showResources = show;
        this.updateMap();
    }
    
    /**
     * Refresh data from the API
     */
    refresh() {
        this.loadData();
    }
    
    /**
     * Center the map on a specific location
     * @param {Array} center - [lat, lng] coordinates
     * @param {number} zoom - Zoom level
     */
    centerMap(center, zoom) {
        this.map.setView(center, zoom);
    }
}

// Initialize map when the script loads
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('mapContainer');
    
    if (mapContainer) {
        // Create map instance
        window.riskMap = new FireRiskMap('mapContainer');
        
        // Set up event handlers
        riskMap.onAreaSelected = function(area) {
            // Show area details in the info panel
            const detailsContent = document.getElementById('detailsContent');
            if (detailsContent) {
                detailsContent.style.display = 'block';
                
                document.getElementById('areaName').textContent = area.name;
                
                const riskLevelElem = document.getElementById('riskLevel');
                riskLevelElem.textContent = EcoSentry.utils.getRiskLevel(area.risk_score);
                riskLevelElem.className = 'badge ' + EcoSentry.utils.getRiskClass(area.risk_score);
                
                document.getElementById('riskScore').textContent = area.risk_score.toFixed(2);
                
                const factorsElem = document.getElementById('riskFactors');
                factorsElem.innerHTML = '';
                area.risk_factors.forEach(factor => {
                    const li = document.createElement('li');
                    li.textContent = factor;
                    factorsElem.appendChild(li);
                });
                
                // Generate recommendations
                generateRecommendations(area);
            }
        };
        
        riskMap.onFireSelected = function(fire) {
            // Show fire details as a risk area
            const fireAsRisk = {
                id: fire.id,
                name: fire.name,
                risk_score: fire.intensity,
                risk_factors: ['Active fire', 'Started on ' + fire.started],
                is_active_fire: true
            };
            
            riskMap.onAreaSelected(fireAsRisk);
        };
        
        // Set up UI controls
        const riskThreshold = document.getElementById('riskThreshold');
        if (riskThreshold) {
            riskThreshold.addEventListener('input', function() {
                const threshold = parseFloat(this.value);
                document.getElementById('thresholdValue').textContent = threshold.toFixed(1);
                riskMap.setRiskThreshold(threshold);
            });
        }
        
        const showFiresSwitch = document.getElementById('showFiresSwitch');
        if (showFiresSwitch) {
            showFiresSwitch.addEventListener('change', function() {
                riskMap.toggleFires(this.checked);
            });
        }
        
        const showRiskZonesSwitch = document.getElementById('showRiskZonesSwitch');
        if (showRiskZonesSwitch) {
            showRiskZonesSwitch.addEventListener('change', function() {
                riskMap.toggleRiskZones(this.checked);
            });
        }
        
        const showResourcesSwitch = document.getElementById('showResourcesSwitch');
        if (showResourcesSwitch) {
            showResourcesSwitch.addEventListener('change', function() {
                riskMap.toggleResources(this.checked);
            });
        }
        
        const refreshMapBtn = document.getElementById('refreshMapBtn');
        if (refreshMapBtn) {
            refreshMapBtn.addEventListener('click', function() {
                riskMap.refresh();
                
                // Update last updated timestamp
                const now = new Date();
                const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const dateString = now.toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'});
                const fullTimeString = `${dateString}, ${timeString}`;
                
                const lastUpdatedElements = document.querySelectorAll('.last-updated');
                lastUpdatedElements.forEach(el => {
                    el.textContent = fullTimeString;
                });
                
                // Show notification
                alert('Map data refreshed!');
            });
        }
        
        // Function to generate recommendations based on risk
        function generateRecommendations(area) {
            const recommendationsElem = document.getElementById('recommendations');
            if (!recommendationsElem) return;
            
            recommendationsElem.innerHTML = '';
            
            let recommendations = [];
            
            if (area.is_active_fire) {
                recommendations = [
                    'Deploy firefighting resources immediately',
                    'Evacuate nearby communities',
                    'Establish containment perimeter'
                ];
                
                // Update alert button
                const alertBtn = document.getElementById('alertBtn');
                if (alertBtn) {
                    alertBtn.textContent = 'Send Evacuation Alert';
                    alertBtn.className = 'btn btn-danger mt-2';
                }
            } else {
                const risk = area.risk_score;
                
                if (risk > 0.8) {
                    recommendations = [
                        'Deploy preventive resources',
                        'Issue evacuation warnings',
                        'Establish firebreaks',
                        'Increase monitoring frequency'
                    ];
                } else if (risk > 0.6) {
                    recommendations = [
                        'Increase patrols in the area',
                        'Prepare resource allocation plan',
                        'Alert local fire departments'
                    ];
                } else if (risk > 0.4) {
                    recommendations = [
                        'Monitor conditions regularly',
                        'Review emergency response plans'
                    ];
                } else {
                    recommendations = [
                        'Standard monitoring procedures',
                        'No additional action required'
                    ];
                }
                
                // Update alert button
                const alertBtn = document.getElementById('alertBtn');
                if (alertBtn) {
                    alertBtn.textContent = 'Send Warning Alert';
                    alertBtn.className = 'btn btn-warning mt-2';
                }
            }
            
            recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsElem.appendChild(li);
            });
        }
        
        // Update table with risk data
        riskMap.onMapUpdated = function(data) {
            const tableBody = document.getElementById('regionsTable');
            if (tableBody && tableBody.getElementsByTagName) {
                const tbody = tableBody.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    data.riskAreas.sort((a, b) => b.risk_score - a.risk_score)
                        .forEach(region => {
                            const row = tbody.insertRow();
                            
                            const nameCell = row.insertCell(0);
                            nameCell.textContent = region.name;
                            
                            const levelCell = row.insertCell(1);
                            const levelBadge = document.createElement('span');
                            levelBadge.className = 'badge ' + EcoSentry.utils.getRiskClass(region.risk_score);
                            levelBadge.textContent = EcoSentry.utils.getRiskLevel(region.risk_score);
                            levelCell.appendChild(levelBadge);
                            
                            const scoreCell = row.insertCell(2);
                            scoreCell.textContent = region.risk_score.toFixed(2);
                            
                            const factorsCell = row.insertCell(3);
                            factorsCell.textContent = region.risk_factors.join(', ');
                            
                            const actionsCell = row.insertCell(4);
                            const viewBtn = document.createElement('button');
                            viewBtn.className = 'btn btn-sm btn-outline-primary';
                            viewBtn.textContent = 'View on Map';
                            viewBtn.addEventListener('click', function() {
                                riskMap.centerMap([region.center.lat, region.center.lng], 8);
                                riskMap.onAreaSelected(region);
                            });
                            actionsCell.appendChild(viewBtn);
                        });
                }
            }
        };
    }
});
