function parseDate(dateStr) {
    // Example: Assuming dateStr is in "DD/MM/YYYY" format
    var parts = dateStr.split('/');
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1; // JS months start from 0
    var year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}
