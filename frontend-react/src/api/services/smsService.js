import axios from '../axios';
import BaseService from './BaseService';

/**
 * SMS Service
 * Handles all SMS API calls for admin users
 * Requirements: 22.1-22.6
 */
class SMSService extends BaseService {
    constructor() {
        super();
        this.baseURL = '/api/v1/sms';
    }

    /**
     * Send SMS to a single recipient
     * Backend endpoint: POST /api/v1/sms/send
     * @param {string} toNumber - Recipient phone number in E.164 format
     * @param {string} message - Message content (max 1600 chars)
     * @param {string} fromNumber - Optional sender phone number
     * @param {object} metadata - Optional metadata
     * @returns {Promise} SMS response with delivery status
     */
    async sendSMS(toNumber, message, fromNumber = null, metadata = {}) {
        try {
            const response = await axios.post(`${this.baseURL}/send`, {
                to_number: toNumber,
                message: message,
                from_number: fromNumber,
                metadata: metadata,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Send SMS to multiple recipients (bulk SMS)
     * Backend endpoint: POST /api/v1/sms/send-bulk
     * @param {Array} recipients - Array of recipient objects with phone_number and optional name
     * @param {string} message - Message content (max 1600 chars)
     * @returns {Promise} Bulk SMS results with success/failure counts
     */
    async sendBulkSMS(recipients, message) {
        try {
            const response = await axios.post(`${this.baseURL}/send-bulk`, {
                recipients: recipients,
                message: message,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get delivery status of a sent SMS message
     * Backend endpoint: GET /api/v1/sms/status/{message_sid}
     * @param {string} messageSid - Twilio message SID
     * @returns {Promise} Message delivery status
     */
    async getMessageStatus(messageSid) {
        try {
            const response = await axios.get(`${this.baseURL}/status/${messageSid}`);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Manage SMS subscription preferences for a user
     * Backend endpoint: POST /api/v1/sms/subscription
     * @param {string} phoneNumber - User phone number
     * @param {object} preferences - Subscription preferences
     * @returns {Promise} Updated subscription preferences
     */
    async manageSubscription(phoneNumber, preferences) {
        try {
            const response = await axios.post(`${this.baseURL}/subscription`, {
                phone_number: phoneNumber,
                daily_msp_updates: preferences.daily_msp_updates,
                weather_alerts: preferences.weather_alerts,
                scheme_notifications: preferences.scheme_notifications,
                market_price_alerts: preferences.market_price_alerts,
                preferred_time: preferences.preferred_time,
            });
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Get SMS subscription preferences for a user
     * Backend endpoint: GET /api/v1/sms/subscription/{phone_number}
     * @param {string} phoneNumber - User phone number
     * @returns {Promise} Current subscription preferences
     */
    async getSubscription(phoneNumber) {
        try {
            const response = await axios.get(`${this.baseURL}/subscription/${phoneNumber}`);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Validate phone number format (E.164)
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} True if valid E.164 format
     */
    validatePhoneNumber(phoneNumber) {
        // E.164 format: +[country code][number]
        // Example: +919876543210
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phoneNumber);
    }

    /**
     * Format phone number to E.164 format
     * @param {string} phoneNumber - Phone number to format
     * @param {string} countryCode - Default country code (e.g., '91' for India)
     * @returns {string} Formatted phone number
     */
    formatPhoneNumber(phoneNumber, countryCode = '91') {
        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');

        // If doesn't start with country code, add it
        if (!cleaned.startsWith(countryCode)) {
            cleaned = countryCode + cleaned;
        }

        // Add + prefix
        return '+' + cleaned;
    }

    /**
     * Validate message length
     * @param {string} message - Message to validate
     * @param {number} maxLength - Maximum allowed length (default 1600)
     * @returns {object} Validation result with isValid and remaining characters
     */
    validateMessageLength(message, maxLength = 1600) {
        const length = message.length;
        return {
            isValid: length <= maxLength,
            length: length,
            remaining: maxLength - length,
            maxLength: maxLength,
        };
    }

    /**
     * Parse bulk recipients from CSV text
     * @param {string} csvText - CSV text with phone numbers and optional names
     * @returns {Array} Array of recipient objects
     */
    parseBulkRecipients(csvText) {
        const lines = csvText.trim().split('\n');
        const recipients = [];

        lines.forEach((line, index) => {
            const parts = line.split(',').map(part => part.trim());

            if (parts.length === 0 || !parts[0]) {
                return; // Skip empty lines
            }

            const phoneNumber = parts[0];
            const name = parts[1] || `Recipient ${index + 1}`;

            // Validate phone number
            if (this.validatePhoneNumber(phoneNumber)) {
                recipients.push({
                    phone_number: phoneNumber,
                    name: name,
                });
            }
        });

        return recipients;
    }

    /**
     * Get SMS history from notification history
     * This is a helper method that filters notification history for SMS channel
     * @param {number} limit - Number of records to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise} SMS history
     */
    async getSMSHistory(limit = 50, offset = 0) {
        try {
            // Use notification service to get history filtered by SMS channel
            const response = await axios.get('/api/v1/notifications/history/me', {
                params: {
                    limit: limit,
                    offset: offset,
                },
            });

            // Filter for SMS channel
            const smsHistory = response.data.filter(
                notification => notification.channel === 'sms'
            );

            return smsHistory;
        } catch (error) {
            this.handleError(error);
        }
    }
}

export default new SMSService();
