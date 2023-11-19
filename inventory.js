// Your Firebase configuration

var firebaseConfig = {
    apiKey: "AIzaSyC1MoeHZlItFfrz3LMXK4JQO_cPcv9w3ek",
    authDomain: "parkinglot-management-1.firebaseapp.com",
    databaseURL: "https://parkinglot-management-1-default-rtdb.firebaseio.com/",
    projectId: "parkinglot-management-1",
    storageBucket: "parkinglot-management-1.appspot.com",
    messagingSenderId: "1028248970537",
    appId: "1:1028248970537:web:9b05541f77074ddfcf0338",
    measurementId: "G-1GP901VFGD"
};


firebase.initializeApp(firebaseConfig);
var database = firebase.database();

var currentFilterStatus = '';

var vehicleTypes = {};
document.addEventListener('DOMContentLoaded', function() {
    displayVehicles();
});

function addVehicle() {
    var unitNumberInput = document.getElementById('unitNumber');
    var unitNumberValue = unitNumberInput.value;
    var unitPrefix = unitNumberValue.substring(0, 3);
    var vehicleType = vehicleTypeMapping[unitPrefix] || "Unknown Vehicle Type";

    var division = document.getElementById('division').value;

    if (!unitNumberValue.trim() || !division.trim()) {
        alert("Both Unit Number and Division are required.");
        return;
    }
    
    var currentDate = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });
    
    var newVehicleData = {
        unitNumber: unitNumberValue,
        vehicleType: vehicleType,
        division: division,
        dateOfEntry: currentDate,
        status: 'PDI',
    };
    database.ref('vehicles/' + unitNumberValue).once('value', snapshot => {
        if (snapshot.exists()) {
            // If the unit number already exists, alert the user
            alert("A vehicle with this unit number already exists.");
        } else {
            database.ref('vehicles/' + unitNumberValue).set(newVehicleData, function(error) {
                if (error) {
                    console.error("Failed to save new vehicle: ", error);
                } else {
                    // Re-render the table if the current filter is 'All' or 'New Unit'
                    if (currentFilterStatus === '' || currentFilterStatus === 'PDI') {
                        displayVehicles(currentFilterStatus);
                        document.getElementById('vehicleForm').reset();
                    }
                }
            });
        }});
}

function updateStatus(unitNumber, newStatus) {
    // Get the current date in the format you need
    var currentDate = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });

    // Prepare the updates object for Firebase
    var updates = {};
    updates['/status'] = newStatus;

    // Check if the status is changing to "Ready for Pickup" and update the date
    if (newStatus === 'Ready for Pickup') {
        updates['/dateReadyForPickup'] = currentDate;
        // Reset 'pickupDate' if status regresses
        updates['/pickupDate'] = null;
    } else if (newStatus === 'Picked Up') {
        // If it's changing to "Picked Up", update the pickup date
        updates['/pickupDate'] = currentDate;
    }

    // Push the updates to Firebase
    database.ref('vehicles/' + unitNumber).update(updates, function(error) {
        if (error) {
            // If the update fails, log the error
            console.error("Update failed: ", error);
        } else {
            // Call displayVehicles with the current filter to update the table
            displayVehicles(currentFilterStatus);

            // If the current filter does not match the new status, remove the vehicle from the current view
            if (currentFilterStatus !== '' && currentFilterStatus !== newStatus) {
                // Find the row with the unit number and remove it from the table
                var table = document.getElementById('inventoryTable');
                for (var i = 1, row; row = table.rows[i]; i++) {
                    if (row.cells[0].textContent === unitNumber) {
                        table.deleteRow(i);
                        break;
                    }
                }
            }
        }
    });
}



function calculateDaysAtCurrentStage(vehicle) {
    if (vehicle.status === 'Picked Up') {
        // If the vehicle has been picked up, we show "Completed"
        return '<span class="text-success">Completed</span>';
    }

    // Otherwise, calculate the days at the current stage
    var currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time part to ignore hours

    var comparisonDate;
    if (vehicle.status === 'Ready for Pickup' && vehicle.dateReadyForPickup) {
        comparisonDate = new Date(vehicle.dateReadyForPickup);
    } else {
        comparisonDate = new Date(vehicle.dateOfEntry);
    }

    var timeDiff = currentDate.getTime() - comparisonDate.getTime();
    var daysAtCurrentStage = Math.round(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
    return daysAtCurrentStage;
}


function displayVehicles(selectedStatus = '') {
    currentFilterStatus = selectedStatus; // Update the current filter status

    // Add Sort options based on different table type
    var dropdown = document.getElementById('sortDropdown');
    dropdown.querySelectorAll('.dynamic-option').forEach(opt => opt.remove());  // Clear previous sort field

    if (selectedStatus === "Ready for Pickup"){
        var option = new Option('Date Ready for Pickup', 'dateReadyForPickup');
        option.classList.add('dynamic-option');
        dropdown.add(option);
    }
    if (selectedStatus === "Picked Up"){
        var option = new Option('Pickup Date', 'pickupDate');
        option.classList.add('dynamic-option');
        dropdown.add(option);
    }


    var table = document.getElementById('inventoryTable');

    // Query Firebase for the vehicles
    database.ref('vehicles').once('value', (snapshot) => {
        const data = snapshot.val();
        var vehiclesArray = [];

        // Transform the data into an array and filter based on selected status
        for (var unit in data) {
            var vehicle = data[unit];
            vehicle.unitNumber = unit; // Ensure unit number is part of the vehicle data
            // Apply the filter
            if (!selectedStatus || vehicle.status === selectedStatus) {
                vehiclesArray.push(vehicle);
            }
        }
        vehiclesArray.sort((a, b) => {
            var dateA = parseDate(a.dateOfEntry);
            var dateB = parseDate(b.dateOfEntry);
            return dateA - dateB;
        });

        // Clear the table before repopulating it
        table.innerHTML = "<tr><th>Unit Number</th><th>Vehicle Type</th><th>Date of Entry</th><th>Division</th><th>Status</th><th>Date Ready for Pickup</th><th>Pickup Date</th><th>Days at Current Stage</th><th>Action</th><th>Note</th></tr>";

        // Iterate over the filtered and sorted vehicles to create table rows
        vehiclesArray.forEach((vehicle) => {
            var row = table.insertRow(-1);
            row.insertCell(0).innerHTML = vehicle.unitNumber;

            var truncatedVehicleType = vehicle.vehicleType.length > 40
                ? vehicle.vehicleType.slice(0, 40) + '...'
                : vehicle.vehicleType;
            row.insertCell(1).innerHTML = truncatedVehicleType;

            row.insertCell(2).innerHTML = vehicle.dateOfEntry;
            row.insertCell(3).innerHTML = vehicle.division;
            row.insertCell(4).innerHTML = vehicle.status;
            row.insertCell(5).innerHTML = vehicle.dateReadyForPickup || 'N/A';
            row.insertCell(6).innerHTML = vehicle.pickupDate || 'N/A';
            row.insertCell(7).innerHTML = calculateDaysAtCurrentStage(vehicle);
            row.insertCell(8).innerHTML = getActionButton(vehicle);

            // Add another column for notes
            var noteButton = vehicle.note
                ? '<button onclick="showNote(\'' + vehicle.unitNumber + '\')" class="btn btn-secondary btn-sm">Show Note</button>'
                : '<button onclick="editNote(\'' + vehicle.unitNumber + '\')" class="btn btn-outline-secondary btn-sm">Add Note</button>';
            row.insertCell(-1).innerHTML = noteButton;
        });
    });
}

function getActionButton(vehicle) {
    

    var buttons = '';
    if (vehicle.status === 'Picked Up') {
        return `<button onclick="deleteVehicle('${vehicle.unitNumber}')" class="btn btn-warning btn-sm">Delete</button>`;
    }
    else {
        if (vehicle.status !== 'Ready for Pickup') {
            buttons += `<button onclick="updateStatus('${vehicle.unitNumber}', 'Ready for Pickup')" class="btn btn-outline-success btn-sm">Ready for Pickup</button>`;
        }
        else if (vehicle.status !== 'Picked Up') {
            buttons += `<button onclick="updateStatus('${vehicle.unitNumber}', 'Picked Up')" class="btn btn-outline-success btn-sm">Picked Up</button>`;
        }
        return buttons;
    }
    
}

function sortTable(columnName) {
    var table = document.getElementById('inventoryTable');
    var rows = Array.from(table.getElementsByTagName('tr'));

    // Skip the header row
    var tbodyRows = rows.slice(1);

    // Need the following to get position of each column's header
    var columnIndexMap = {
        "unitNumber": 0,
        "vehicleType": 1,
        "dateOfEntry": 2,
        "division": 3,
        "status": 4,
        "dateReadyForPickup": 5,
        "pickupDate": 6,
        "daysAtCurrentStage": 7
    };
    var columnIndex = columnIndexMap[columnName];

    if(columnName === 'daysAtCurrentStage'){
        // days at current stage will be descending.
        tbodyRows.sort((rowA, rowB) => {
            
            var cellA = rowA.cells[columnIndex].innerText;
            var cellB = rowB.cells[columnIndex].innerText;

            // The following is to make sure "Completed" units are shown at the bottom

            var isCompletedA = cellA === 'Completed';
            var isCompletedB = cellB === 'Completed';

            if (isCompletedA && !isCompletedB) {
                return 1; // Place A after B
            } else if (!isCompletedA && isCompletedB) {
                return -1; // Place A before B
            } else if (isCompletedA && isCompletedB) {
                return 0; // Keep original order if both are "Completed"
            }

            return parseInt(cellB) - parseInt(cellA);
    
        });
    } else {
        tbodyRows.sort((rowA, rowB) => {
            var cellA = rowA.cells[columnIndex].innerText;
            var cellB = rowB.cells[columnIndex].innerText;
    
    
            return cellA.localeCompare(cellB);
        });
    }
    

    table.innerHTML = "<tr><th>Unit Number</th><th>Vehicle Type</th><th>Date of Entry</th><th>Division</th><th>Status</th><th>Date Ready for Pickup</th><th>Pickup Date</th><th>Days at Current Stage</th><th>Action</th><th>Note</th></tr>";
    // tbodyRows.forEach(row => table.appendChild(row));
    tbodyRows.forEach(function(row){
        var cells = row.getElementsByTagName('td');
        var row = table.insertRow(-1);
        row.insertCell(0).innerHTML = cells[0].innerHTML;
        row.insertCell(1).innerHTML = cells[1].innerHTML;
        row.insertCell(2).innerHTML = cells[2].innerHTML;
        row.insertCell(3).innerHTML = cells[3].innerHTML;
        row.insertCell(4).innerHTML = cells[4].innerHTML;
        row.insertCell(5).innerHTML = cells[5].innerHTML;
        row.insertCell(6).innerHTML = cells[6].innerHTML;
        row.insertCell(7).innerHTML = cells[7].innerHTML;
        if(cells[8]){
            row.insertCell(8).innerHTML = cells[8].innerHTML;
        }
        if(cells[9]){
            row.insertCell(9).innerHTML = cells[9].innerHTML;
        }
    });


}



function deleteVehicle(unitNumber) {

    if (confirm(`Are you sure you want to delete unit ${unitNumber}?`)) {

        database.ref('vehicles/' + unitNumber).remove()
        .then(function() {

            displayVehicles(currentFilterStatus);
            console.log("Remove succeeded.");
        })
        .catch(function(error) {
            console.log("Remove failed: " + error.message);
        });
    }
}

function handleSortChange() {
    var selectedSortField = document.getElementById('sortDropdown').value;
    sortTable(selectedSortField);
}

// For adding note and showing note
var currentUnitNumber = null;

function editNote(unitNumber) {
    currentUnitNumber = unitNumber;
    document.getElementById('noteText').value = '';
    $('#noteModal').modal('show'); 
}

function showNote(unitNumber) {
    currentUnitNumber = unitNumber;
    // Fetch the note from Firebase and display it
    database.ref('vehicles/' + unitNumber + '/note').once('value', snapshot => {
        document.getElementById('noteText').value = snapshot.val() || '';
        $('#noteModal').modal('show'); 
    });
}

function saveNote() {
    var noteText = document.getElementById('noteText').value;
    // Save the note to Firebase
    database.ref('vehicles/' + currentUnitNumber + '/note').set(noteText)
        .then(() => {
            $('#noteModal').modal('hide'); // Close the modal
            displayVehicles(currentFilterStatus); // Refresh the table
        })
        .catch(error => {
            console.error("Error saving note: ", error);
            alert("Failed to save note.");
        });
}




// Dropdown change event to filter vehicles
document.getElementById('statusFilter').addEventListener('change', function() {
    displayVehicles(this.value);
    sortForm = document.getElementById("sort_by_form");
    // Also need to reset sort_by_form everytime a new filter is selected
    sortForm.innerHTML = '<select id="sortDropdown" class="form-select" onchange="handleSortChange()"><option value="dateOfEntry">Date of Entry</option><option value="vehicleType">Vehicle Type</option><option value="division">Division</option><option value="daysAtCurrentStage">Days at Current Stage</option><option value="unitNumber">Unit Number</option></select>'
});

// Call displayVehicles on page load with no filter
displayVehicles();
