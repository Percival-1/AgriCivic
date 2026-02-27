// Validation utilities
export const validatePhoneNumber = (phone) => {
    // E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
}

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export const getPasswordStrength = (password) => {
    let strength = 0

    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 2) return { level: 'weak', color: 'red' }
    if (strength <= 4) return { level: 'medium', color: 'yellow' }
    return { level: 'strong', color: 'green' }
}
