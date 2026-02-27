// Helper utilities
export const getErrorMessage = (error) => {
    if (error.response?.data?.detail) {
        return error.response.data.detail
    }
    if (error.response?.data?.message) {
        return error.response.data.message
    }
    if (error.message) {
        return error.message
    }
    return 'An unexpected error occurred'
}

export const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

export const sanitizeInput = (input) => {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
}

export const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
