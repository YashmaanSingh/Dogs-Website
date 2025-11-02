// Image Management Utility
class ImageManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    }

    // Upload pet image
    async uploadPetImage(file) {
        return this.uploadImage(file, 'pets', 'petImage');
    }

    // Upload product image
    async uploadProductImage(file) {
        return this.uploadImage(file, 'products', 'productImage');
    }

    // Generic image upload method
    async uploadImage(file, type, fieldName) {
        if (!this.validateImageFile(file)) {
            throw new Error('Invalid file. Please select an image file under 5MB.');
        }

        const formData = new FormData();
        formData.append(fieldName, file);

        const endpoint = type === 'pets' ? '/pets/upload-image' : '/shop/upload-image';

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Upload failed');
        }

        return data.data;
    }

    // Delete pet image
    async deletePetImage(filename) {
        return this.deleteImage(filename, 'pets');
    }

    // Delete product image
    async deleteProductImage(filename) {
        return this.deleteImage(filename, 'products');
    }

    // Generic image delete method
    async deleteImage(filename, type) {
        const endpoint = type === 'pets' ? `/pets/image/${filename}` : `/shop/image/${filename}`;

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Delete failed');
        }

        return data;
    }

    // Validate image file
    validateImageFile(file) {
        // Check file type
        if (!file.type.startsWith('image/')) {
            return false;
        }

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return false;
        }

        // Check file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedExtensions.includes(fileExtension)) {
            return false;
        }

        return true;
    }

    // Get file URL
    getFileUrl(filename, type = 'pets') {
        if (!filename) return null;
        return `/uploads/${type}/${filename}`;
    }

    // Extract filename from URL
    getFilenameFromUrl(url) {
        if (!url) return null;
        return url.split('/').pop();
    }

    // Preview image before upload
    previewImage(file, previewElement) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                resolve(e.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Create image upload widget
    createUploadWidget(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const {
            type = 'pets',
            onUpload = () => {},
            onError = () => {},
            onProgress = () => {},
            showPreview = true,
            multiple = false
        } = options;

        const fieldName = type === 'pets' ? 'petImage' : 'productImage';

        const widget = document.createElement('div');
        widget.className = 'image-upload-widget';
        widget.innerHTML = `
            <div class="upload-area" onclick="document.getElementById('${containerId}-file').click()">
                <div class="upload-icon">📷</div>
                <div class="upload-text">Click to select image or drag & drop</div>
                <div class="upload-hint">Supports JPG, PNG, GIF, WEBP (Max 5MB)</div>
                <input type="file" id="${containerId}-file" accept="image/*" style="display: none;" ${multiple ? 'multiple' : ''}>
            </div>
            ${showPreview ? `<div class="image-preview-container" style="display: none;">
                <img class="image-preview" src="" alt="Preview">
                <button class="remove-image" onclick="removePreview('${containerId}')">Remove</button>
            </div>` : ''}
            <div class="upload-progress" style="display: none;">
                <div class="upload-progress-bar"></div>
            </div>
            <div class="upload-messages"></div>
        `;

        container.appendChild(widget);

        // Set up event listeners
        const fileInput = document.getElementById(`${containerId}-file`);
        const uploadArea = widget.querySelector('.upload-area');

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], widget, type, fieldName, onUpload, onError, onProgress);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0], widget, type, fieldName, onUpload, onError, onProgress);
            }
        });

        return widget;
    }

    // Handle file selection
    async handleFileSelect(file, widget, type, fieldName, onUpload, onError, onProgress) {
        try {
            // Validate file
            if (!this.validateImageFile(file)) {
                throw new Error('Invalid file. Please select an image file under 5MB.');
            }

            // Show preview
            const previewContainer = widget.querySelector('.image-preview-container');
            const previewImg = widget.querySelector('.image-preview');
            
            if (previewContainer && previewImg) {
                await this.previewImage(file, previewImg);
                previewContainer.style.display = 'block';
            }

            // Show progress
            const progressContainer = widget.querySelector('.upload-progress');
            const progressBar = widget.querySelector('.upload-progress-bar');
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';

            // Simulate progress (since we can't track real upload progress with fetch)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                progressBar.style.width = progress + '%';
                onProgress(progress);
                
                if (progress >= 90) {
                    clearInterval(progressInterval);
                }
            }, 100);

            // Upload image
            const result = await this.uploadImage(file, type, fieldName);
            
            // Complete progress
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);

            // Success callback
            onUpload(result);
            this.showMessage(widget, 'Image uploaded successfully!', 'success');

        } catch (error) {
            // Error callback
            onError(error);
            this.showMessage(widget, error.message, 'error');
            
            // Hide progress
            const progressContainer = widget.querySelector('.upload-progress');
            progressContainer.style.display = 'none';
        }
    }

    // Show message in widget
    showMessage(widget, message, type) {
        const messagesContainer = widget.querySelector('.upload-messages');
        const messageClass = type === 'error' ? 'error-message' : 'success-message';
        
        messagesContainer.innerHTML = `<div class="${messageClass}">${message}</div>`;
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messagesContainer.innerHTML = '';
            }, 3000);
        }
    }
}

// Global functions for backward compatibility
function removePreview(containerId) {
    const widget = document.getElementById(containerId).querySelector('.image-upload-widget');
    const previewContainer = widget.querySelector('.image-preview-container');
    const fileInput = document.getElementById(`${containerId}-file`);
    
    previewContainer.style.display = 'none';
    fileInput.value = '';
}

// Initialize global image manager
window.imageManager = new ImageManager();

// Add CSS for image upload widgets
const style = document.createElement('style');
style.textContent = `
    .image-upload-widget {
        margin: 20px 0;
    }
    
    .upload-area {
        border: 2px dashed #ccc;
        border-radius: 10px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.3s;
        margin-bottom: 20px;
    }
    
    .upload-area:hover {
        border-color: var(--primary-color, #F37021);
    }
    
    .upload-area.dragover {
        border-color: var(--primary-color, #F37021);
        background-color: rgba(243, 112, 33, 0.1);
    }
    
    .upload-icon {
        font-size: 3rem;
        color: #ccc;
        margin-bottom: 10px;
    }
    
    .upload-text {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 10px;
    }
    
    .upload-hint {
        font-size: 0.9rem;
        color: #999;
    }
    
    .image-preview-container {
        text-align: center;
        margin: 20px 0;
    }
    
    .image-preview {
        max-width: 200px;
        max-height: 200px;
        border-radius: 10px;
        margin-bottom: 10px;
    }
    
    .remove-image {
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
    }
    
    .upload-progress {
        width: 100%;
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
        margin: 10px 0;
    }
    
    .upload-progress-bar {
        height: 100%;
        background: var(--primary-color, #F37021);
        width: 0%;
        transition: width 0.3s;
    }
    
    .error-message {
        color: #f44336;
        margin-top: 10px;
        padding: 10px;
        background: #ffebee;
        border-radius: 5px;
    }
    
    .success-message {
        color: #4caf50;
        margin-top: 10px;
        padding: 10px;
        background: #e8f5e8;
        border-radius: 5px;
    }
`;
document.head.appendChild(style);
