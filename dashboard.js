// Your Firebase configuration

var firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

firebase.initializeApp(firebaseConfig);
var database = firebase.database();

var currentFilterStatus = '';

function fetchDataAndPrepareCharts() {
    database.ref('vehicles').once('value', snapshot => {
        const data = snapshot.val();
        var newData = Object.values(data).filter(v => v.status === 'PDI');
        var readyData = Object.values(data).filter(v => v.status === 'Ready for Pickup');

        var totalNew = newData.length;
        var totalReady = readyData.length;
        document.getElementById('total_new').textContent = totalNew;
        document.getElementById('total_ready').textContent = totalReady;
        var totalReady = readyData.length;
        // Prepare data for each chart
        var newVehicleTypeData = prepareChartData(newData, 'vehicleType');
        var newDivisionData = prepareChartData(newData, 'division');
        var readyVehicleTypeData = prepareChartData(readyData, 'vehicleType');
        var readyDivisionData = prepareChartData(readyData, 'division');

        // Create charts
        createPieChart('newVehicleTypeChart', 'New Units by Vehicle Type', newVehicleTypeData);
        createPieChart('newDivisionChart', 'New Units by Division', newDivisionData);
        createPieChart('readyVehicleTypeChart', 'Ready Units by Vehicle Type', readyVehicleTypeData);
        createPieChart('readyDivisionChart', 'Ready Units by Division', readyDivisionData);
    });
}

// Function to prepare chart data
function prepareChartData(data, key) {
    var aggregation = data.reduce((acc, curr) => {
        acc[curr[key]] = (acc[curr[key]] || 0) + 1;
        return acc;
    }, {});
    return {
        labels: Object.keys(aggregation),
        data: Object.values(aggregation)
    };
}

// Function to create a pie chart
function createPieChart(canvasId, title, chartData) {
    var ctx = document.getElementById(canvasId).getContext('2d');
    var colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#C9CBCF', '#7BC225', '#E7E9ED', '#55ACD2',
        '#517C3F', '#8B5F65', '#B39BC8', '#CBA3D5', '#5B9BD5',
        '#ED7D31', '#A5A5A5', '#FFC000', '#4472C4', '#70AD47'
    ];    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: colors,
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: title,
                fontSize: 18,
                fontColor: '#333'
            },
            legend: {
                display: true,
                position: 'top',
                labels: {
                    fontColor: '#333',
                    fontSize: 12,
                    boxWidth: 20
                }
            },
            tooltips: {
                enabled: true,
                mode: 'index',
                intersect: false,
                bodyFontSize: 14
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}


fetchDataAndPrepareCharts();

