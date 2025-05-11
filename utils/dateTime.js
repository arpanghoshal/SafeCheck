/**
 * Format a date to a friendly datetime string
 * @param {Date} date - The date object to format
 * @returns {string} Formatted date string
 */
export const getDateTimeString = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  
  // If less than a minute ago
  if (diffSec < 60) {
    return 'just now';
  }
  
  // If less than an hour ago
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  
  // If less than 24 hours ago
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  
  // If today or yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  if (date >= today) {
    // Format time for today
    return `Today at ${formatTime(date)}`;
  }
  
  if (date >= yesterday) {
    // Format time for yesterday
    return `Yesterday at ${formatTime(date)}`;
  }
  
  // For any other date
  return formatDate(date);
};

/**
 * Format a date to show only the time
 * @param {Date} date - The date object to format
 * @returns {string} Formatted time string
 */
export const getTimeString = (date) => {
  if (!date) return 'N/A';
  return formatTime(date);
};

/**
 * Format a time (HH:MM AM/PM)
 * @param {Date} date - The date object to format
 * @returns {string} Formatted time string
 */
const formatTime = (date) => {
  if (!date) return '';
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // Handle midnight (0 hours should display as 12)
  
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${formattedMinutes} ${ampm}`;
};

/**
 * Format a date (MMM DD, YYYY)
 * @param {Date} date - The date object to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return '';
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  const currentYear = new Date().getFullYear();
  
  // If same year, don't include the year
  if (year === currentYear) {
    return `${month} ${day} at ${formatTime(date)}`;
  }
  
  return `${month} ${day}, ${year} at ${formatTime(date)}`;
}; 