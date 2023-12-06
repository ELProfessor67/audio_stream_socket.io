function subtractOneMinute(time) {
  const [hours, minutes] = time.split(':').map(Number);

  // Convert time to total minutes
  let totalMinutes = hours * 60 + minutes;

  // Subtract 1 minute
  totalMinutes -= 1;

  // Handle negative total minutes (previous day)
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Assuming a 24-hour clock
  }

  // Convert back to HH:mm format
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  // Format the result
  const formattedResult = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  
  return formattedResult;
}

module.exports = subtractOneMinute;

// Example usage
// const originalTime = '08:00';
// const newTime = subtractOneMinute(originalTime);

// console.log(`Original Time: ${originalTime}`);
// console.log(`New Time: ${newTime}`);
