// utils/timeUtils.js
export class TimeUtils {
  // Lấy timezone offset của user (minutes)
  static getUserTimezoneOffset() {
    return new Date().getTimezoneOffset();
  }

  // Lấy timezone name (ví dụ: "Asia/Ho_Chi_Minh")
  static getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Convert Binance UTC timestamp to user's local time
  static toLocalTimestamp(binanceTimestamp) {
    const userOffsetMs = this.getUserTimezoneOffset() * 60 * 1000;
    // Binance timestamp (UTC) → User local time
    return Math.floor((binanceTimestamp - userOffsetMs) / 1000);
  }

  // Format timestamp to user's local time string
  static formatLocalTime(timestamp, options = {}) {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      // undefined = use user's locale
      timeZone: this.getUserTimezone(),
      year: options.year || "numeric",
      month: options.month || "2-digit",
      day: options.day || "2-digit",
      hour: options.hour || "2-digit",
      minute: options.minute || "2-digit",
      ...options,
    });
  }

  // Debug timezone info
  static debugTimezone() {
    const now = new Date();
    return {
      userTimezone: this.getUserTimezone(),
      userOffset: this.getUserTimezoneOffset(),
      localTime: now.toLocaleString(),
      utcTime: now.toUTCString(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
