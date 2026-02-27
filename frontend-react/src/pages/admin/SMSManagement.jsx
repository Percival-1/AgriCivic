import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaSms,
    FaUsers,
    FaPaperPlane,
    FaHistory,
    FaBell,
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaSync,
    FaFileUpload,
    FaExclamationTriangle,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import smsService from '../../api/services/smsService';

export default function SMSManagement() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Active tab
    const [activeTab, setActiveTab] = useState('send'); // send, bulk, history, subscription

    // Send SMS state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Bulk SMS state
    const [bulkRecipients, setBulkRecipients] = useState('');
    const [bulkMessage, setBulkMessage] = useState('');
    const [sendingBulk, setSendingBulk] = useState(false);
    const [bulkResults, setBulkResults] = useState(null);

    // SMS History state
    const [smsHistory, setSmsHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLimit] = useState(20);

    // Subscription state
    const [subscriptionPhone, setSubscriptionPhone] = useState('');
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [savingSubscription, setSavingSubscription] = useState(false);

    // Message validation
    const messageValidation = smsService.validateMessageLength(message);
    const bulkMessageValidation = smsService.validateMessageLength(bulkMessage);

    // Load SMS history
    const loadSMSHistory = async () => {
        try {
            setLoadingHistory(true);
            setError(null);
            const history = await smsService.getSMSHistory(historyLimit, historyPage * historyLimit);
            setSmsHistory(history);
        } catch (err) {
            console.error('Error loading SMS history:', err);
            const errorMessage = typeof err === 'string' ? err : (err?.message || err?.msg || 'Failed to load SMS history');
            setError(errorMessage);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadSMSHistory();
        }
    }, [activeTab, historyPage]);

    // Handle send SMS
    const handleSendSMS = async (e) => {
        e.preventDefault();

        // Validate phone number
        if (!smsService.validatePhoneNumber(phoneNumber)) {
            setError('Invalid phone number format. Use E.164 format (e.g., +919876543210)');
            return;
        }

        // Validate message
        if (!message.trim()) {
            setError('Message cannot be empty');
            return;
        }

        if (!messageValidation.isValid) {
            setError(`Message is too long. Maximum ${messageValidation.maxLength} characters allowed.`);
            return;
        }

        try {
            setSending(true);
            setError(null);
            setSuccess(null);

            const result = await smsService.sendSMS(phoneNumber, message);

            if (result.success) {
                setSuccess(`SMS sent successfully! Message SID: ${result.message_sid}`);
                setPhoneNumber('');
                setMessage('');
            } else {
                setError(result.error || 'Failed to send SMS');
            }
        } catch (err) {
            console.error('Error sending SMS:', err);
            const errorMessage = typeof err === 'string' ? err : (err?.message || err?.msg || 'Failed to send SMS');
            setError(errorMessage);
        } finally {
            setSending(false);
        }
    };

    // Handle send bulk SMS
    const handleSendBulkSMS = async (e) => {
        e.preventDefault();

        // Parse recipients
        const recipients = smsService.parseBulkRecipients(bulkRecipients);

        if (recipients.length === 0) {
            setError('No valid recipients found. Please enter phone numbers in E.164 format.');
            return;
        }

        // Validate message
        if (!bulkMessage.trim()) {
            setError('Message cannot be empty');
            return;
        }

        if (!bulkMessageValidation.isValid) {
            setError(`Message is too long. Maximum ${bulkMessageValidation.maxLength} characters allowed.`);
            return;
        }

        try {
            setSendingBulk(true);
            setError(null);
            setSuccess(null);
            setBulkResults(null);

            const result = await smsService.sendBulkSMS(recipients, bulkMessage);

            if (result.success) {
                setBulkResults(result);
                setSuccess(`Bulk SMS sent! ${result.successful} successful, ${result.failed} failed out of ${result.total} total.`);
                setBulkRecipients('');
                setBulkMessage('');
            } else {
                setError('Failed to send bulk SMS');
            }
        } catch (err) {
            console.error('Error sending bulk SMS:', err);
            const errorMessage = typeof err === 'string' ? err : (err?.message || err?.msg || 'Failed to send bulk SMS');
            setError(errorMessage);
        } finally {
            setSendingBulk(false);
        }
    };

    // Load subscription
    const handleLoadSubscription = async () => {
        if (!smsService.validatePhoneNumber(subscriptionPhone)) {
            setError('Invalid phone number format. Use E.164 format (e.g., +919876543210)');
            return;
        }

        try {
            setLoadingSubscription(true);
            setError(null);
            const data = await smsService.getSubscription(subscriptionPhone);
            setSubscriptionData(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
            const errorMessage = typeof err === 'string' ? err : (err?.message || err?.msg || 'Failed to load subscription');
            setError(errorMessage);
        } finally {
            setLoadingSubscription(false);
        }
    };

    // Save subscription
    const handleSaveSubscription = async () => {
        if (!subscriptionData) return;

        try {
            setSavingSubscription(true);
            setError(null);
            setSuccess(null);

            const result = await smsService.manageSubscription(
                subscriptionPhone,
                subscriptionData.preferences
            );

            if (result.success) {
                setSuccess('Subscription preferences updated successfully');
                setSubscriptionData(result);
            } else {
                setError('Failed to update subscription');
            }
        } catch (err) {
            console.error('Error saving subscription:', err);
            const errorMessage = typeof err === 'string' ? err : (err?.message || err?.msg || 'Failed to save subscription');
            setError(errorMessage);
        } finally {
            setSavingSubscription(false);
        }
    };

    // Update subscription preference
    const updateSubscriptionPreference = (key, value) => {
        setSubscriptionData({
            ...subscriptionData,
            preferences: {
                ...subscriptionData.preferences,
                [key]: value,
            },
        });
    };

    // Get delivery status icon
    const getDeliveryStatusIcon = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'sent' || statusLower === 'delivered') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (statusLower === 'pending' || statusLower === 'queued') {
            return <FaClock className="text-yellow-500" />;
        } else if (statusLower === 'failed' || statusLower === 'error') {
            return <FaTimesCircle className="text-red-500" />;
        }
        return <FaClock className="text-gray-500" />;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">SMS Management</h1>
                    <p className="text-gray-600 mt-1">
                        Send SMS messages and manage subscriptions
                    </p>
                </div>
            </div>

            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 flex items-center gap-2">
                        <FaCheckCircle />
                        {success}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('send')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'send'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaPaperPlane className="inline mr-2" />
                        Send SMS
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bulk'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaUsers className="inline mr-2" />
                        Bulk SMS
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaHistory className="inline mr-2" />
                        SMS History
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'subscription'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaBell className="inline mr-2" />
                        Subscriptions
                    </button>
                </nav>
            </div>

            {/* Send SMS Tab */}
            {activeTab === 'send' && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FaSms />
                        Send SMS Message
                    </h2>
                    <form onSubmit={handleSendSMS} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient Phone Number
                            </label>
                            <Input
                                type="text"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+919876543210"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use E.164 format (e.g., +919876543210)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Enter your message here..."
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500">
                                    {messageValidation.length} / {messageValidation.maxLength} characters
                                </p>
                                {!messageValidation.isValid && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <FaExclamationTriangle />
                                        Message too long
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={sending || !messageValidation.isValid}
                            className="w-full"
                        >
                            {sending ? (
                                <>
                                    <Loader size="sm" className="inline mr-2" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <FaPaperPlane className="inline mr-2" />
                                    Send SMS
                                </>
                            )}
                        </Button>
                    </form>
                </Card>
            )}

            {/* Bulk SMS Tab */}
            {activeTab === 'bulk' && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FaUsers />
                            Send Bulk SMS
                        </h2>
                        <form onSubmit={handleSendBulkSMS} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recipients (one per line)
                                </label>
                                <textarea
                                    value={bulkRecipients}
                                    onChange={(e) => setBulkRecipients(e.target.value)}
                                    placeholder="+919876543210, John Doe&#10;+919876543211, Jane Smith&#10;+919876543212"
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Format: phone_number, name (optional) - one per line
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message
                                </label>
                                <textarea
                                    value={bulkMessage}
                                    onChange={(e) => setBulkMessage(e.target.value)}
                                    placeholder="Enter your message here..."
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-gray-500">
                                        {bulkMessageValidation.length} / {bulkMessageValidation.maxLength} characters
                                    </p>
                                    {!bulkMessageValidation.isValid && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <FaExclamationTriangle />
                                            Message too long
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={sendingBulk || !bulkMessageValidation.isValid}
                                className="w-full"
                            >
                                {sendingBulk ? (
                                    <>
                                        <Loader size="sm" className="inline mr-2" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane className="inline mr-2" />
                                        Send Bulk SMS
                                    </>
                                )}
                            </Button>
                        </form>
                    </Card>

                    {/* Bulk Results */}
                    {bulkResults && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Bulk SMS Results</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="text-2xl font-bold text-blue-600">{bulkResults.total}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Successful</p>
                                    <p className="text-2xl font-bold text-green-600">{bulkResults.successful}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Failed</p>
                                    <p className="text-2xl font-bold text-red-600">{bulkResults.failed}</p>
                                </div>
                            </div>

                            {bulkResults.details && (
                                <div className="space-y-4">
                                    {bulkResults.details.successful && bulkResults.details.successful.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-green-600 mb-2">Successful</h3>
                                            <div className="space-y-2">
                                                {bulkResults.details.successful.map((item, index) => (
                                                    <div key={index} className="p-3 bg-green-50 rounded flex items-center gap-2">
                                                        <FaCheckCircle className="text-green-500" />
                                                        <span className="font-mono text-sm">{item.phone_number}</span>
                                                        <span className="text-xs text-gray-600">({item.name})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {bulkResults.details.failed && bulkResults.details.failed.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-red-600 mb-2">Failed</h3>
                                            <div className="space-y-2">
                                                {bulkResults.details.failed.map((item, index) => (
                                                    <div key={index} className="p-3 bg-red-50 rounded">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <FaTimesCircle className="text-red-500" />
                                                            <span className="font-mono text-sm">{item.phone_number}</span>
                                                            <span className="text-xs text-gray-600">({item.name})</span>
                                                        </div>
                                                        <p className="text-xs text-red-600 ml-6">{item.error}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* SMS History Tab */}
            {activeTab === 'history' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FaHistory />
                            SMS History
                        </h2>
                        <Button
                            onClick={loadSMSHistory}
                            disabled={loadingHistory}
                            variant="secondary"
                            size="sm"
                        >
                            <FaSync className={loadingHistory ? 'animate-spin' : ''} />
                        </Button>
                    </div>

                    {loadingHistory ? (
                        <Loader text="Loading SMS history..." />
                    ) : smsHistory.length > 0 ? (
                        <div className="space-y-3">
                            {smsHistory.map((sms, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getDeliveryStatusIcon(sms.delivery_status)}
                                                <span className="font-medium capitalize">
                                                    {sms.delivery_status || 'Unknown'}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(sms.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 mb-2">{sms.message}</p>
                                            {sms.external_message_id && (
                                                <p className="text-xs text-gray-500 font-mono">
                                                    Message ID: {sms.external_message_id}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            <div className="flex justify-between items-center pt-4">
                                <Button
                                    onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
                                    disabled={historyPage === 0}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600">Page {historyPage + 1}</span>
                                <Button
                                    onClick={() => setHistoryPage(historyPage + 1)}
                                    disabled={smsHistory.length < historyLimit}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FaSms className="text-gray-400 text-4xl mx-auto mb-2" />
                            <p className="text-gray-600">No SMS history found</p>
                        </div>
                    )}
                </Card>
            )}

            {/* Subscription Management Tab */}
            {activeTab === 'subscription' && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FaBell />
                            Manage Subscription
                        </h2>
                        <div className="flex gap-2 mb-4">
                            <Input
                                type="text"
                                value={subscriptionPhone}
                                onChange={(e) => setSubscriptionPhone(e.target.value)}
                                placeholder="+919876543210"
                                className="flex-1"
                            />
                            <Button
                                onClick={handleLoadSubscription}
                                disabled={loadingSubscription}
                            >
                                {loadingSubscription ? (
                                    <Loader size="sm" />
                                ) : (
                                    'Load'
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Enter phone number in E.164 format to load subscription preferences
                        </p>
                    </Card>

                    {subscriptionData && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Subscription Preferences</h2>
                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded">
                                    <p className="text-sm text-gray-600">User ID</p>
                                    <p className="font-mono text-sm">{subscriptionData.user_id}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <p className="text-sm text-gray-600">Phone Number</p>
                                    <p className="font-mono text-sm">{subscriptionData.phone_number}</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={subscriptionData.preferences.daily_msp_updates}
                                            onChange={(e) =>
                                                updateSubscriptionPreference('daily_msp_updates', e.target.checked)
                                            }
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div>
                                            <p className="font-medium">Daily MSP Updates</p>
                                            <p className="text-sm text-gray-600">
                                                Receive daily minimum support price updates
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={subscriptionData.preferences.weather_alerts}
                                            onChange={(e) =>
                                                updateSubscriptionPreference('weather_alerts', e.target.checked)
                                            }
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div>
                                            <p className="font-medium">Weather Alerts</p>
                                            <p className="text-sm text-gray-600">
                                                Receive weather alerts and warnings
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={subscriptionData.preferences.scheme_notifications}
                                            onChange={(e) =>
                                                updateSubscriptionPreference('scheme_notifications', e.target.checked)
                                            }
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div>
                                            <p className="font-medium">Scheme Notifications</p>
                                            <p className="text-sm text-gray-600">
                                                Receive notifications about government schemes
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={subscriptionData.preferences.market_price_alerts}
                                            onChange={(e) =>
                                                updateSubscriptionPreference('market_price_alerts', e.target.checked)
                                            }
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <div>
                                            <p className="font-medium">Market Price Alerts</p>
                                            <p className="text-sm text-gray-600">
                                                Receive market price alerts and updates
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <Button
                                    onClick={handleSaveSubscription}
                                    disabled={savingSubscription}
                                    className="w-full"
                                >
                                    {savingSubscription ? (
                                        <>
                                            <Loader size="sm" className="inline mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Preferences'
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
