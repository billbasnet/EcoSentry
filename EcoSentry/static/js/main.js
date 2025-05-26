/**
 * EcoSentry - Main JavaScript File
 * Contains common functionality used across the application
 */

// Global app configuration
const EcoSentry = {
    apiBase: '/api',
    refreshInterval: 60000, // 1 minute
    mapDefaults: {
        center: [37.7749, -122.4194],
        zoom: 6
    },
    riskLevels: {
        extreme: 0.9,
        high: 0.8,
        medium: 0.6,
        low: 0.4,
        veryLow: 0.2
    }
};

// Utility functions
EcoSentry.utils = {
    /**
     * Format a date string
     * @param {string|Date} dateStr - Date string or Date object
     * @returns {string} Formatted date string
     */
    formatDate: function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    /**
     * Format a number with commas
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber: function(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    /**
     * Get the appropriate risk level label
     * @param {number} risk - Risk score (0-1)
     * @returns {string} Risk level label
     */
    getRiskLevel: function(risk) {
        if (risk >= EcoSentry.riskLevels.extreme) return 'Extreme';
        if (risk >= EcoSentry.riskLevels.high) return 'High';
        if (risk >= EcoSentry.riskLevels.medium) return 'Medium';
        if (risk >= EcoSentry.riskLevels.low) return 'Low';
        return 'Very Low';
    },
    
    /**
     * Get the appropriate CSS class for a risk level
     * @param {number} risk - Risk score (0-1)
     * @returns {string} CSS class
     */
    getRiskClass: function(risk) {
        if (risk >= EcoSentry.riskLevels.extreme) return 'bg-danger';
        if (risk >= EcoSentry.riskLevels.high) return 'bg-warning text-dark';
        if (risk >= EcoSentry.riskLevels.medium) return 'bg-info text-dark';
        if (risk >= EcoSentry.riskLevels.low) return 'bg-success';
        return 'bg-success';
    },
    
    /**
     * Get the color for a risk level (for map visualization)
     * @param {number} risk - Risk score (0-1)
     * @returns {string} Color hex code
     */
    getRiskColor: function(risk) {
        if (risk >= EcoSentry.riskLevels.extreme) return '#d73027';
        if (risk >= EcoSentry.riskLevels.high) return '#fc8d59';
        if (risk >= EcoSentry.riskLevels.medium) return '#fee08b';
        if (risk >= EcoSentry.riskLevels.low) return '#d9ef8b';
        return '#91cf60';
    }
};

// API interaction functions
EcoSentry.api = {
    /**
     * Fetch risk data from the API
     * @returns {Promise} Promise with risk data
     */
    getRiskData: function() {
        return fetch(`${EcoSentry.apiBase}/sample-data`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
    },
    
    /**
     * Predict fire risk for a location and weather conditions
     * @param {Object} data - Location and weather data
     * @returns {Promise} Promise with prediction results
     */
    predictRisk: function(data) {
        return fetch(`${EcoSentry.apiBase}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
    },
    
    /**
     * Detect fires in an image
     * @param {FormData} formData - Form data with image
     * @returns {Promise} Promise with detection results
     */
    detectFire: function(formData) {
        return fetch(`${EcoSentry.apiBase}/detect`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
    },
    
    /**
     * Get resource allocation recommendations
     * @param {Object} data - Risk areas and available resources
     * @returns {Promise} Promise with recommendation results
     */
    optimizeResources: function(data) {
        return fetch(`${EcoSentry.apiBase}/resources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
    }
};

// Global variables for gamification
let userPoints = 125;
let missionProgress = {
    'detection': 3,
    'optimization': 1,
    'alerts': 0
};
let achievements = {
    'fireWatcher': true,
    'firstResponder': true,
    'masterStrategist': false,
    'globalGuardian': false
};

// Toast notification function
function showToast(title, message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">${title}</strong>
                <small>${new Date().toLocaleTimeString()}</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Update points function
function updatePoints(points) {
    userPoints += points;
    
    // Update points display in the navbar dropdown
    const pointsDisplay = document.querySelector('.dropdown-item strong');
    if (pointsDisplay) {
        pointsDisplay.textContent = `Points: ${userPoints}`;
    }
    
    // Update level based on points
    const levelDisplay = document.querySelector('.dropdown-item .small');
    if (levelDisplay) {
        let level = 'Level 1 Guardian';
        if (userPoints >= 300) level = 'Level 4 Guardian';
        else if (userPoints >= 200) level = 'Level 3 Guardian';
        else if (userPoints >= 100) level = 'Level 2 Guardian';
        
        levelDisplay.textContent = level;
    }
    
    return userPoints;
}

// Update mission progress
function updateMission(missionType, increment = 1) {
    if (missionType in missionProgress) {
        const oldValue = missionProgress[missionType];
        let max = 5; // Default max
        
        if (missionType === 'optimization') max = 3;
        
        // Increment progress
        missionProgress[missionType] = Math.min(oldValue + increment, max);
        
        // Update UI
        const progressBar = document.querySelector(`.mission-${missionType} .progress-bar`);
        if (progressBar) {
            const percent = (missionProgress[missionType] / max) * 100;
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
            progressBar.setAttribute('data-value', `${missionProgress[missionType]}/${max}`);
        }
        
        // Check if mission completed
        if (missionProgress[missionType] >= max && oldValue < max) {
            let pointsEarned = 50; // Default points
            let missionName = 'Early Detection';
            
            if (missionType === 'optimization') {
                pointsEarned = 75;
                missionName = 'Resource Optimizer';
            } else if (missionType === 'alerts') {
                pointsEarned = 100;
                missionName = 'Community Guardian';
            }
            
            // Award points
            updatePoints(pointsEarned);
            
            // Show completion message
            showToast('Mission Completed!', `You've completed the ${missionName} mission and earned ${pointsEarned} points!`, 'success');
            
            return true; // Mission completed
        }
        
        return false; // Mission not completed yet
    }
    
    return false;
}

// Unlock achievement
function unlockAchievement(achievementId) {
    if (achievementId in achievements && !achievements[achievementId]) {
        achievements[achievementId] = true;
        
        // Update UI
        const achievementElement = document.querySelector(`.achievement-${achievementId}`);
        if (achievementElement) {
            achievementElement.classList.remove('achievement-locked');
            achievementElement.classList.add('glow-effect');
        }
        
        // Award points
        updatePoints(50);
        
        // Show notification
        let achievementName = '';
        switch(achievementId) {
            case 'masterStrategist':
                achievementName = 'Master Strategist';
                break;
            case 'globalGuardian':
                achievementName = 'Global Guardian';
                break;
        }
        
        showToast('Achievement Unlocked!', `You've unlocked the ${achievementName} achievement and earned 50 points!`, 'primary');
        
        return true;
    }
    
    return false;
}

// Add a new activity to the feed
function addActivity(type, title, description, time = 'Just now') {
    const activityFeed = document.querySelector('.list-group');
    if (!activityFeed) return;
    
    let iconClass = 'bi-info-circle';
    let bgColor = 'bg-info';
    
    switch(type) {
        case 'fire':
            iconClass = 'bi-fire';
            bgColor = 'bg-danger';
            break;
        case 'resource':
            iconClass = 'bi-people';
            bgColor = 'bg-success';
            break;
        case 'risk':
            iconClass = 'bi-exclamation-triangle';
            bgColor = 'bg-warning';
            break;
        case 'weather':
            iconClass = 'bi-cloud-sun';
            bgColor = 'bg-info';
            break;
    }
    
    const activityHtml = `
        <div class="list-group-item border-0 py-3 px-3" style="display: none;">
            <div class="d-flex">
                <div class="me-3">
                    <div class="${bgColor} p-2 rounded-circle text-white">
                        <i class="bi ${iconClass}"></i>
                    </div>
                </div>
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h6 class="mb-0">${title}</h6>
                        <small class="text-${type === 'fire' ? 'danger' : 'muted'}">${time}</small>
                    </div>
                    <p class="mb-0 small">${description}</p>
                    ${type === 'fire' ? `<div class="mt-2"><button class="btn btn-sm btn-danger view-alert">View Alert</button></div>` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add to the beginning of the feed
    activityFeed.insertAdjacentHTML('afterbegin', activityHtml);
    
    // Fade in the new activity
    const newActivity = activityFeed.firstElementChild;
    setTimeout(() => {
        newActivity.style.display = 'block';
        newActivity.style.animation = 'fadeIn 0.5s ease-out';
    }, 100);
    
    // Attach event listeners to any new buttons
    if (type === 'fire') {
        const viewAlertBtn = newActivity.querySelector('.view-alert');
        if (viewAlertBtn) {
            viewAlertBtn.addEventListener('click', function() {
                showToast('Alert Viewed', 'You have reviewed the fire alert information.', 'danger');
                updateMission('alerts');
            });
        }
    }
    
    // If there are more than 5 activities, remove the oldest one
    if (activityFeed.children.length > 5) {
        activityFeed.lastElementChild.remove();
    }
}

// Initialize any global elements when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup any global event listeners or UI components
    
    // Set current year in footer
    const yearElements = document.querySelectorAll('.current-year');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(el => {
        el.textContent = currentYear;
    });
    
    // Setup tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Add toast container to body
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
    
    // Setup event listeners for all buttons
    setupEventListeners();
});

// Function to setup all event listeners
function setupEventListeners() {
    // Refresh Risk Data button
    const refreshRiskDataBtn = document.getElementById('refreshRiskData');
    if (refreshRiskDataBtn) {
        refreshRiskDataBtn.addEventListener('click', function() {
            // Show loading spinner
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
            this.disabled = true;
            
            // Simulate data refresh (in a real app, this would fetch new data from the API)
            setTimeout(() => {
                // Update timestamps
                const now = new Date();
                const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const dateString = now.toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'});
                const fullTimeString = `${dateString}, ${timeString}`;
                
                document.getElementById('lastUpdatedActive').textContent = fullTimeString;
                document.getElementById('lastUpdatedRisk').textContent = fullTimeString;
                document.getElementById('lastUpdatedResources').textContent = fullTimeString;
                
                // Restore button
                this.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Refresh';
                this.disabled = false;
                
                // Show success message
                showToast('Data Updated', 'Risk data has been refreshed successfully!', 'success');
                
                // Random chance to detect a new fire
                if (Math.random() > 0.5) {
                    const regions = ['Northern Forest Region', 'Eastern Woodland', 'Southern Valley', 'Western Hills'];
                    const region = regions[Math.floor(Math.random() * regions.length)];
                    addActivity('fire', 'New Fire Detected', `A new fire has been detected in ${region}.`);
                    
                    // Update active fires count
                    const fireCountElement = document.querySelector('.feature-card-danger .display-4');
                    if (fireCountElement) {
                        const currentCount = parseInt(fireCountElement.textContent);
                        fireCountElement.textContent = currentCount + 1;
                    }
                    
                    // Progress in detection mission
                    updateMission('detection');
                }
            }, 1500);
        });
    }
    
    // Risk threshold slider
    const riskThresholdSlider = document.getElementById('riskThresholdSlider');
    if (riskThresholdSlider) {
        riskThresholdSlider.addEventListener('input', function() {
            const value = parseFloat(this.value);
            let riskLevel = 'Low';
            let badgeClass = 'bg-success';
            
            if (value >= 0.8) {
                riskLevel = 'Extreme';
                badgeClass = 'bg-danger';
            } else if (value >= 0.6) {
                riskLevel = 'High';
                badgeClass = 'bg-warning';
            } else if (value >= 0.4) {
                riskLevel = 'Medium';
                badgeClass = 'bg-warning';
            }
            
            // Update badge
            const badge = this.previousElementSibling.querySelector('.badge');
            if (badge) {
                badge.textContent = riskLevel;
                badge.className = `badge ${badgeClass}`;
            }
            
            // Update risk chart (if it exists)
            if (window.riskChart) {
                // Filter data based on threshold
                const datasets = window.riskChart.data.datasets;
                if (datasets && datasets.length > 0) {
                    const data = datasets[0].data;
                    const labels = window.riskChart.data.labels;
                    
                    // Show only areas with risk above threshold
                    const visibleLabels = [];
                    const visibleData = [];
                    const visibleColors = [];
                    
                    for (let i = 0; i < data.length; i++) {
                        if (data[i] >= value) {
                            visibleLabels.push(labels[i]);
                            visibleData.push(data[i]);
                            visibleColors.push(datasets[0].backgroundColor[i]);
                        }
                    }
                    
                    // Update chart
                    window.riskChart.data.labels = visibleLabels;
                    datasets[0].data = visibleData;
                    datasets[0].backgroundColor = visibleColors;
                    window.riskChart.update();
                }
            }
        });
    }
    
    // Mission buttons
    const missionButtons = document.querySelectorAll('.card .btn-sm.btn-primary, .card .btn-sm.btn-success, .card .btn-sm.btn-info');
    missionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.card');
            const headerText = card.querySelector('.card-header h5').textContent;
            
            let missionType = 'detection';
            if (headerText.includes('Resource')) {
                missionType = 'optimization';
            } else if (headerText.includes('Community')) {
                missionType = 'alerts';
            }
            
            if (this.textContent.includes('Unlock')) {
                // Unlock mission
                this.textContent = 'Start Mission';
                this.classList.remove('btn-info');
                this.classList.add('btn-primary');
                showToast('Mission Unlocked', `The ${headerText} mission is now available!`, 'info');
            } else if (this.textContent.includes('Start')) {
                // Start mission
                this.textContent = 'Continue Mission';
                updateMission(missionType);
                showToast('Mission Started', `You've started the ${headerText} mission!`, 'primary');
            } else {
                // Continue mission
                const completed = updateMission(missionType);
                if (!completed) {
                    showToast('Progress Updated', `You've made progress on the ${headerText} mission!`, 'success');
                }
            }
            
            // Check for achievements
            if (missionType === 'optimization' && missionProgress.optimization >= 3) {
                unlockAchievement('masterStrategist');
            }
        });
    });
    
    // View Alert buttons in activity feed
    const alertButtons = document.querySelectorAll('.view-alert');
    alertButtons.forEach(button => {
        button.addEventListener('click', function() {
            showToast('Alert Viewed', 'You have reviewed the fire alert information.', 'danger');
            updateMission('alerts');
        });
    });
    
    // Achievement badges
    const achievementBadges = document.querySelectorAll('.achievement-badge');
    achievementBadges.forEach(badge => {
        badge.addEventListener('click', function() {
            const title = this.nextElementSibling.textContent;
            const description = this.nextElementSibling.nextElementSibling.textContent;
            
            if (this.classList.contains('achievement-locked')) {
                showToast('Achievement Locked', `Complete the required tasks to unlock: ${description}`, 'secondary');
            } else {
                showToast('Achievement Details', `${title}: ${description}`, 'success');
            }
        });
    });
    
    // User profile dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.textContent.includes('Settings')) {
                e.preventDefault();
                showToast('Settings', 'User settings would open here in a real application.', 'info');
            } else if (this.textContent.includes('Sign Out')) {
                e.preventDefault();
                showToast('Sign Out', 'You would be signed out in a real application.', 'info');
            }
        });
    });
    
    // "View All" links
    const viewAllLinks = document.querySelectorAll('a:contains("View All")');
    viewAllLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('View All', 'Full activity log would be displayed here in a real application.', 'info');
        });
    });
    
    // Status cards
    const statusCards = document.querySelectorAll('.feature-card');
    statusCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h5').textContent;
            const value = this.querySelector('.display-4').textContent;
            showToast(title, `Current count: ${value}. Click for detailed analytics.`, 'info');
        });
    });
}

// Add a jQuery-like selector for text content
NodeList.prototype.forEach = Array.prototype.forEach;
HTMLCollection.prototype.forEach = Array.prototype.forEach;

Document.prototype.querySelectorAll = Document.prototype.querySelectorAll || function() { return []; };
Element.prototype.querySelectorAll = Element.prototype.querySelectorAll || function() { return []; };

// Custom contains selector
NodeList.prototype.contains = function(text) {
    const result = [];
    this.forEach(node => {
        if (node.textContent.includes(text)) {
            result.push(node);
        }
    });
    return result;
};

// Add event listener for demo mode toggle
const demoToggle = document.getElementById('demoModeToggle');
if (demoToggle) {
    demoToggle.addEventListener('change', function() {
        localStorage.setItem('demoMode', this.checked);
        document.body.classList.toggle('demo-mode', this.checked);
    });
    
    // Check saved preference
    const savedDemoMode = localStorage.getItem('demoMode') === 'true';
    demoToggle.checked = savedDemoMode;
    document.body.classList.toggle('demo-mode', savedDemoMode);
}

// Initialize Chart.js risk chart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const riskChartCanvas = document.getElementById('riskChart');
    if (riskChartCanvas) {
        window.riskChart = new Chart(riskChartCanvas, {
            type: 'bar',
            data: {
                labels: ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region', 'Central Region'],
                datasets: [{
                    label: 'Fire Risk Level',
                    data: [0.85, 0.45, 0.65, 0.3, 0.7],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                if (value === 0) return 'Low';
                                if (value === 0.5) return 'Medium';
                                if (value === 1) return 'High';
                                return '';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.parsed.y;
                                let riskLevel = 'Low';
                                if (value >= 0.8) riskLevel = 'Extreme';
                                else if (value >= 0.6) riskLevel = 'High';
                                else if (value >= 0.4) riskLevel = 'Medium';
                                
                                return `${label}${(value * 100).toFixed(0)}% (${riskLevel})`;
                            }
                        }
                    }
                }
            }
        });
    }
});

// Mock data for demonstration purposes
const mockResponseTimes = [
    { team: 'Team Alpha', time: 4.2 },
    { team: 'Team Bravo', time: 3.8 },
    { team: 'Team Charlie', time: 5.1 },
    { team: 'Team Delta', time: 7.3 },
    { team: 'Team Echo', time: 2.9 }
];

// Function to deploy resources in response to fires
function deployResources() {
    // Get the fastest team
    const sortedTeams = [...mockResponseTimes].sort((a, b) => a.time - b.time);
    const fastestTeam = sortedTeams[0];
    
    // Add to activity feed
    const regions = ['Northern Forest Region', 'Eastern Woodland', 'Southern Valley', 'Western Hills'];
    const region = regions[Math.floor(Math.random() * regions.length)];
    
    addActivity('resource', 'Resources Deployed', `${fastestTeam.team} deployed to ${region} with estimated response time of ${fastestTeam.time} minutes.`);
    
    // Update deployed resources count
    const resourcesElement = document.querySelector('.feature-card-success .display-4');
    if (resourcesElement) {
        const currentCount = parseInt(resourcesElement.textContent);
        resourcesElement.textContent = currentCount + 1;
    }
    
    // Progress in optimization mission
    updateMission('optimization');
    
    return fastestTeam;
}
